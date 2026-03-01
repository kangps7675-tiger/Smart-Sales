/**
 * 인증 및 사용자 관리 스토어 (Zustand)
 * 
 * 역할:
 * - 사용자 인증 상태 관리 (로그인/로그아웃)
 * - 4단계 권한 시스템 (RBAC) 구현
 * - 매장 및 초대 코드 관리
 * - localStorage에 상태 영속화 (persist)
 * 
 * @file useAuthStore.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── 4단계 권한 (RBAC) ─────────────────────────────────────────────────────
/**
 * 사용자 역할 타입 정의
 *
 * 권한 계층:
 * - super_admin: 본사 - 전체 시스템·정책·조직 관리
 * - region_manager: 지점장 - 담당 지점 내 모든 매장 관리
 * - tenant_admin: 매장주 - 본인 매장만 관리
 * - staff: 판매사 - 본인 리드/계약만
 */
export type Role =
  | "super_admin"     // 본사
  | "region_manager"  // 지점장 (지역/지점 그룹 단위)
  | "tenant_admin"    // 매장주
  | "staff";          // 판매사

/**
 * 매장 정보 인터페이스
 */
export interface Shop {
  id: string;
  name: string;
  createdAt: string;
  /** 지점/지역 그룹 ID (지점장이 해당 그룹 매장만 볼 때 사용) */
  storeGroupId?: string | null;
}

/**
 * 사용자 정보 인터페이스
 */
export interface User {
  id: string;
  name: string;
  email: string;
  loginId: string;
  role: Role;
  /** 소속 매장 ID. super_admin/region_manager는 null 가능, tenant_admin/staff는 본인 매장 */
  shopId: string | null;
  /** 지점장(region_manager)일 때 관리하는 지점 ID */
  storeGroupId: string | null;
}

/**
 * 판매사 초대 코드 인터페이스
 * 
 * 매장주(tenant_admin) 또는 슈퍼 어드민이 발급하며,
 * 판매사가 코드로 가입 시 해당 매장의 staff 역할로 자동 등록됩니다.
 */
export interface Invite {
  code: string;         // 초대 코드 (6자리 대문자+숫자)
  shopId: string;       // 대상 매장 ID
  shopName: string;     // 매장명 (표시용)
  role: "staff";        // 고정: 판매사 역할
  createdAt: string;    // 발급 일시
  expiresAt: string;    // 만료 일시 (기본 7일)
}


/**
 * 슈퍼 어드민 가입 시 필요한 비밀번호
 * TODO: 프로덕션 환경에서는 환경변수로 관리 필요
 */
const SUPER_ADMIN_SIGNUP_PASSWORD = "superadmin123!";

/**
 * 인증 스토어 상태 인터페이스
 */
