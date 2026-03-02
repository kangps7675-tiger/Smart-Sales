/**
 * 엑셀 헤더 행 자동 감지
 * 처음 5행 중 "숫자보다 텍스트가 많은 행"을 헤더로 간주
 */

function countTextVsNumber(cells: unknown[]): { text: number; number: number } {
  let text = 0;
  let number = 0;
  for (const cell of cells) {
    if (cell == null || cell === "") continue;
    const s = String(cell).trim();
    if (!s) continue;
    const n = parseFloat(s.replace(/,/g, ""));
    if (!Number.isNaN(n) && s !== "") number += 1;
    else text += 1;
  }
  return { text, number };
}

/**
 * 처음 maxRows개 행 중 헤더로 가장 적합한 행 인덱스 반환 (0-based)
 */
export function detectHeaderRow(rows: unknown[][], maxRows = 5): number {
  if (!rows?.length) return 0;
  const toCheck = rows.slice(0, Math.min(maxRows, rows.length));
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < toCheck.length; i += 1) {
    const row = toCheck[i] as unknown[];
    const { text, number } = countTextVsNumber(Array.isArray(row) ? row : []);
    const total = text + number;
    if (total === 0) continue;
    const score = text - number;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function getHeadersFromRow(rows: unknown[][], rowIndex: number): string[] {
  if (!rows?.length || rowIndex < 0 || rowIndex >= rows.length) return [];
  const row = rows[rowIndex] as unknown[];
  if (!Array.isArray(row)) return [];
  return row.map((c) => String(c ?? "").trim());
}
