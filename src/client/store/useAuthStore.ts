import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── 4단계 권한 (RBAC) ─────────────────────────────────────────────────────
// 슈퍼 어드민: 전체 시스템 | 매장주: 본인 매장 | 판매사: 본인 매장 판매만 | 일반 고객: 본인 견적/AS
export type Role =
  | "super_admin"   // 전체 시스템 관리, 매장별 구독/결제, 공통 정책
  | "tenant_admin"  // 매장주: 판매사 관리, 매장 마진 정책, 실적
  | "staff"         // 판매사: 상담, 견적, 판매 일보 (다른 매장 데이터 불가)
  | "customer";     // 일반 고객: 견적 확인, 개통 현황, AS (선택)

export interface Shop {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  loginId: string;
  role: Role;
  /** 소속 매장 ID. super_admin은 null, tenant_admin/staff는 본인 매장 */
  shopId: string | null;
}

/** 판매사 초대용. 매장주가 발급, 판매사가 코드로 가입 시 shopId·role 부여 */
export interface Invite {
  code: string;
  shopId: string;
  shopName: string;
  role: "staff";
  createdAt: string;
  expiresAt: string;
}

/** 고객 초대용. 매장이 발급, 고객이 코드로 가입 시 해당 매장 고객(shopId)으로 등록 */
export interface CustomerInvite {
  code: string;
  shopId: string;
  shopName: string;
  createdAt: string;
  expiresAt: string;
}

