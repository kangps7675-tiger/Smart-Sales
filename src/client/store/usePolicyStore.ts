/**
 * 정책 관리 스토어 (Zustand)
 * 
 * 역할:
 * - 활성 정책 데이터 관리 (기기 모델, 요금제, 부가서비스)
 * - 정책 실시간 수정 및 반영
 * - 정책 변경 이력 관리 (향후 확장)
 * 
 * 핵심 개념:
 * - 정책은 "현재 활성화된 값"으로, 계약 생성 시 항상 최신 정책을 참조
 * - 계약 완료 시점의 정책은 스냅샷으로 저장되어 변경되지 않음
 * - 관리자가 정책을 수정하면 즉시 모든 견적기에 반영됨
 * 
 * @file usePolicyStore.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 기기 모델 정책 인터페이스
 * 
 * 각 기기 모델별 출고가, 공시지원금, 매장 마진 등을 관리합니다.
 */
export interface DevicePolicy {
  id: string;                    // 모델 고유 ID
  name: string;                  // 모델명 (예: "iPhone 16")
  capacity: string;              // 저장 용량 (예: "128GB")
  colors: string[];              // 사용 가능한 색상 목록
  factory_price: number;          // 출고가
  defaultSubsidy: number;        // 기본 공시지원금
  updatedAt: string;              // 마지막 수정 일시 (ISO 8601)
}

/**
 * 요금제 정책 인터페이스
 * 
 * 각 요금제별 월 요금, 리베이트를 관리합니다.
 */
export interface PlanPolicy {
  id: string;                    // 요금제 고유 ID
  name: string;                  // 요금제명
  monthlyFee: number;            // 월 요금
  rebate: number;                // 리베이트 금액
  updatedAt: string;             // 마지막 수정 일시 (ISO 8601)
}

/**
 * 부가서비스 정책 인터페이스
 * 
 * 각 부가서비스별 가격을 관리합니다.
 */
export interface AddOnPolicy {
  id: string;                    // 부가서비스 고유 ID
  name: string;                  // 부가서비스명
  price: number;                 // 가격 (0이면 무료 프로모션)
  updatedAt: string;             // 마지막 수정 일시 (ISO 8601)
}

/**
 * 정책 스토어 상태 인터페이스
 */
interface PolicyState {
  // 정책 데이터
  devicePolicies: DevicePolicy[];
  planPolicies: PlanPolicy[];
  addOnPolicies: AddOnPolicy[];

  // 정책 관리 액션
  setDevicePolicies: (policies: DevicePolicy[]) => void;
  updateDevicePolicy: (id: string, updates: Partial<DevicePolicy>) => void;
  addDevicePolicy: (policy: Omit<DevicePolicy, "id" | "updatedAt">) => void;
  deleteDevicePolicy: (id: string) => void;

  setPlanPolicies: (policies: PlanPolicy[]) => void;
  updatePlanPolicy: (id: string, updates: Partial<PlanPolicy>) => void;
  addPlanPolicy: (policy: Omit<PlanPolicy, "id" | "updatedAt">) => void;
  deletePlanPolicy: (id: string) => void;

  setAddOnPolicies: (policies: AddOnPolicy[]) => void;
  updateAddOnPolicy: (id: string, updates: Partial<AddOnPolicy>) => void;
  addAddOnPolicy: (policy: Omit<AddOnPolicy, "id" | "updatedAt">) => void;
  deleteAddOnPolicy: (id: string) => void;

  // 정책 조회 헬퍼 함수
  getDevicePolicy: (id: string) => DevicePolicy | undefined;
  getPlanPolicy: (id: string) => PlanPolicy | undefined;
  getAddOnPolicy: (id: string) => AddOnPolicy | undefined;
  getPlanPolicyByName: (name: string) => PlanPolicy | undefined;
  getAddOnPolicyById: (id: string) => AddOnPolicy | undefined;
}

/**
 * 초기 정책 데이터 (기존 목업 데이터를 기반으로 생성)
 * 
 * 실제 운영 시에는 빈 배열로 시작하고 관리자가 정책을 추가합니다.
 */
