/**
 * 역할 기반 접근 제어 (RBAC) 유틸리티
 * 
 * @file rbac.ts
 */

import type { Role } from "@/client/store/useAuthStore";

export type NavGroup = "dashboard" | "core" | "extra" | "settings";

export interface NavItem {
  label: string;
  href: string;
  group: NavGroup;
  superAdminOnly?: boolean;
  tenantAdminOrAbove?: boolean;
  hideFromStaff?: boolean;
  staffVisible?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "/dashboard", group: "dashboard" },
  // 핵심 기능
  { label: "판매 일보", href: "/dashboard/reports", group: "core" },
  { label: "상담(CRM)", href: "/dashboard/crm", group: "core" },
  { label: "예정건", href: "/dashboard/scheduled", group: "core" },
  { label: "새 계약·상담", href: "/dashboard/contract/new", group: "core" },
  { label: "고객 관리", href: "/dashboard/customers", group: "core" },
  // 부가 기능
  { label: "월별 요약", href: "/dashboard/summary", group: "extra" },
  { label: "캘린더", href: "/dashboard/calendar", group: "extra" },
  { label: "지출", href: "/dashboard/expenses", group: "extra", staffVisible: true },
  { label: "공지게시판", href: "/dashboard/notices", group: "extra" },
  { label: "추가 할인", href: "/dashboard/discounts", group: "extra", staffVisible: true },
  // 관리/설정
  { label: "판매사 초대·관리", href: "/dashboard/staff", group: "settings", tenantAdminOrAbove: true },
  { label: "정책/단가 관리", href: "/dashboard/policies", group: "settings", tenantAdminOrAbove: true },
  { label: "매장 설정", href: "/dashboard/shop-settings", group: "settings", tenantAdminOrAbove: true, hideFromStaff: true },
  { label: "시스템 관리", href: "/dashboard/admin", group: "settings", superAdminOnly: true },
  { label: "설정", href: "/dashboard/settings", group: "settings" },
];

const TENANT_OR_ABOVE: Role[] = ["tenant_admin", "super_admin"];

export function getNavItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && role !== "super_admin") return false;
    if (item.staffVisible && role === "staff") return true;
    if (item.tenantAdminOrAbove && !TENANT_OR_ABOVE.includes(role)) return false;
    if (item.hideFromStaff && role === "staff") return false;
    return true;
  });
}