const SUPER_ADMIN_SIGNUP_PASSWORD = "superadmin123";

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  autoLogin: boolean;
  registeredUsers: User[];
  registeredShops: Shop[];
  invites: Invite[];
  customerInvites: CustomerInvite[];
  login: (loginId: string, password: string, autoLogin?: boolean) => void;
  signUpAsTenantAdmin: (
    shopName: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => void;
  signUpWithInvite: (
    inviteCode: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => { success: boolean; error?: string };
  signUpAsCustomer: (
    inviteCode: string,
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => { success: boolean; error?: string };
  createInvite: (shopId: string) => Invite | null;
  createCustomerInvite: (shopId: string) => CustomerInvite | null;
  logout: () => void;
  setUser: (user: User | null) => void;
  verifySuperAdminSignupPassword: (password: string) => boolean;
  signUpAsSuperAdmin: (
    user: Omit<User, "id" | "role" | "shopId">,
    password: string
  ) => boolean;
  /** 현재 사용자 소속 매장만 (tenant_admin/staff). super_admin은 전체 조회 가능 */
  getShopsForCurrentUser: () => Shop[];
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "슈퍼 어드민",
  tenant_admin: "매장주",
  staff: "판매사",
  customer: "일반 고객",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      autoLogin: true,
      registeredUsers: [],
      registeredShops: [],
      invites: [],
      customerInvites: [],

      login: (loginId, _password, autoLogin = true) => {
        const { registeredUsers } = get();
        const found = registeredUsers.find(
          (u) => u.loginId.toLowerCase() === loginId.trim().toLowerCase()
        );
        if (found) {
          set({
            user: found,
            isLoggedIn: true,
            autoLogin: autoLogin ?? true,
          });
        } else {
          set({
            user: {
              id: "demo",
              name: "데모 사용자",
              email: `${loginId}@example.com`,
              loginId: loginId.trim(),
              role: "staff",
              shopId: null,
            },
            isLoggedIn: true,
            autoLogin: autoLogin ?? true,
          });
        }
      },

      signUpAsTenantAdmin: (shopName, userData, _password) => {
        const shopId = crypto.randomUUID();
        const shop: Shop = {
          id: shopId,
          name: shopName.trim(),
          createdAt: new Date().toISOString(),
        };
        const user: User = {
          id: crypto.randomUUID(),
          ...userData,
          role: "tenant_admin",
          shopId,
        };
        set((state) => ({
          registeredShops: [...state.registeredShops, shop],
          registeredUsers: [...state.registeredUsers, user],
          user,
          isLoggedIn: true,
          autoLogin: true,
        }));
      },

      signUpWithInvite: (inviteCode, userData, _password) => {
        const { invites, registeredUsers } = get();
        const code = inviteCode.trim().toUpperCase();
        const invite = invites.find(
          (i) => i.code.toUpperCase() === code && new Date(i.expiresAt) > new Date()
        );
        if (!invite) {
          return { success: false, error: "유효하지 않거나 만료된 초대 코드입니다." };
        }
        const existing = registeredUsers.find(
          (u) => u.loginId.toLowerCase() === userData.loginId.trim().toLowerCase()
        );
        if (existing) {
          return { success: false, error: "이미 사용 중인 아이디입니다." };
        }
        const user: User = {
          id: crypto.randomUUID(),
          ...userData,
          role: "staff",
          shopId: invite.shopId,
        };
        set((state) => ({
          registeredUsers: [...state.registeredUsers, user],
          invites: state.invites.filter((i) => i.code !== invite.code),
          user,
          isLoggedIn: true,
          autoLogin: true,
        }));
        return { success: true };
      },

      signUpAsCustomer: (inviteCode, userData, _password) => {
        const { customerInvites, registeredUsers } = get();
        const code = inviteCode.trim().toUpperCase();
        const invite = customerInvites.find(
          (i) => i.code.toUpperCase() === code && new Date(i.expiresAt) > new Date()
        );
        if (!invite) {
          return { success: false, error: "유효하지 않거나 만료된 고객 초대 코드입니다." };
        }
        const existing = registeredUsers.find(
          (u) => u.loginId.toLowerCase() === userData.loginId.trim().toLowerCase()
        );
        if (existing) {
          return { success: false, error: "이미 사용 중인 아이디입니다." };
        }
        const user: User = {
          id: crypto.randomUUID(),
          ...userData,
          role: "customer",
          shopId: invite.shopId,
        };
        set((state) => ({
          registeredUsers: [...state.registeredUsers, user],
          customerInvites: state.customerInvites.filter((i) => i.code !== invite.code),
          user,
          isLoggedIn: true,
          autoLogin: true,
        }));
        return { success: true };
      },

      createInvite: (shopId) => {
        const { user, registeredShops } = get();
        if (user?.role !== "tenant_admin" && user?.role !== "super_admin") return null;
        if (user.role === "tenant_admin" && user.shopId !== shopId) return null;
        const shop = registeredShops.find((s) => s.id === shopId);
        if (!shop) return null;
        const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 34])
          .join("");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const invite: Invite = {
          code,
          shopId,
          shopName: shop.name,
          role: "staff",
          createdAt: now.toISOString(),
          expiresAt,
        };
        set((state) => ({ invites: [...state.invites, invite] }));
        return invite;
      },

      createCustomerInvite: (shopId) => {
        const { user, registeredShops } = get();
        if (!user?.shopId && user?.role !== "super_admin") return null;
        if (user.role === "tenant_admin" && user.shopId !== shopId) return null;
        if (user.role === "staff" && user.shopId !== shopId) return null;
        const shop = registeredShops.find((s) => s.id === shopId);
        if (!shop) return null;
        const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 34])
          .join("");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const invite: CustomerInvite = {
          code,
          shopId,
          shopName: shop.name,
          createdAt: now.toISOString(),
          expiresAt,
        };
        set((state) => ({ customerInvites: [...state.customerInvites, invite] }));
        return invite;
      },

      logout: () => set({ user: null, isLoggedIn: false }),
      setUser: (user) => set({ user, isLoggedIn: !!user }),

      verifySuperAdminSignupPassword: (pwd) =>
        pwd === SUPER_ADMIN_SIGNUP_PASSWORD,

      signUpAsSuperAdmin: (userData, pwd) => {
        if (pwd !== SUPER_ADMIN_SIGNUP_PASSWORD) return false;
        const user: User = {
          id: crypto.randomUUID(),
          ...userData,
          role: "super_admin",
          shopId: null,
        };
        set((state) => ({
          registeredUsers: [...state.registeredUsers, user],
          user,
          isLoggedIn: true,
          autoLogin: true,
        }));
        return true;
      },

      getShopsForCurrentUser: () => {
        const { user, registeredShops } = get();
        if (!user) return [];
        if (user.role === "super_admin") return registeredShops;
        if (user.shopId) {
          return registeredShops.filter((s) => s.id === user.shopId);
        }
        return [];
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.autoLogin ? state.user : null,
        isLoggedIn: state.autoLogin ? state.isLoggedIn : false,
        autoLogin: state.autoLogin,
        registeredUsers: state.registeredUsers,
        registeredShops: state.registeredShops,
        invites: state.invites,
        customerInvites: state.customerInvites,
      }),
    }
  )
);
