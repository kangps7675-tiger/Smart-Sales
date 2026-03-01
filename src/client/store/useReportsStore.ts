/**
 * 판매일보 관리 스토어 (Zustand)
 * 
 * 역할:
 * - 엑셀 파일에서 추출한 판매일보 데이터 저장 및 관리
 * - 매장별 판매일보 조회 및 통계 제공
 * - localStorage에 데이터 영속화
 * 
 * @file useReportsStore.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/client/store/useAuthStore";

/**
 * 엑셀에서 추출한 판매일보 한 건 (고객 + 판매 요약)
 * 
 * 엑셀 파일 업로드 시 각 행이 하나의 ReportEntry로 변환됩니다.
 */
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

  /**
   * 스프레드시트 마진 계산 구성요소
   * (출고가, 공시지원, 할부원금/개월, 액면, 구두 A~F)
   * - 아직 UI에서는 사용하지 않고, 업로드/저장 시에만 보존용으로 활용
   */
  /** 출고가 */
  factoryPrice?: number;
  /** 공시지원 */
  officialSubsidy?: number;
  /** 할부원금 */
  installmentPrincipal?: number;
  /** 할부 개월수 */
  installmentMonths?: number;
  /** 액면 */
  faceAmount?: number;
  /** 구두 A~F */
  verbalA?: number;
  verbalB?: number;
  verbalC?: number;
  verbalD?: number;
  verbalE?: number;
  verbalF?: number;

  /** 판매사(담당 직원) - 엑셀 헤더: 판매사 */
  salesPerson?: string;
  /** 요금제명 - 엑셀 헤더: 요금제 */
  planName?: string;
  /** 고객 지원금 - 엑셀 헤더: 지원금 */
  supportAmount?: number;

  /** 매장 검수 / 개통 매장 검수 */
  inspectionStore?: string;
  /** 사무실 검수 */
  inspectionOffice?: string;
  /** 복지 */
  welfare?: string;
  /** 보험 */
  insurance?: string;
  /** 카드 */
  card?: string;
  /** 결합 */
  combined?: string;
  /** 유무선 (유선/무선 등) */
  lineType?: string;
  /** 유형 */
  saleType?: string;
  /** 일련번호 */
  serialNumber?: string;
  /** 개통 시간 (스프레드시트) */
  activationTime?: string;
}

/**
 * 판매일보 스토어 상태 인터페이스
 */
