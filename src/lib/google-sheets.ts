/**
 * Google Sheets 데이터 조회 유틸리티
 *
 * 1차: GOOGLE_SHEETS_API_KEY가 있으면 Sheets API v4로 직접 조회
 * 2차: 없으면 CSV export URL로 폴백
 */

// ─── URL 파싱 ────────────────────────────────────────────────────────────────

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

export function extractGid(url: string): string | null {
  const match = url.match(/[?&]gid=(\d+)/) ?? url.match(/#gid=(\d+)/);
  return match?.[1] ?? null;
}

// ─── CSV 파서 (폴백용) ───────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        cur += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ",") {
      pushCell();
      continue;
    }
    if (!inQuotes && ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (!inQuotes && ch === "\r") {
      if (next === "\n") continue;
      pushCell();
      pushRow();
      continue;
    }
    cur += ch;
  }
  pushCell();
  pushRow();
  return rows;
}

// ─── 시트 데이터 가져오기 ────────────────────────────────────────────────────

export interface FetchSheetResult {
  rows: string[][];
  sheetId: string;
  gid: string | null;
  method: "api" | "csv";
}

/**
 * Google Sheets URL에서 2차원 배열 데이터를 가져옵니다.
 *
 * - GOOGLE_SHEETS_API_KEY가 설정되어 있으면 Sheets API v4 사용
 * - 없거나 실패하면 CSV export 폴백
 *
 * @throws 시트 URL이 잘못되었거나, 공개되지 않았거나, 둘 다 실패한 경우
 */
export async function fetchSheetRows(url: string): Promise<FetchSheetResult> {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    throw new Error(
      "Invalid Google Sheets URL. Example: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0",
    );
  }

  const gid = extractGid(url);
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  // ── 1차: Google Sheets API v4 ──────────────────────────────────────────
  if (apiKey) {
    try {
      let sheetName: string | undefined;

      if (gid) {
        const metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties`,
        );
        if (metaRes.ok) {
          const meta = await metaRes.json();
          const found = (meta.sheets as any[] | undefined)?.find(
            (s: any) => String(s.properties?.sheetId) === gid,
          );
          if (found) sheetName = found.properties.title;
        }
      }

      const range = sheetName
        ? `'${sheetName}'!A1:BZ1000`
        : "A1:BZ1000";

      const apiRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`,
      );

      if (apiRes.ok) {
        const data = await apiRes.json();
        const rows: string[][] = (data.values ?? []).map((row: unknown[]) =>
          row.map((cell) => String(cell ?? "")),
        );
        return { rows, sheetId, gid, method: "api" };
      }

      console.warn(
        `[google-sheets] API v4 실패 (${apiRes.status}), CSV 폴백 시도`,
      );
    } catch (err) {
      console.warn("[google-sheets] API v4 예외, CSV 폴백 시도", err);
    }
  }

  // ── 2차: CSV export 폴백 ───────────────────────────────────────────────
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  const csvRes = await fetch(exportUrl, {
    headers: { "cache-control": "no-cache" },
  });

  if (!csvRes.ok) {
    throw new Error(
      "Failed to fetch Google Sheets. Make sure the sheet is 공개(링크가 있는 모든 사용자) and accessible.",
    );
  }

  const csv = await csvRes.text();
  return { rows: parseCsv(csv), sheetId, gid, method: "csv" };
}
