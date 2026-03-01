/**
 * 대한민국 공휴일 (고정 + 음력 명절 + 대체공휴일)
 * - 2026년부터 제헌절(7/17) 포함
 * - 음력 명절: 2024~2050년 정적 테이블 (설날 3일, 추석 3일, 부처님오신날)
 */

export type HolidayEntry = { date: string; name: string };

/** YYYY-MM-DD 포맷 */
function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 해당 날짜가 토(6) 또는 일(0)인지 */
function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 다음 평일(월요일) 날짜 반환 */
function nextMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const add = day === 0 ? 1 : day === 6 ? 2 : 0;
  d.setDate(d.getDate() + add);
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * 연도별 음력 명절 양력 날짜 (설날 3일, 추석 3일, 부처님오신날 1일)
 * KASI/천문연 기준 자료 및 19년 주기 보정으로 2050년까지 수록
 */
const LUNAR_HOLIDAYS_BY_YEAR: Record<
  number,
  { seollal: [string, string, string]; chuseok: [string, string, string]; buddha: string }
> = {
  2024: { seollal: ["2024-02-09", "2024-02-10", "2024-02-11"], chuseok: ["2024-09-15", "2024-09-16", "2024-09-17"], buddha: "2024-05-15" },
  2025: { seollal: ["2025-01-28", "2025-01-29", "2025-01-30"], chuseok: ["2025-10-06", "2025-10-07", "2025-10-08"], buddha: "2025-05-05" },
  2026: { seollal: ["2026-02-16", "2026-02-17", "2026-02-18"], chuseok: ["2026-09-24", "2026-09-25", "2026-09-26"], buddha: "2026-05-24" },
  2027: { seollal: ["2027-02-06", "2027-02-07", "2027-02-08"], chuseok: ["2027-09-14", "2027-09-15", "2027-09-16"], buddha: "2027-05-13" },
  2028: { seollal: ["2028-01-26", "2028-01-27", "2028-01-28"], chuseok: ["2028-10-02", "2028-10-03", "2028-10-04"], buddha: "2028-05-02" },
  2029: { seollal: ["2029-02-12", "2029-02-13", "2029-02-14"], chuseok: ["2029-09-21", "2029-09-22", "2029-09-23"], buddha: "2029-05-20" },
  2030: { seollal: ["2030-02-02", "2030-02-03", "2030-02-04"], chuseok: ["2030-09-11", "2030-09-12", "2030-09-13"], buddha: "2030-05-09" },
  2031: { seollal: ["2031-01-23", "2031-01-24", "2031-01-25"], chuseok: ["2031-10-01", "2031-10-02", "2031-10-03"], buddha: "2031-05-28" },
  2032: { seollal: ["2032-02-11", "2032-02-12", "2032-02-13"], chuseok: ["2032-09-19", "2032-09-20", "2032-09-21"], buddha: "2032-05-16" },
  2033: { seollal: ["2033-01-31", "2033-02-01", "2033-02-02"], chuseok: ["2033-09-23", "2033-09-24", "2033-09-25"], buddha: "2033-05-05" },
  2034: { seollal: ["2034-02-19", "2034-02-20", "2034-02-21"], chuseok: ["2034-09-12", "2034-09-13", "2034-09-14"], buddha: "2034-05-24" },
  2035: { seollal: ["2035-02-08", "2035-02-09", "2035-02-10"], chuseok: ["2035-10-02", "2035-10-03", "2035-10-04"], buddha: "2035-05-13" },
  2036: { seollal: ["2036-01-28", "2036-01-29", "2036-01-30"], chuseok: ["2036-09-21", "2036-09-22", "2036-09-23"], buddha: "2036-05-02" },
  2037: { seollal: ["2037-02-15", "2037-02-16", "2037-02-17"], chuseok: ["2037-09-10", "2037-09-11", "2037-09-12"], buddha: "2037-05-21" },
  2038: { seollal: ["2038-02-04", "2038-02-05", "2038-02-06"], chuseok: ["2038-09-29", "2038-09-30", "2038-10-01"], buddha: "2038-05-10" },
  2039: { seollal: ["2039-01-24", "2039-01-25", "2039-01-26"], chuseok: ["2039-09-18", "2039-09-19", "2039-09-20"], buddha: "2039-05-29" },
  2040: { seollal: ["2040-02-12", "2040-02-13", "2040-02-14"], chuseok: ["2040-09-21", "2040-09-22", "2040-09-23"], buddha: "2040-05-18" },
  2041: { seollal: ["2041-02-01", "2041-02-02", "2041-02-03"], chuseok: ["2041-10-10", "2041-10-11", "2041-10-12"], buddha: "2041-05-07" },
  2042: { seollal: ["2042-01-22", "2042-01-23", "2042-01-24"], chuseok: ["2042-09-29", "2042-09-30", "2042-10-01"], buddha: "2042-05-26" },
  2043: { seollal: ["2043-02-09", "2043-02-10", "2043-02-11"], chuseok: ["2043-09-18", "2043-09-19", "2043-09-20"], buddha: "2043-05-15" },
  2044: { seollal: ["2044-01-29", "2044-01-30", "2044-01-31"], chuseok: ["2044-10-07", "2044-10-08", "2044-10-09"], buddha: "2044-05-04" },
  2045: { seollal: ["2045-02-17", "2045-02-18", "2045-02-19"], chuseok: ["2045-09-25", "2045-09-26", "2045-09-27"], buddha: "2045-05-23" },
  2046: { seollal: ["2046-02-06", "2046-02-07", "2046-02-08"], chuseok: ["2046-09-14", "2046-09-15", "2046-09-16"], buddha: "2046-05-12" },
  2047: { seollal: ["2047-01-27", "2047-01-28", "2047-01-29"], chuseok: ["2047-10-03", "2047-10-04", "2047-10-05"], buddha: "2047-05-01" },
  2048: { seollal: ["2048-02-14", "2048-02-15", "2048-02-16"], chuseok: ["2048-09-21", "2048-09-22", "2048-09-23"], buddha: "2048-05-19" },
  2049: { seollal: ["2049-02-02", "2049-02-03", "2049-02-04"], chuseok: ["2049-09-11", "2049-09-12", "2049-09-13"], buddha: "2049-05-08" },
  2050: { seollal: ["2050-01-23", "2050-01-24", "2050-01-25"], chuseok: ["2050-09-30", "2050-10-01", "2050-10-02"], buddha: "2050-05-27" },
};

