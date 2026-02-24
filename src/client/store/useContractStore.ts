/**
 * 계약 및 견적 관리 스토어 (Zustand)
 * 
 * 역할:
 * - 계약 생성 과정의 단계별 데이터 관리 (고객 정보, 기기, 요금제, 할인 등)
 * - 실시간 정산 계산 (마진, 최종 판매가 등)
 * - 목업 데이터 제공 (기기 모델, 요금제, 부가서비스)
 * 
 * 주요 기능:
 * - Step 1: 고객 정보 입력
 * - Step 2: 기기 및 요금제 선택
 * - Step 3: 할인 및 부가서비스 선택
 * - 실시간 정산 계산 및 최종 가격 산출
 * 
 * @file useContractStore.ts
 */

import { create } from "zustand";
import { usePolicyStore } from "./usePolicyStore";

// ─── PRD 데이터 구조 (가이드 문서 기준) ─────────────────────────────────────

/**
 * 고객 유입 경로 타입
 */
export type CustomerPath = "당근마켓" | "지인 소개" | "워킹" | "";

/**
 * 기존 통신사 타입
 */
export type ExistingCarrier = "SKT" | "KT" | "LG U+" | "알뜰" | "";

/**
 * 가입 유형 타입
 */
export type JoinType = "번호이동" | "기기변경" | "";

/**
 * 고객 정보 인터페이스
 */
export interface Customer {
  name: string;              // 고객명
  phone: string;             // 연락처
  birthDate: string;          // 생년월일 (YYYY-MM-DD)
  address: string;           // 주소
  path: CustomerPath;         // 유입 경로
  existingCarrier: ExistingCarrier; // 기존 통신사
}

/**
 * 기기 정보 인터페이스
 */
export interface Device {
  model: string;             // 기기 모델명
  capacity: string;          // 저장 용량
  color: string;             // 색상
  imei: string;              // IMEI 번호
  factory_price: number;      // 출고가
  subsidy: number;           // 지원금
}

/**
 * 요금제 정보 인터페이스
 */
export interface Plan {
  planName: string;          // 요금제명
  joinType: JoinType;        // 가입 유형 (번호이동/기기변경)
  isSubsidy: boolean;         // 지원금 적용 여부
  installments: number;       // 할부 개월 수
}

/**
 * 할인 및 부가서비스 정보 인터페이스
 */
export interface Discount {
  combinedDiscount: boolean; // 통합 할인 여부
  addOnServices: string[];    // 선택한 부가서비스 ID 배열
}

/**
 * 정산 정보 인터페이스
 */
export interface Settlement {
  margin: number;            // 매장 마진
  cashPaid: number;         // 현금 지불액
  rebate: number;           // 리베이트
  finalPrice: number;        // 최종 판매가
  isCompleted: boolean;      // 계약 완료 여부
}

/**
 * 기본 정보 인터페이스 (Step 0)
 */
export interface BasicInfo {
  consultDate: string;       // 상담 일자 (YYYY-MM-DD)
  salesPerson: string;        // 판매사 이름
  shopName: string;          // 매장명
}

/**
 * 계약 시점의 정책 스냅샷 인터페이스
 * 
 * 계약 완료 시점의 정책 데이터를 저장하여,
 * 나중에 정책이 변경되어도 과거 계약의 마진이 변하지 않도록 합니다.
 */
export interface PolicySnapshot {
  devicePolicy?: {
    id: string;
    name: string;
    capacity: string;
    factory_price: number;
    defaultSubsidy: number;
  };
  planPolicy?: {
    id: string;
    name: string;
    monthlyFee: number;
    rebate: number;
  };
  addOnPolicies?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  snapshotAt: string; // 스냅샷 생성 일시 (ISO 8601)
}

/**
 * 계약 전체 상태 인터페이스
 * 
 * 계약 생성 과정의 모든 단계 데이터를 포함합니다.
 */
export interface ContractState {
  contract_id: string;       // 계약 고유 ID (UUID)
  shop_id: string;           // 매장 ID
  created_at: string;        // 계약 생성 일시 (ISO 8601)

  basicInfo: BasicInfo;      // 기본 정보
  customer: Customer;         // 고객 정보
  device: Device;             // 기기 정보
  plan: Plan;                 // 요금제 정보
  discount: Discount;         // 할인 및 부가서비스
  settlement: Settlement;     // 정산 정보
  policySnapshot?: PolicySnapshot; // 계약 시점의 정책 스냅샷 (저장 시 포함)
}

