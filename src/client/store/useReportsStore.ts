import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 엑셀에서 추출한 판매일보 한 건 (고객 + 판매 요약) */
export interface ReportEntry {
  id: string;
  shopId: string;
  /** 업로드 일시 (동일 엑셀에서 온 건은 같은 값) */
  uploadedAt: string;

  // 고객 정보 (엑셀 컬럼 매핑)
  name: string;
  phone: string;
  birthDate: string;
  address: string;
  path: string;
  existingCarrier: string;

  // 판매 요약 (엑셀에 있으면 채움)
  saleDate: string;
  productName: string;
  amount: number;
  margin: number;
}

interface ReportsState {
  entries: ReportEntry[];
  addEntries: (entries: Omit<ReportEntry, "id" | "uploadedAt">[]) => void;
  setEntries: (entries: ReportEntry[]) => void;
  clearByShop: (shopId: string) => void;
  getEntriesByShop: (shopId: string) => ReportEntry[];
  getTodayCountByShop: (shopId: string) => number;
  getTodayMarginByShop: (shopId: string) => number;
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntries: (rows) => {
        const now = new Date().toISOString();
        const newEntries: ReportEntry[] = rows.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          uploadedAt: now,
        }));
        set((state) => ({
          entries: [...state.entries, ...newEntries],
        }));
      },

      setEntries: (entries) => set({ entries }),

      clearByShop: (shopId) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.shopId !== shopId),
        })),

      getEntriesByShop: (shopId) =>
        get().entries.filter((e) => e.shopId === shopId),

      getTodayCountByShop: (shopId) => {
        const today = new Date().toISOString().slice(0, 10);
        return get().entries.filter(
          (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
        ).length;
      },

      getTodayMarginByShop: (shopId) => {
        const today = new Date().toISOString().slice(0, 10);
        return get()
          .entries.filter(
            (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
          )
          .reduce((sum, e) => sum + (e.margin ?? 0), 0);
      },
    }),
    { name: "phone-store-reports" }
  )
);