/** 특정 연도의 한국 공휴일 목록 (날짜 → 휴일 이름 배열) */
export function getKoreanHolidaysForYear(year: number): HolidayEntry[] {
  const list: HolidayEntry[] = [];
  const add = (dateStr: string, name: string) => list.push({ date: dateStr, name });

  // 고정 공휴일
  const fixed: [number, number, string][] = [
    [1, 1, "신정"],
    [3, 1, "삼일절"],
    [5, 5, "어린이날"],
    [6, 6, "현충일"],
    [8, 15, "광복절"],
    [10, 3, "개천절"],
    [10, 9, "한글날"],
    [12, 25, "성탄절"],
  ];
  if (year >= 2026) fixed.push([7, 17, "제헌절"]);

  for (const [m, d, name] of fixed) {
    const dateStr = fmt(year, m, d);
    add(dateStr, name);
    if (isWeekend(dateStr)) add(nextMonday(dateStr), `${name} 대체공휴일`);
  }

  // 음력 명절 (정적 테이블)
  const lunar = LUNAR_HOLIDAYS_BY_YEAR[year];
  if (lunar) {
    for (const dateStr of lunar.seollal) {
      add(dateStr, "설날");
      if (isWeekend(dateStr)) add(nextMonday(dateStr), "설날 대체공휴일");
    }
    lunar.chuseok.forEach((dateStr, i) => {
      add(dateStr, i === 1 ? "추석" : "추석 연휴");
      if (isWeekend(dateStr)) add(nextMonday(dateStr), "추석 대체공휴일");
    });
    add(lunar.buddha, "부처님오신날");
    if (isWeekend(lunar.buddha)) add(nextMonday(lunar.buddha), "부처님오신날 대체공휴일");
  }

  return list;
}

/** 날짜 문자열 Set (캘린더에서 휴일 여부 빠른 조회용) */
export function getKoreanHolidaySetForYear(year: number): Set<string> {
  return new Set(getKoreanHolidaysForYear(year).map((e) => e.date));
}

/** 날짜 → 휴일 이름 배열 (같은 날 여러 휴일 가능) */
export function getKoreanHolidayMapForYear(year: number): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const { date, name } of getKoreanHolidaysForYear(year)) {
    const arr = map.get(date) ?? [];
    if (!arr.includes(name)) arr.push(name);
    map.set(date, arr);
  }
  return map;
}
