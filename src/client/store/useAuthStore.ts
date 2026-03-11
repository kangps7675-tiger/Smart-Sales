/**
 * 인증 및 사용자 관리 스토어 (Zustand)
 * 
 * 역할:
 * - 사용자 인증 상태 관리 (로그인/로그아웃)
 * - 3단계 권한 시스템 (RBAC) 구현
 * - 매장 및 초대 코드 관리
 * - localStorage에 상태 영속화 (persist)
 * 
 * @file useAuthStore.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 사용자 역할 타입 정의
 *
 * 권한 계층:
 * - super_admin: 본사 - 전체 시스템·정책·조직 관리
 * - tenant_admin: 매장주 - 본인 매장만 관리
 * - staff: 판매사 - 본인 리드/계약만
 */
export type Role =
  | "super_admin"     // 본사
  | "tenant_admin"    // 매장주
  | "staff";          // 판매사

/**
 * 매장 정보 인터페이스
 */
export interface Shop {
  id: string;
  name: string;
  createdAt: string;
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
  /** 소속 매장 ID. super_admin은 null 가능, tenant_admin/staff는 본인 매장 */
  shopId: string | null;
}

/**
 * 판매사 초대 코드 인터페이스
 */
export interface Invite {
  code: string;
  shopId: string;
  shopName: string;
  role: "staff";
  createdAt: string;
  expiresAt: string;
}


/**
 * 인증 스토어 상태 인터페이스
 */
interface AuthState {
  _hasHydrated: boolean;
  user: User | null;
  isLoggedIn: boolean;
  autoLogin: boolean;
  registeredUsers: User[];
  registeredShops: Shop[];
  invites: Invite[];
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
  signUpWithInvite: (
    inviteCode: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  createInvite: (shopId: string) => Promise<Invite | null>;
  logout: () => void;
  setUser: (user: User | null) => void;
  signUpAsSuperAdmin: (
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  getShopsForCurrentUser: () => Shop[];
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "슈퍼 어드민",
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

      login: async (loginId, password, autoLogin = true) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ login_id: loginId.trim(), password }),
          });

          const json = await res.json().catch(() => ({} as any));

          if (!res.ok) {
            const message =
              (json && (json.error as string | undefined)) ||
              "로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.";
            return { success: false, error: message };
          }

          const { id, name, role, shop_id } = json as {
            id: string;
            name: string | null;
            role: Role;
            shop_id: string | null;
          };

          const user: User = {
            id,
            name: name ?? loginId.trim(),
            email: "",
            loginId: loginId.trim(),
            role,
            shopId: shop_id ?? null,
          };

          set({ user, isLoggedIn: true, autoLogin: autoLogin ?? true });

          try {
            const headers: Record<string, string> = { "x-user-role": user.role };
            if (user.shopId) headers["x-user-shop-id"] = user.shopId;
            const shopsRes = await fetch("/api/shops", { credentials: "include", headers });
            const shopsJson = await shopsRes.json().catch(() => []);
            if (shopsRes.ok && Array.isArray(shopsJson)) {
              const fromApi: Shop[] = shopsJson.map((s: { id: string; name: string; createdAt: string }) => ({
                id: s.id,
                name: s.name,
                createdAt: s.createdAt ?? new Date().toISOString(),
              }));
              set((state) => ({ registeredShops: fromApi.length > 0 ? fromApi : state.registeredShops }));
            }
          } catch (_) {
            // 매장 목록 조회 실패 시 기존 registeredShops 유지
          }

          return { success: true };
        } catch (error) {
          console.error("[Auth] 로그인 요청 실패", error);
          return { success: false, error: "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
        }
      },

      signUpAsTenantAdmin: async (shopName, userData, password) => {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
            if (typeof window !== "undefined") alert(message);
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
          };

          const shop: Shop = {
            id: responseShopId ?? "",
            name: shopName.trim(),
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            registeredShops: responseShopId
              ? [...state.registeredShops.filter((s) => s.id !== responseShopId), shop]
              : state.registeredShops,
            user,
            isLoggedIn: true,
            autoLogin: true,
          }));

          return { success: true };
        } catch (error) {
          console.error("[Auth] 매장주 가입 요청 실패", error);
          const message = "매장주 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          if (typeof window !== "undefined") alert(message);
          return { success: false, error: message };
        }
      },

      signUpWithInvite: async (inviteCode, userData, password) => {
        const code = inviteCode.trim().toUpperCase();

        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
            shopId: shop_id ?? null,
          };

          set({ user, isLoggedIn: true, autoLogin: true });

          return { success: true };
        } catch (error) {
          console.error("[Auth] 판매사 가입 요청 실패", error);
          return { success: false, error: "판매사 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
        }
      },

      createInvite: async (shopId) => {
        const { user } = get();

        if (!user) return null;
        if (user.role !== "tenant_admin" && user.role !== "super_admin") return null;
        if (user.role === "tenant_admin" && user.shopId !== shopId) return null;

        try {
          const res = await fetch("/api/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop_id: shopId }),
          });

          const json = await res.json().catch(() => ({} as any));
          if (!res.ok) return null;

          const invite: Invite = {
            code: json.code,
            shopId: json.shop_id,
            shopName: json.shop_name,
            role: "staff",
            createdAt: json.created_at,
            expiresAt: json.expires_at,
          };

          return invite;
        } catch {
          return null;
        }
      },

      logout: () => {
        try {
          fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        } finally {
          set({ user: null, isLoggedIn: false });
        }
      },

      setUser: (user) => set({ user, isLoggedIn: !!user }),

      signUpAsSuperAdmin: async (userData, pwd) => {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
          };

          set({ user, isLoggedIn: true, autoLogin: true });

          return { success: true };
        } catch (error) {
          console.error("[Auth] 슈퍼 어드민 가입 요청 실패", error);
          return { success: false, error: "슈퍼 어드민 가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
        }
      },

      /**
       * 현재 사용자가 접근 가능한 매장 목록 조회
       * - super_admin: 모든 매장
       * - tenant_admin/staff: 본인 매장만
       */
      getShopsForCurrentUser: () => {
        const { user, registeredShops } = get();
        if (!user) return [];
        if (user.role === "super_admin") return registeredShops;
        if (user.shopId) return registeredShops.filter((s) => s.id === user.shopId);
        return [];
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.autoLogin ? state.user : null,
        isLoggedIn: state.autoLogin ? state.isLoggedIn : false,
        autoLogin: state.autoLogin,
        registeredShops: state.registeredShops,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[AutoRecovery] Zustand 스토리지 복원 실패. 초기화합니다.", error);
          try {
            localStorage.removeItem("auth-storage");
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
          state._hasHydrated = true;
          try {
            state.registeredUsers = [];
            state.invites = [];
            if (state.user && (!state.user.id || !state.user.role)) {
              console.warn("[AutoRecovery] 손상된 사용자 데이터 감지. 초기화합니다.");
              state.user = null;
              state.isLoggedIn = false;
            }
            if (!Array.isArray(state.registeredShops)) {
              state.registeredShops = [];
            }
          } catch (validationError) {
            console.error("[AutoRecovery] 데이터 검증 실패:", validationError);
          }
        }
      },
    }
  )
);

if (typeof window !== "undefined") {
  useAuthStore.persist.onFinishHydration(() => {
    useAuthStore.setState({ _hasHydrated: true });
  });
}
