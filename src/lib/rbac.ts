/**
 * 역할 기반 접근 제어 (RBAC) 유틸리티
 * 
 * 역할:
 * - 네비게이션 메뉴 항목 정의
 * - 사용자 역할에 따른 메뉴 필터링
 * 
 * @file rbac.ts
 */

import type { Role } from "@/client/store/useAuthStore";

/**
 * 네비게이션 메뉴 항목 인터페이스
 */
export interface NavItem {
  label: string;              // 메뉴 표시명
  href: string;               // 링크 경로
  superAdminOnly?: boolean;   // 슈퍼 어드민만 표시
  tenantAdminOrAbove?: boolean; // 매장주 이상만 표시 (tenant_admin, super_admin)
  hideFromStaff?: boolean;    // 판매사에게 숨김
  /** 판매사도 메뉴 노출 */
  staffVisible?: boolean;     // 판매사에게도 표시 (기본적으로는 tenant_admin 이상만 표시)
}

export const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "/dashboard" },
  { label: "고객 관리", href: "/dashboard/customers" },
  { label: "상담(CRM)", href: "/dashboard/crm" },
  { label: "예정건", href: "/dashboard/scheduled" },
  { label: "캘린더", href: "/dashboard/calendar" },
  { label: "판매 일보", href: "/dashboard/reports" },
  { label: "공지게시판", href: "/dashboard/notices" },
  { label: "판매사 초대·관리", href: "/dashboard/staff", tenantAdminOrAbove: true },
  { label: "정책/단가 관리", href: "/dashboard/policies", tenantAdminOrAbove: true },
  { label: "매장 설정", href: "/dashboard/shop-settings", tenantAdminOrAbove: true, hideFromStaff: true },
  { label: "새 계약·상담", href: "/dashboard/contract/new" },
  { label: "시스템 관리", href: "/dashboard/admin", superAdminOnly: true },
  { label: "설정", href: "/dashboard/settings" },
];

/**
 * 역할별 메뉴 접근: super_admin(본사) / region_manager(지점장) / tenant_admin(매장주) / staff(판매사)
 */
const TENANT_OR_ABOVE: Role[] = ["tenant_admin", "region_manager", "super_admin"];

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
