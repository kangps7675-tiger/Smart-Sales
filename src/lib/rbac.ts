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
  { label: "판매 일보", href: "/dashboard/reports" },
  { label: "공지게시판", href: "/dashboard/notices" },
  { label: "판매사 초대·관리", href: "/dashboard/staff", tenantAdminOrAbove: true },
  { label: "정책/단가 관리", href: "/dashboard/policies", superAdminOnly: true },
  { label: "매장 설정", href: "/dashboard/shop-settings", tenantAdminOrAbove: true, hideFromStaff: true },
  { label: "새 계약·상담", href: "/dashboard/contract/new" },
  { label: "시스템 관리", href: "/dashboard/admin", superAdminOnly: true },
  { label: "설정", href: "/dashboard/settings" },
];

/**
 * 사용자 역할에 따라 접근 가능한 네비게이션 메뉴 필터링
 * 
 * 역할별 접근 규칙:
 * - super_admin: 모든 메뉴 접근 가능
 * - tenant_admin: superAdminOnly가 아닌 메뉴 + tenantAdminOrAbove 메뉴 접근 가능
 * - staff: hideFromStaff가 false인 메뉴 접근 가능
 * 
 * 직원용 SaaS: 매장주(tenant_admin)·판매사(staff)·본사(super_admin)만 사용.
 * 
 * @param role - 사용자 역할 (undefined면 빈 배열 반환)
 * @returns 접근 가능한 네비게이션 메뉴 배열
 */
export function getNavItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => {
    // 슈퍼 어드민 전용 메뉴는 슈퍼 어드민만 접근 가능
    if (item.superAdminOnly && role !== "super_admin") return false;
    // 판매사에게도 표시되는 메뉴는 판매사도 접근 가능
    if (item.staffVisible && role === "staff") return true;
    // 매장주 이상 전용 메뉴는 매장주와 슈퍼 어드민만 접근 가능
    if (item.tenantAdminOrAbove && role !== "tenant_admin" && role !== "super_admin") return false;
    // 판매사에게 숨김 메뉴는 판매사가 접근 불가
    if (item.hideFromStaff && role === "staff") return false;
    return true;
  });
}