interface AuthState {
  _hasHydrated: boolean;        // localStorage에서 데이터 불러오기 완료 여부 (hydration)
  user: User | null;            // 현재 로그인한 사용자 정보
  isLoggedIn: boolean;          // 로그인 상태
  autoLogin: boolean;           // 자동 로그인 설정 여부
  registeredUsers: User[];      // 등록된 모든 사용자 목록 (임시 저장소)
  registeredShops: Shop[];      // 등록된 모든 매장 목록
  invites: Invite[];            // 판매사 초대 코드 목록
  login: (
    loginId: string,
    password: string,
    autoLogin?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  signUpAsTenantAdmin: (
    shopName: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpAsRegionManager: (
    storeGroupName: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string,
    signupKey: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpWithInvite: (
    inviteCode: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  createInvite: (shopId: string) => Invite | null;
  logout: () => void;
  setUser: (user: User | null) => void;
  verifySuperAdminSignupPassword: (password: string) => boolean;
  signUpAsSuperAdmin: (
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  /** 현재 사용자 소속 매장만 (tenant_admin/staff). super_admin은 전체 조회 가능 */
  getShopsForCurrentUser: () => Shop[];
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "슈퍼 어드민",
  region_manager: "지점장",
  tenant_admin: "매장주",
  staff: "판매사",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      user: null,
      isLoggedIn: false,
      autoLogin: true,
      registeredUsers: [],
      registeredShops: [],
      invites: [],

      /**
       * 로그인 처리
       *
       * - /api/auth/login API 호출
       * - 성공 시 반환된 사용자 정보로 Zustand 상태 업데이트
       */
      login: async (loginId, password, autoLogin = true) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              login_id: loginId.trim(),
              password,
            }),
          });

          const json = await res.json().catch(() => ({} as any));

          if (!res.ok) {
            const message =
              (json && (json.error as string | undefined)) ||
              "로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.";
            return { success: false, error: message };
          }

          const { id, name, role, shop_id, store_group_id } = json as {
            id: string;
            name: string | null;
            role: Role;
            shop_id: string | null;
            store_group_id?: string | null;
          };

          const user: User = {
            id,
            name: name ?? loginId.trim(),
            email: "",
            loginId: loginId.trim(),
            role,
            shopId: shop_id ?? null,
            storeGroupId: store_group_id ?? null,
          };

          set({
            user,
            isLoggedIn: true,
            autoLogin: autoLogin ?? true,
          });

          // 로그인 성공 후 DB 매장 목록 동기화 (GET /api/shops)
          try {
            const headers: Record<string, string> = { "x-user-role": user.role };
            if (user.shopId) headers["x-user-shop-id"] = user.shopId;
            if (user.storeGroupId) headers["x-store-group-id"] = user.storeGroupId;
            const shopsRes = await fetch("/api/shops", { credentials: "include", headers });
            const shopsJson = await shopsRes.json().catch(() => []);
            if (shopsRes.ok && Array.isArray(shopsJson)) {
              const fromApi: Shop[] = shopsJson.map((s: { id: string; name: string; createdAt: string; storeGroupId?: string | null }) => ({
                id: s.id,
                name: s.name,
                createdAt: s.createdAt ?? new Date().toISOString(),
                storeGroupId: s.storeGroupId ?? null,
              }));
              set((state) => ({ registeredShops: fromApi.length > 0 ? fromApi : state.registeredShops }));
            }
          } catch (_) {
            // 매장 목록 조회 실패 시 기존 registeredShops 유지
          }

          return { success: true };
        } catch (error) {
          console.error("[Auth] 로그인 요청 실패", error);
          const message = "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          return { success: false, error: message };
        }
      },

      /**
       * 매장주 가입 처리
       * 
       * @param shopName - 등록할 매장명
       * @param userData - 사용자 정보 (name, email, loginId)
       * @param _password - 비밀번호 (현재는 검증하지 않음)
       * 
       * 동작:
       * 1. 새 매장 생성 (UUID 생성)
       * 2. 매장주 사용자 생성 (role: tenant_admin, shopId: 생성된 매장 ID)
       * 3. 매장 및 사용자를 각각 목록에 추가
       * 4. 자동 로그인 처리
       */
      signUpAsTenantAdmin: async (shopName, userData, password) => {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login_id: userData.loginId.trim(),
              password,
              name: userData.name.trim(),
              role: "tenant_admin",
              shop_name: shopName.trim(),
            }),
          });

          const json = await res.json().catch(() => ({} as any));

          if (!res.ok) {
            const message =
              (json && (json.error as string | undefined)) ||
              "매장주 가입에 실패했습니다. 다시 시도해주세요.";
            if (typeof window !== "undefined") {
              alert(message);
            }
            return { success: false, error: message };
          }

          const { id, role, shop_id: responseShopId } = json as {
            id: string;
            role: Role;
            shop_id: string | null;
          };

          const user: User = {
            id,
            name: userData.name.trim(),
            email: userData.email.trim(),
            loginId: userData.loginId.trim(),
            role: role ?? "tenant_admin",
            shopId: responseShopId ?? null,
            storeGroupId: null,
          };

          const shop: Shop = {
            id: responseShopId ?? "",
            name: shopName.trim(),
            createdAt: new Date().toISOString(),
          };

          // 상태 업데이트: API에서 생성된 매장·사용자로 자동 로그인
          set((state) => ({
            registeredShops: responseShopId ? [...state.registeredShops.filter((s) => s.id !== responseShopId), shop] : state.registeredShops,
            registeredUsers: [...state.registeredUsers, user],
            user,
            isLoggedIn: true,
            autoLogin: true,
          }));

          return { success: true };
        } catch (error) {
          console.error("[Auth] 매장주 가입 요청 실패", error);
          const message =
            "매장주 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          if (typeof window !== "undefined") {
            alert(message);
          }
          return { success: false, error: message };
        }
      },

      /**
       * 지점장(region_manager) 가입 처리
       *
       * @param storeGroupName - 관리할 지점/브랜드/법인 이름
       * @param userData - 사용자 정보 (name, email, loginId)
       * @param password - 로그인 비밀번호
       * @param signupKey - 지점장 가입 키 (백엔드에서 REGION_MANAGER_SIGNUP_PASSWORD로 검증)
       */
      signUpAsRegionManager: async (storeGroupName, userData, password, signupKey) => {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login_id: userData.loginId.trim(),
              password,
              name: userData.name.trim(),
              role: "region_manager",
              store_group_name: storeGroupName.trim(),
              region_manager_signup_password: signupKey,
            }),
          });

          const json = await res.json().catch(() => ({} as any));

          if (!res.ok) {
            const message =
              (json && (json.error as string | undefined)) ||
              "지점장 가입에 실패했습니다. 가입 키와 정보를 다시 확인하세요.";
            if (typeof window !== "undefined") {
              alert(message);
            }
            return { success: false, error: message };
          }

          const { id, role, shop_id, store_group_id } = json as {
            id: string;
            role: Role;
            shop_id: string | null;
            store_group_id: string | null;
          };

          const user: User = {
            id,
            name: userData.name.trim(),
            email: userData.email.trim(),
            loginId: userData.loginId.trim(),
            role: role ?? "region_manager",
            shopId: shop_id ?? null,
            storeGroupId: store_group_id ?? userData.storeGroupId ?? null,
          };

          set((state) => ({
            registeredUsers: [...state.registeredUsers, user],
            user,
            isLoggedIn: true,
            autoLogin: true,
          }));

          return { success: true };
        } catch (error) {
          console.error("[Auth] 지점장 가입 요청 실패", error);
          const message =
            "지점장 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          if (typeof window !== "undefined") {
            alert(message);
          }
          return { success: false, error: message };
        }
      },

      /**
       * 판매사 초대 코드로 가입 처리
       * 
       * @param inviteCode - 판매사 초대 코드
       * @param userData - 사용자 정보 (name, email, loginId)
       * @param _password - 비밀번호 (현재는 검증하지 않음)
       * @returns 성공 여부 및 에러 메시지
       * 
       * 동작:
       * 1. 초대 코드 유효성 검증 (존재 여부, 만료 여부)
       * 2. 중복 아이디 검사
       * 3. 판매사 사용자 생성 (role: staff, shopId: 초대 코드의 매장 ID)
       * 4. 사용된 초대 코드 제거
       * 5. 자동 로그인 처리
       */
      signUpWithInvite: async (inviteCode, userData, password) => {
        const { invites, registeredUsers } = get();
        const code = inviteCode.trim().toUpperCase();
        // 초대 코드 검증: 코드 일치 및 만료일 확인
        const invite = invites.find(
          (i) => i.code.toUpperCase() === code && new Date(i.expiresAt) > new Date()
        );
        if (!invite) {
          return { success: false, error: "유효하지 않거나 만료된 초대 코드입니다." };
        }
        // 중복 아이디 검사
        const existing = registeredUsers.find(
          (u) => u.loginId.toLowerCase() === userData.loginId.trim().toLowerCase()
        );
        if (existing) {
          return { success: false, error: "이미 사용 중인 아이디입니다." };
        }

        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login_id: userData.loginId.trim(),
              password,
              name: userData.name.trim(),
              role: "staff",
              shop_code: code,
            }),
          });

          const json = await res.json().catch(() => ({} as any));

          if (!res.ok) {
            const message =
              (json && (json.error as string | undefined)) ||
              "판매사 가입에 실패했습니다. 초대 코드와 정보를 다시 확인하세요.";
            return { success: false, error: message };
          }

          const { id, role, shop_id } = json as {
            id: string;
            role: Role;
            shop_id: string | null;
          };

          const user: User = {
            id,
            name: userData.name.trim(),
            email: userData.email.trim(),
            loginId: userData.loginId.trim(),
            role: role ?? "staff",
            shopId: shop_id ?? invite.shopId,
            storeGroupId: null,
          };

          // 상태 업데이트: 사용자 추가, 사용된 초대 코드 제거, 자동 로그인
          set((state) => ({
            registeredUsers: [...state.registeredUsers, user],
            invites: state.invites.filter((i) => i.code !== invite.code),
            user,
            isLoggedIn: true,
            autoLogin: true,
          }));

          return { success: true };
        } catch (error) {
          console.error("[Auth] 판매사 가입 요청 실패", error);
          const message =
            "판매사 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          return { success: false, error: message };
        }
      },


      /**
       * 판매사 초대 코드(매장키) 생성
       * 
       * @param shopId - 초대 코드를 발급할 매장 ID
       * @returns 생성된 초대 코드 또는 null (권한 없음)
       * 
       * 권한:
       * - tenant_admin: 본인 매장만 발급 가능
       * - super_admin: 모든 매장 발급 가능
       * 
       * 매장키는 발급 시마다 매번 다른 값으로 생성됩니다.
       * 형식: 6자리 대문자+숫자 (I, O, 0, 1 제외). 기존 코드와 중복 시 재생성.
       * 유효기간: 발급일로부터 7일
       */
      createInvite: (shopId) => {
        const { user, registeredShops, invites } = get();
        if (user?.role !== "tenant_admin" && user?.role !== "super_admin" && user?.role !== "region_manager") return null;
        if (user.role === "tenant_admin" && user.shopId !== shopId) return null;
        if (user.role === "region_manager" && user.storeGroupId) {
          const shop = registeredShops.find((s) => s.id === shopId);
          if (!shop || shop.storeGroupId !== user.storeGroupId) return null;
        }
        const shop = registeredShops.find((s) => s.id === shopId);
        if (!shop) return null;
        const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code: string;
        let attempts = 0;
        do {
          code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
            .map((n) => charset[n % charset.length])
            .join("");
          const exists = invites.some((i) => i.code.toUpperCase() === code.toUpperCase());
          if (!exists) break;
          attempts++;
        } while (attempts < 20);
        if (attempts >= 20) code = code + Date.now().toString(36).slice(-2).toUpperCase();
        const now = new Date();
        // 만료일: 발급일로부터 7일 후
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const invite: Invite = {
          code,
          shopId,
          shopName: shop.name,
          role: "staff",
          createdAt: now.toISOString(),
          expiresAt,
        };
        // 초대 코드 목록에 추가
        set((state) => ({ invites: [...state.invites, invite] }));
        return invite;
      },


      /**
       * 로그아웃 처리
       * 사용자 정보 및 로그인 상태 초기화
       */
      logout: () => {
        try {
          fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        } finally {
          set({ user: null, isLoggedIn: false });
        }
      },

      /**
       * 사용자 정보 직접 설정
       * @param user - 설정할 사용자 정보 (null이면 로그아웃)
       */
      setUser: (user) => set({ user, isLoggedIn: !!user }),

      /**
       * 슈퍼 어드민 가입 비밀번호 검증
       * @param pwd - 입력한 비밀번호
       * @returns 비밀번호 일치 여부
       */
      verifySuperAdminSignupPassword: (pwd) =>
        pwd === SUPER_ADMIN_SIGNUP_PASSWORD,

      /**
       * 슈퍼 어드민 가입 처리
       * 
       * @param userData - 사용자 정보 (name, email, loginId)
       * @param pwd - 가입 비밀번호
       * @returns 성공 여부
       * 
       * 동작:
       * 1. 비밀번호 검증
       * 2. 슈퍼 어드민 사용자 생성 (role: super_admin, shopId: null)
       * 3. 사용자 목록에 추가
       * 4. 자동 로그인 처리
       */
      signUpAsSuperAdmin: async (userData, pwd) => {
        // 기본 가입 키 검증 (로컬)
        if (pwd !== SUPER_ADMIN_SIGNUP_PASSWORD) {
          return { success: false, error: "가입 키가 올바르지 않습니다." };
        }

        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login_id: userData.loginId.trim(),
              password: pwd,
              name: userData.name.trim(),
              role: "super_admin",
              super_admin_signup_password: pwd,
            }),
          });

          const json = await res.json().catch(() => ({} as any));

          if (!res.ok) {
            const message =
              (json && (json.error as string | undefined)) ||
              "슈퍼 어드민 가입에 실패했습니다.";
            return { success: false, error: message };
          }

          const { id, role, shop_id } = json as {
            id: string;
            role: Role;
            shop_id: string | null;
          };

          const user: User = {
            id,
            name: userData.name.trim(),
            email: userData.email.trim(),
            loginId: userData.loginId.trim(),
            role: role ?? "super_admin",
            shopId: shop_id ?? null,
            storeGroupId: null,
          };

          // 상태 업데이트: 사용자 추가, 자동 로그인
          set((state) => ({
            registeredUsers: [...state.registeredUsers, user],
            user,
            isLoggedIn: true,
            autoLogin: true,
          }));

          return { success: true };
        } catch (error) {
          console.error("[Auth] 슈퍼 어드민 가입 요청 실패", error);
          const message =
            "슈퍼 어드민 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          return { success: false, error: message };
        }
      },

      /**
       * 현재 사용자가 접근 가능한 매장 목록 조회
       *
       * - super_admin: 모든 매장
       * - region_manager: 담당 지점(storeGroupId) 매장 (동일 storeGroupId 또는 전부, API 연동 전까지 전부)
       * - tenant_admin/staff: 본인 매장만
       */
      getShopsForCurrentUser: () => {
        const { user, registeredShops } = get();
        if (!user) return [];
        if (user.role === "super_admin") return registeredShops;
        if (user.role === "region_manager" && user.storeGroupId) {
          return registeredShops.filter((s) => s.storeGroupId === user.storeGroupId);
        }
        if (user.role === "region_manager") return registeredShops;
        if (user.shopId) return registeredShops.filter((s) => s.id === user.shopId);
        return [];
      },
    }),
    {
      name: "auth-storage", // localStorage 키 이름
      /**
       * 상태 영속화 설정
       * localStorage에 저장할 필드만 선택적으로 저장
       * 
       * 저장 조건:
       * - autoLogin이 true일 때만 user와 isLoggedIn 저장
       * - autoLogin이 false면 로그아웃 상태로 저장 (다음 접속 시 자동 로그인 안 됨)
       */
      partialize: (state) => ({
        user: state.autoLogin ? state.user : null,
        isLoggedIn: state.autoLogin ? state.isLoggedIn : false,
        autoLogin: state.autoLogin,
        registeredUsers: state.registeredUsers,
        registeredShops: state.registeredShops,
        invites: state.invites,
      }),
      /**
       * localStorage에서 데이터 복원 시 호출되는 콜백
       * 손상된 데이터 감지 및 자동 복구
       */
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // 스토리지 복원 실패 시 자동 복구
          console.warn("[AutoRecovery] Zustand 스토리지 복원 실패. 초기화합니다.", error);
          try {
            localStorage.removeItem("auth-storage");
            // 초기 상태로 재설정
            if (state) {
              state._hasHydrated = true;
              state.user = null;
              state.isLoggedIn = false;
              state.registeredUsers = [];
              state.registeredShops = [];
              state.invites = [];
            }
          } catch (recoveryError) {
            console.error("[AutoRecovery] 복구 실패:", recoveryError);
          }
        } else if (state) {
          // 정상 복원 시 hydration 플래그 설정
          state._hasHydrated = true;
          
          // 데이터 무결성 검증
          try {
            // user가 있지만 유효하지 않은 경우 초기화
            if (state.user && (!state.user.id || !state.user.role)) {
              console.warn("[AutoRecovery] 손상된 사용자 데이터 감지. 초기화합니다.");
              state.user = null;
              state.isLoggedIn = false;
            }
            
            // 배열 데이터 검증
            if (!Array.isArray(state.registeredUsers)) {
              state.registeredUsers = [];
            }
            if (!Array.isArray(state.registeredShops)) {
              state.registeredShops = [];
            }
            if (!Array.isArray(state.invites)) {
              state.invites = [];
            }
          } catch (validationError) {
            console.error("[AutoRecovery] 데이터 검증 실패:", validationError);
          }
        }
      },
    }
  )
);

/**
 * Hydration 완료 플래그 설정 (추가 안전장치)
 * 
 * 브라우저 환경에서만 실행되며,
 * localStorage에서 데이터 불러오기가 완료되면
 * _hasHydrated 플래그를 true로 설정합니다.
 * 
 * 이 플래그는 DashboardAuthGuard에서 사용하여
 * 로그인 화면 깜빡임을 방지합니다.
 */
if (typeof window !== "undefined") {
  useAuthStore.persist.onFinishHydration(() => {
    useAuthStore.setState({ _hasHydrated: true });
  });
}