const INITIAL_DEVICE_POLICIES: DevicePolicy[] = [
  {
    id: "iphone16-128",
    name: "iPhone 16",
    capacity: "128GB",
    colors: ["블랙", "화이트", "블루", "그린"],
    factory_price: 1_250_000,
    defaultSubsidy: 400_000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "iphone16-256",
    name: "iPhone 16",
    capacity: "256GB",
    colors: ["블랙", "화이트", "블루", "그린"],
    factory_price: 1_350_000,
    defaultSubsidy: 450_000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "galaxy24-256",
    name: "갤럭시 S24",
    capacity: "256GB",
    colors: ["블랙", "바이올렛", "그레이"],
    factory_price: 1_199_000,
    defaultSubsidy: 350_000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "galaxy24-512",
    name: "갤럭시 S24",
    capacity: "512GB",
    colors: ["블랙", "바이올렛"],
    factory_price: 1_349_000,
    defaultSubsidy: 400_000,
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_PLAN_POLICIES: PlanPolicy[] = [
  {
    id: "5g-ultimate",
    name: "5G 프리미어 올인원",
    monthlyFee: 89_000,
    rebate: 120_000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5g-standard",
    name: "5G 스탠다드",
    monthlyFee: 65_000,
    rebate: 80_000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5g-basic",
    name: "5G 라이트",
    monthlyFee: 45_000,
    rebate: 50_000,
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_ADDON_POLICIES: AddOnPolicy[] = [
  {
    id: "care-plus",
    name: "케어플러스 12개월",
    price: 99_000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "buds",
    name: "무선 이어폰 프로모션",
    price: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "case",
    name: "케이스+보호필름 패키지",
    price: 39_000,
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 정책 관리 스토어
 * 
 * 정책 데이터를 localStorage에 영속화하여 관리합니다.
 * 관리자가 정책을 수정하면 즉시 모든 견적기에 반영됩니다.
 */
export const usePolicyStore = create<PolicyState>()(
  persist(
    (set, get) => ({
      // 초기 정책 데이터
      devicePolicies: INITIAL_DEVICE_POLICIES,
      planPolicies: INITIAL_PLAN_POLICIES,
      addOnPolicies: INITIAL_ADDON_POLICIES,

      /**
       * 기기 정책 전체 교체
       */
      setDevicePolicies: (policies) =>
        set({ devicePolicies: policies }),

      /**
       * 기기 정책 업데이트
       * 
       * @param id - 업데이트할 정책 ID
       * @param updates - 업데이트할 필드들
       */
      updateDevicePolicy: (id, updates) =>
        set((state) => ({
          devicePolicies: state.devicePolicies.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      /**
       * 기기 정책 추가
       */
      addDevicePolicy: (policy) =>
        set((state) => ({
          devicePolicies: [
            ...state.devicePolicies,
            {
              ...policy,
              id: crypto.randomUUID(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      /**
       * 기기 정책 삭제
       */
      deleteDevicePolicy: (id) =>
        set((state) => ({
          devicePolicies: state.devicePolicies.filter((p) => p.id !== id),
        })),

      /**
       * 요금제 정책 전체 교체
       */
      setPlanPolicies: (policies) =>
        set({ planPolicies: policies }),

      /**
       * 요금제 정책 업데이트
       */
      updatePlanPolicy: (id, updates) =>
        set((state) => ({
          planPolicies: state.planPolicies.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      /**
       * 요금제 정책 추가
       */
      addPlanPolicy: (policy) =>
        set((state) => ({
          planPolicies: [
            ...state.planPolicies,
            {
              ...policy,
              id: crypto.randomUUID(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      /**
       * 요금제 정책 삭제
       */
      deletePlanPolicy: (id) =>
        set((state) => ({
          planPolicies: state.planPolicies.filter((p) => p.id !== id),
        })),

      /**
       * 부가서비스 정책 전체 교체
       */
      setAddOnPolicies: (policies) =>
        set({ addOnPolicies: policies }),

      /**
       * 부가서비스 정책 업데이트
       */
      updateAddOnPolicy: (id, updates) =>
        set((state) => ({
          addOnPolicies: state.addOnPolicies.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      /**
       * 부가서비스 정책 추가
       */
      addAddOnPolicy: (policy) =>
        set((state) => ({
          addOnPolicies: [
            ...state.addOnPolicies,
            {
              ...policy,
              id: crypto.randomUUID(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      /**
       * 부가서비스 정책 삭제
       */
      deleteAddOnPolicy: (id) =>
        set((state) => ({
          addOnPolicies: state.addOnPolicies.filter((p) => p.id !== id),
        })),

      /**
       * 기기 정책 조회 (ID로)
       */
      getDevicePolicy: (id) =>
        get().devicePolicies.find((p) => p.id === id),

      /**
       * 요금제 정책 조회 (ID로)
       */
      getPlanPolicy: (id) =>
        get().planPolicies.find((p) => p.id === id),

      /**
       * 부가서비스 정책 조회 (ID로)
       */
      getAddOnPolicy: (id) =>
        get().addOnPolicies.find((p) => p.id === id),

      /**
       * 요금제 정책 조회 (이름으로)
       * 
       * 계약 생성 시 요금제명으로 리베이트를 조회할 때 사용합니다.
       */
      getPlanPolicyByName: (name) =>
        get().planPolicies.find((p) => p.name === name),

      /**
       * 부가서비스 정책 조회 (ID로)
       * 
       * 계약 생성 시 부가서비스 ID로 가격을 조회할 때 사용합니다.
       */
      getAddOnPolicyById: (id) =>
        get().addOnPolicies.find((p) => p.id === id),
    }),
    {
      name: "phone-store-policies", // localStorage 키 이름
    }
  )
);
