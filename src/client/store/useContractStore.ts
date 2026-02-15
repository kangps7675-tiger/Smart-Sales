import { create } from "zustand";

// ─── PRD 데이터 구조 (가이드 문서 기준) ─────────────────────────────────────

/** 유입 경로 */
export type CustomerPath = "당근마켓" | "지인 소개" | "워킹" | "";

/** 기존 통신사 */
export type ExistingCarrier = "SKT" | "KT" | "LG U+" | "알뜰" | "";

/** 가입 유형 */
export type JoinType = "번호이동" | "기기변경" | "";

export interface Customer {
  name: string;
  phone: string;
  birthDate: string;
  address: string;
  path: CustomerPath;
  existingCarrier: ExistingCarrier;
}

export interface Device {
  model: string;
  capacity: string;
  color: string;
  imei: string;
  factory_price: number;
  subsidy: number;
}

export interface Plan {
  planName: string;
  joinType: JoinType;
  isSubsidy: boolean;
  installments: number;
}

export interface Discount {
  combinedDiscount: boolean;
  addOnServices: string[];
}

export interface Settlement {
  margin: number;
  cashPaid: number;
  rebate: number;
  finalPrice: number;
  isCompleted: boolean;
}

/** Step 0: 기본 정보 */
export interface BasicInfo {
  consultDate: string;
  salesPerson: string;
  shopName: string;
}

export interface ContractState {
  contract_id: string;
  shop_id: string;
  created_at: string;

  basicInfo: BasicInfo;
  customer: Customer;
  device: Device;
  plan: Plan;
  discount: Discount;
  settlement: Settlement;
}

// ─── 목업 데이터 (모델 선택 시 출고가·지원금 자동 바인딩) ─────────────────────

export interface MockModel {
  id: string;
  name: string;
  capacity: string;
  colors: string[];
  factory_price: number;
  defaultSubsidy: number;
}

export interface MockPlan {
  id: string;
  name: string;
  monthlyFee: number;
  rebate: number;
}

export interface MockAddOn {
  id: string;
  name: string;
  price: number;
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

function createInitialState(): ContractState {
  return {
    contract_id: crypto.randomUUID(),
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

  /** 현재 스토어 전체를 JSON으로 반환 (저장/일보 전송용) */
  getPayload: () => ContractState;
}

// ─── 정산 실시간 계산 (요금제·부가·기기 변경 시 호출) ────────────────────────

function computeSettlement(state: ContractState): Partial<Settlement> {
  const { device, plan, discount } = state;
  const planMatch = MOCK_PLANS.find((p) => p.name === plan.planName);
  const rebate = planMatch?.rebate ?? 0;
  const addOnCost = discount.addOnServices.reduce((sum, id) => {
    const addon = MOCK_ADDONS.find((a) => a.id === id);
    return sum + (addon?.price ?? 0);
  }, 0);
  const finalPrice = Math.max(0, device.factory_price - device.subsidy);
  const margin = rebate - device.subsidy - addOnCost;
  return {
    rebate,
    finalPrice,
    margin: Math.round(margin),
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

    setDevice: (data) =>
      set((state) => {
        const next = { ...state.device, ...data };
        const newState = { ...state, device: next };
        const settlementUpdate = computeSettlement(newState);
        return {
          device: next,
          settlement: { ...state.settlement, ...settlementUpdate },
        };
      }),

    setPlan: (data) =>
      set((state) => {
        const next = { ...state.plan, ...data };
        const newState = { ...state, plan: next };
        const settlementUpdate = computeSettlement(newState);
        return {
          plan: next,
          settlement: { ...state.settlement, ...settlementUpdate },
        };
      }),

    setDiscount: (data) =>
      set((state) => {
        const addOnServices = data.addOnServices ?? state.discount.addOnServices;
        const next = { ...state.discount, ...data, addOnServices };
        const newState = { ...state, discount: next };
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

    recalculateSettlement: () => {
      const state = get();
      const update = computeSettlement(state);
      set((s) => ({
        settlement: { ...s.settlement, ...update },
      }));
    },

    reset: () => set(createInitialState()),

    getPayload: () => get(),
  })
);