interface ReportsState {
  entries: ReportEntry[];  // 모든 판매일보 항목 목록
  /**
   * 서버에서 판매일보 데이터 조회
   * 
   * - /api/reports GET 호출
   * - role이 super_admin이면 전체, 그 외에는 shopId 기준 조회
   */
  loadEntries: (shopId: string | null, role?: string) => Promise<void>;
  /**
   * 판매일보 항목 추가
   * 엑셀 파일 업로드 시 호출되며, 각 항목에 고유 ID와 업로드 일시를 자동 부여합니다.
   */
  addEntries: (entries: Omit<ReportEntry, "id" | "uploadedAt">[]) => Promise<void>;
  /**
   * 판매일보 항목 전체 교체
   * 기존 데이터를 모두 삭제하고 새 데이터로 교체합니다.
   */
  setEntries: (entries: ReportEntry[]) => void;
  /**
   * 특정 매장의 판매일보 전체 삭제
   * @param shopId - 삭제할 매장 ID
   */
  clearByShop: (shopId: string) => void;
  /**
   * 특정 매장의 판매일보 조회
   * @param shopId - 조회할 매장 ID
   * @returns 해당 매장의 판매일보 배열
   */
  getEntriesByShop: (shopId: string) => ReportEntry[];
  /**
   * 특정 매장의 오늘 판매 건수 조회
   * @param shopId - 조회할 매장 ID
   * @returns 오늘 판매된 건수
   */
  getTodayCountByShop: (shopId: string) => number;
  /**
   * 특정 매장의 오늘 총 마진 조회
   * @param shopId - 조회할 매장 ID
   * @returns 오늘 판매로 발생한 총 마진
   */
  getTodayMarginByShop: (shopId: string) => number;
  /**
   * 판매일보 한 건 수정 (웹에서 자체 수정)
   */
  updateEntry: (id: string, updates: Partial<Omit<ReportEntry, "id" | "shopId" | "uploadedAt">>) => Promise<void>;
  /**
   * 판매일보 한 건 삭제
   */
  deleteEntry: (id: string) => Promise<void>;
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set, get) => ({
      entries: [],

      /**
       * 서버에서 판매일보 데이터 조회
       * 
       * - /api/reports GET 호출
       * - role이 super_admin이면 전체, 그 외에는 shopId 기준 조회
       */
      loadEntries: async (shopId, role) => {
        try {
          const params = new URLSearchParams();
          if (role) params.set("role", role);
          if (shopId) params.set("shop_id", shopId);

          // super_admin / region_manager는 shopId 없이 지점·전체 조회 가능
          if (role !== "super_admin" && role !== "region_manager" && !shopId) {
            return;
          }

          const query = params.toString();
          const headers: Record<string, string> = {};
          if (role === "region_manager") {
            const storeGroupId = useAuthStore.getState().user?.storeGroupId;
            if (storeGroupId) headers["x-store-group-id"] = storeGroupId;
          }
          const res = await fetch(`/api/reports${query ? `?${query}` : ""}`, { headers });
          const json = await res.json().catch(() => [] as ReportEntry[]);

          if (!res.ok) {
            console.error("[ReportsStore] 판매일보 조회 실패", json);
            return;
          }

          set({
            entries: Array.isArray(json) ? (json as ReportEntry[]) : [],
          });
        } catch (error) {
          console.error("[ReportsStore] 판매일보 조회 중 오류", error);
        }
      },

      /**
       * 판매일보 항목 추가
       * 
       * 엑셀 파일에서 파싱한 데이터를 받아서
       * 각 항목에 고유 ID와 업로드 일시를 부여한 후 저장합니다.
       * 
       * @param rows - 추가할 판매일보 항목 배열 (id, uploadedAt 제외)
       */
      addEntries: async (rows) => {
        const now = new Date().toISOString();
        // 각 항목에 고유 ID와 업로드 일시 부여
        const newEntries: ReportEntry[] = rows.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          uploadedAt: now, // 동일 엑셀에서 온 항목은 같은 업로드 일시
        }));

        try {
          // 먼저 프론트 상태에 즉시 반영 (업로드 직후 화면에서 바로 보이도록)
          set((state) => ({
            entries: [...state.entries, ...newEntries],
          }));

          const res = await fetch("/api/reports", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reports: newEntries }),
          });

          const json = await res.json().catch(() => [] as unknown[]);

          if (!res.ok) {
            console.error("[ReportsStore] 판매일보 추가 실패", json);
            return;
          }
        } catch (error) {
          console.error("[ReportsStore] 판매일보 추가 중 오류", error);
        }
      },

      setEntries: (entries) => set({ entries }),

      clearByShop: async (shopId) => {
        const { entries, deleteEntry } = get();
        const targets = entries.filter((e) => e.shopId === shopId);
        // 각 항목에 대해 개별 삭제 API 호출
        await Promise.all(targets.map((e) => deleteEntry(e.id)));
      },

      getEntriesByShop: (shopId) =>
        get().entries.filter((e) => e.shopId === shopId),

      /**
       * 특정 매장의 오늘 판매 건수 조회
       * 
       * saleDate가 오늘 날짜와 일치하는 항목만 카운트합니다.
       * 
       * @param shopId - 조회할 매장 ID
       * @returns 오늘 판매된 건수
       */
      getTodayCountByShop: (shopId) => {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식
        return get().entries.filter(
          (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
        ).length;
      },

      /**
       * 특정 매장의 오늘 총 마진 조회
       * 
       * saleDate가 오늘 날짜와 일치하는 항목들의 margin을 합산합니다.
       * 
       * @param shopId - 조회할 매장 ID
       * @returns 오늘 판매로 발생한 총 마진
       */
      getTodayMarginByShop: (shopId) => {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식
        return get()
          .entries.filter(
            (e) => e.shopId === shopId && e.saleDate && e.saleDate.slice(0, 10) === today
          )
          .reduce((sum, e) => sum + (e.margin ?? 0), 0); // margin 합산 (null이면 0으로 처리)
      },

      updateEntry: async (id, updates) => {
        try {
          const res = await fetch("/api/reports", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, updates }),
          });

          const json = await res.json().catch(() => null as ReportEntry | null);

          if (!res.ok || !json) {
            console.error("[ReportsStore] 판매일보 수정 실패", json);
            return;
          }

          const updated = json as ReportEntry;

          set((state) => ({
            entries: state.entries.map((e) =>
              e.id === id ? { ...e, ...updated } : e
            ),
          }));
        } catch (error) {
          console.error("[ReportsStore] 판매일보 수정 중 오류", error);
        }
      },

      deleteEntry: async (id) => {
        try {
          const res = await fetch("/api/reports", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
          });

          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            console.error("[ReportsStore] 판매일보 삭제 실패", json);
            return;
          }

          set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
          }));
        } catch (error) {
          console.error("[ReportsStore] 판매일보 삭제 중 오류", error);
        }
      },
    }),
    { name: "phone-store-reports" }
  )
);
