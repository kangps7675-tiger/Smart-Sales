import { NextRequest, NextResponse } from "next/server";
import { parseTabularRowsToReportEntries } from "@/lib/report-entry-map";
import { assertShopInStoreGroup, getAuthContext } from "@/server/auth";

function parseGoogleSheetsExportUrl(inputUrl: string): { exportUrl: string; sheetId: string; gid?: string } | null {
  const trimmed = String(inputUrl ?? "").trim();
  if (!trimmed) return null;

  // 이미 export?format=csv 형태를 넣는 경우도 허용
  if (/docs\.google\.com\/spreadsheets\/d\//.test(trimmed) && /\/export\?/.test(trimmed)) {
    const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) return null;
    const sheetId = m[1];
    const gidMatch = trimmed.match(/[?&]gid=(\d+)/) ?? trimmed.match(/#gid=(\d+)/);
    return { exportUrl: trimmed, sheetId, gid: gidMatch?.[1] };
  }

  const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) return null;
  const sheetId = sheetIdMatch[1];
  const gidMatch = trimmed.match(/[?&]gid=(\d+)/) ?? trimmed.match(/#gid=(\d+)/);
  const gid = gidMatch?.[1];

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  return { exportUrl, sheetId, gid };
}

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
    // 빈 줄 스킵
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
      // CRLF
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

// POST /api/reports/import-google-sheets
// body: { shop_id: string, url: string }
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const shopId = String(body?.shop_id ?? "").trim();
    const url = String(body?.url ?? "").trim();

    if (!shopId || !url) {
      return NextResponse.json(
        { error: "shop_id and url are required" },
        { status: 400 },
      );
    }

    if (auth.role === "region_manager") {
      if (!auth.storeGroupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await assertShopInStoreGroup(shopId, auth.storeGroupId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((auth.role === "tenant_admin" || auth.role === "staff") && auth.shopId !== shopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = parseGoogleSheetsExportUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid Google Sheets URL. Example: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0" },
        { status: 400 },
      );
    }

    const res = await fetch(parsed.exportUrl, {
      // Google 캐시 이슈 완화
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch Google Sheets. Make sure the sheet is 공개(링크가 있는 모든 사용자) and accessible.",
        },
        { status: 400 },
      );
    }

    const csv = await res.text();
    const rows = parseCsv(csv);
    const { entries, errors } = parseTabularRowsToReportEntries(rows, shopId);

    return NextResponse.json(
      {
        meta: { sheet_id: parsed.sheetId, gid: parsed.gid ?? null },
        entries,
        errors,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in POST /api/reports/import-google-sheets", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