// ─── 목업 데이터 (모델 선택 시 출고가·지원금 자동 바인딩) ─────────────────────

/**
 * 목업 기기 모델 인터페이스
 * 실제 DB 연동 전까지 사용하는 샘플 데이터
 */
export interface MockModel {
  id: string;                // 모델 고유 ID
  name: string;              // 모델명
  capacity: string;          // 저장 용량
  colors: string[];          // 사용 가능한 색상 목록
  factory_price: number;      // 출고가
  defaultSubsidy: number;     // 기본 지원금
}

/**
 * 목업 요금제 인터페이스
 */
export interface MockPlan {
  id: string;                // 요금제 고유 ID
  name: string;              // 요금제명
  monthlyFee: number;        // 월 요금
  rebate: number;           // 리베이트 금액
}

/**
 * 목업 부가서비스 인터페이스
 */
export interface MockAddOn {
  id: string;                // 부가서비스 고유 ID
  name: string;              // 부가서비스명
  price: number;            // 가격 (0이면 무료 프로모션)
}

export const MOCK_MODELS: MockModel[] = [
  { id: "iphone16-128", name: "iPhone 16", capacity: "128GB", colors: ["블랙", "화이트", "블루", "그린"], factory_price: 1_250_000, defaultSubsidy: 400_000 },
  { id: "iphone16-256", name: "iPhone 16", capacity: "256GB", colors: ["블랙", "화이트", "블루", "그린"], factory_price: 1_350_000, defaultSubsidy: 450_000 },
  { id: "galaxy24-256", name: "갤럭시 S24", capacity: "256GB", colors: ["블랙", "바이올렛", "그레이"], factory_price: 1_199_000, defaultSubsidy: 350_000 },
  { id: "galaxy24-512", name: "갤럭시 S24", capacity: "512GB", colors: ["블랙", "바이올렛"], factory_price: 1_349_000, defaultSubsidy: 400_000 },
];

export const MOCK_PLANS: MockPlan[] = [
  { id: "5g-ultimate", name: "5G 프리미어 올인원", monthlyFee: 89_000, rebate: 120_000 },
  { id: "5g-standard", name: "5G 스탠다드", monthlyFee: 65_000, rebate: 80_000 },
  { id: "5g-basic", name: "5G 라이트", monthlyFee: 45_000, rebate: 50_000 },
];

export const MOCK_ADDONS: MockAddOn[] = [
  { id: "care-plus", name: "케어플러스 12개월", price: 99_000 },
  { id: "buds", name: "무선 이어폰 프로모션", price: 0 },
  { id: "case", name: "케이스+보호필름 패키지", price: 39_000 },
];

// ─── 초기값 ───────────────────────────────────────────────────────────────

/**
 * 기본 상담 일자 반환 (오늘 날짜)
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
function getDefaultConsultDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

const defaultBasicInfo: BasicInfo = {
  consultDate: getDefaultConsultDate(),
  salesPerson: "",
  shopName: "",
};

const defaultCustomer: Customer = {
  name: "",
  phone: "",
  birthDate: "",
  address: "",
  path: "",
  existingCarrier: "",
};

const defaultDevice: Device = {
  model: "",
  capacity: "",
  color: "",
  imei: "",
  factory_price: 0,
  subsidy: 0,
};

const defaultPlan: Plan = {
  planName: "",
  joinType: "",
  isSubsidy: false,
  installments: 0,
};

const defaultDiscount: Discount = {
  combinedDiscount: false,
  addOnServices: [],
};

const defaultSettlement: Settlement = {
  margin: 0,
  cashPaid: 0,
  rebate: 0,
  finalPrice: 0,
  isCompleted: false,
};

/**
 * 초기 계약 상태 생성
 * 
 * 새 계약을 시작할 때 호출되며,
 * 모든 필드를 기본값으로 초기화합니다.
 * 
 * @returns 초기화된 ContractState 객체
 */
