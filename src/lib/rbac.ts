import type { Role } from "@/client/store/useAuthStore";

export interface NavItem {
  label: string;
  href: string;
  superAdminOnly?: boolean;
  tenantAdminOrAbove?: boolean;
  hideFromStaff?: boolean;
  /** 판매사도 메뉴 노출 (예: 고객 초대) */
  staffVisible?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "/dashboard" },
  { label: "고객 관리", href: "/dashboard/customers" },
  { label: "판매 일보", href: "/dashboard/reports" },
  { label: "공지게시판", href: "/dashboard/notices" },
  { label: "판매사 초대·관리", href: "/dashboard/staff", tenantAdminOrAbove: true },
  { label: "고객 초대", href: "/dashboard/customer-invite", tenantAdminOrAbove: true, staffVisible: true },
  { label: "매장 설정", href: "/dashboard/shop-settings", tenantAdminOrAbove: true, hideFromStaff: true },
  { label: "새 계약·상담", href: "/dashboard/contract/new" },
  { label: "시스템 관리", href: "/dashboard/admin", superAdminOnly: true },
  { label: "설정", href: "/dashboard/settings" },
];

export function getNavItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && role !== "super_admin") return false;
    if (item.staffVisible && role === "staff") return true;
    if (item.tenantAdminOrAbove && role !== "tenant_admin" && role !== "super_admin") return false;
    if (item.hideFromStaff && role === "staff") return false;
    return true;
  });
}