function createInitialState(): ContractState {
  return {
    contract_id: crypto.randomUUID(), // 새 UUID 생성
    shop_id: "",
    created_at: new Date().toISOString(),
    basicInfo: { ...defaultBasicInfo, consultDate: getDefaultConsultDate() },
    customer: { ...defaultCustomer },
    device: { ...defaultDevice },
    plan: { ...defaultPlan },
    discount: { ...defaultDiscount },
    settlement: { ...defaultSettlement },
  };
}

// ─── 스토어 액션 ───────────────────────────────────────────────────────────

export interface ContractActions {
  setBasicInfo: (data: Partial<BasicInfo>) => void;
  setCustomer: (data: Partial<Customer>) => void;
  setDevice: (data: Partial<Device>) => void;
  setPlan: (data: Partial<Plan>) => void;
  setDiscount: (data: Partial<Discount>) => void;
  setSettlement: (data: Partial<Settlement>) => void;

  /** 요금제·부가서비스·기기 변경 시 최종 판매가·매장 마진 실시간 재계산 */
  recalculateSettlement: () => void;

  /** 새 계약으로 초기화 (다음 건 입력 시) */
  reset: () => void;

  /** 
   * 현재 스토어 전체를 JSON으로 반환 (저장/일보 전송용)
   * 
   * 계약 완료 시점의 정책 스냅샷을 포함하여 반환합니다.
   * 이를 통해 나중에 정책이 변경되어도 과거 계약의 마진이 변하지 않습니다.
   * 
   * @returns 정책 스냅샷이 포함된 ContractState 객체
   */
  getPayload: () => ContractState;
}

// ─── 정산 실시간 계산 (요금제·부가·기기 변경 시 호출) ────────────────────────

/**
 * 정산 정보 실시간 계산
 * 
 * 기기, 요금제, 부가서비스 변경 시 자동으로 호출되어
 * 리베이트, 최종 판매가, 매장 마진을 계산합니다.
 * 
 * 계산 공식:
 * - 최종 판매가 = 출고가 - 지원금 (최소 0)
 * - 매장 마진 = 리베이트 - 지원금 - 부가서비스 비용
 * 
 * 중요: 정책 스토어에서 최신 정책을 참조하여 계산합니다.
 * 
 * @param state - 현재 계약 상태
 * @returns 계산된 정산 정보 (rebate, finalPrice, margin)
 */
function computeSettlement(state: ContractState): Partial<Settlement> {
  const { device, plan, discount } = state;
  const policyStore = usePolicyStore.getState();
  
  // 선택한 요금제의 리베이트 조회 (정책 스토어에서)
  const planPolicy = policyStore.getPlanPolicyByName(plan.planName);
  const rebate = planPolicy?.rebate ?? 0;
  
  // 선택한 부가서비스들의 총 비용 계산 (정책 스토어에서)
  const addOnCost = discount.addOnServices.reduce((sum, id) => {
    const addonPolicy = policyStore.getAddOnPolicyById(id);
    return sum + (addonPolicy?.price ?? 0);
  }, 0);
  
  // 최종 판매가 = 출고가 - 지원금 (음수 방지)
  const finalPrice = Math.max(0, device.factory_price - device.subsidy);
  
  // 매장 마진 = 리베이트 - 지원금 - 부가서비스 비용
  const margin = rebate - device.subsidy - addOnCost;
  
  return {
    rebate,
    finalPrice,
    margin: Math.round(margin), // 소수점 반올림
  };
}

// ─── Zustand 스토어 ───────────────────────────────────────────────────────

export const useContractStore = create<ContractState & ContractActions>(
  (set, get) => ({
    ...createInitialState(),

    setBasicInfo: (data) =>
      set((state) => ({
        basicInfo: { ...state.basicInfo, ...data },
      })),

    setCustomer: (data) =>
      set((state) => ({
        customer: { ...state.customer, ...data },
      })),

    /**
     * 기기 정보 업데이트
     * 
     * 기기 정보 변경 시 자동으로 정산 정보를 재계산합니다.
     * (출고가, 지원금 변경 시 최종 판매가와 마진에 영향)
     */
    setDevice: (data) =>
      set((state) => {
        const next = { ...state.device, ...data };
        const newState = { ...state, device: next };
        // 기기 정보 변경 시 정산 재계산
        const settlementUpdate = computeSettlement(newState);
        return {
          device: next,
          settlement: { ...state.settlement, ...settlementUpdate },
        };
      }),

    /**
     * 요금제 정보 업데이트
     * 
     * 요금제 변경 시 자동으로 정산 정보를 재계산합니다.
     * (리베이트 변경 시 매장 마진에 영향)
     */
    setPlan: (data) =>
      set((state) => {
        const next = { ...state.plan, ...data };
        const newState = { ...state, plan: next };
        // 요금제 변경 시 정산 재계산
        const settlementUpdate = computeSettlement(newState);
        return {
          plan: next,
          settlement: { ...state.settlement, ...settlementUpdate },
        };
      }),

    /**
     * 할인 및 부가서비스 정보 업데이트
     * 
     * 부가서비스 선택 변경 시 자동으로 정산 정보를 재계산합니다.
     * (부가서비스 비용 변경 시 매장 마진에 영향)
     */
    setDiscount: (data) =>
      set((state) => {
        // 부가서비스 배열이 없으면 기존 값 유지
        const addOnServices = data.addOnServices ?? state.discount.addOnServices;
        const next = { ...state.discount, ...data, addOnServices };
        const newState = { ...state, discount: next };
        // 부가서비스 변경 시 정산 재계산
        const settlementUpdate = computeSettlement(newState);
        return {
          discount: next,
          settlement: { ...state.settlement, ...settlementUpdate },
        };
      }),

    setSettlement: (data) =>
      set((state) => ({
        settlement: { ...state.settlement, ...data },
      })),

    /**
     * 정산 정보 수동 재계산
     * 
     * 외부에서 정산 정보를 강제로 재계산해야 할 때 호출합니다.
     * (일반적으로는 setDevice, setPlan, setDiscount 호출 시 자동 계산됨)
     */
    recalculateSettlement: () => {
      const state = get();
      const update = computeSettlement(state);
      set((s) => ({
        settlement: { ...s.settlement, ...update },
      }));
    },

    /**
     * 계약 상태 초기화
     * 
     * 새 계약을 시작하거나 기존 계약을 취소할 때 호출합니다.
     * 모든 필드를 기본값으로 초기화하고 새 contract_id를 생성합니다.
     */
    reset: () => set(createInitialState()),

    /**
     * 현재 계약 상태 전체 반환 (정책 스냅샷 포함)
     * 
     * 계약 저장 또는 판매일보 전송 시 호출하여
     * 전체 계약 데이터를 JSON 형태로 가져옵니다.
     * 
     * 계약 완료 시점의 정책 데이터를 스냅샷으로 저장하여,
     * 나중에 정책이 변경되어도 과거 계약의 마진이 변하지 않도록 합니다.
     * 
     * @returns 정책 스냅샷이 포함된 ContractState 객체
     */
    getPayload: () => {
      const state = get();
      const policyStore = usePolicyStore.getState();
      
      // 현재 선택된 기기 정책 찾기
      const devicePolicyId = state.device?.model && state.device?.capacity
        ? policyStore.devicePolicies.find(
            (p) => p.name === state.device?.model && p.capacity === state.device?.capacity
          )?.id
        : undefined;
      const devicePolicy = devicePolicyId
        ? policyStore.getDevicePolicy(devicePolicyId)
        : undefined;
      
      // 현재 선택된 요금제 정책 찾기
      const planPolicy = policyStore.getPlanPolicyByName(state.plan.planName);
      
      // 선택된 부가서비스 정책들 찾기
      const addOnPolicies = state.discount.addOnServices
        .map((id) => policyStore.getAddOnPolicyById(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined);
      
      // 정책 스냅샷 생성
      const policySnapshot: PolicySnapshot = {
        devicePolicy: devicePolicy
          ? {
              id: devicePolicy.id,
              name: devicePolicy.name,
              capacity: devicePolicy.capacity,
              factory_price: devicePolicy.factory_price,
              defaultSubsidy: devicePolicy.defaultSubsidy,
            }
          : undefined,
        planPolicy: planPolicy
          ? {
              id: planPolicy.id,
              name: planPolicy.name,
              monthlyFee: planPolicy.monthlyFee,
              rebate: planPolicy.rebate,
            }
          : undefined,
        addOnPolicies: addOnPolicies.length > 0
          ? addOnPolicies.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
            }))
          : undefined,
        snapshotAt: new Date().toISOString(),
      };
      
      return {
        ...state,
        policySnapshot,
      };
    },
  })
);
