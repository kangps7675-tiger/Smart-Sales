"use client";

import Link from "next/link";
import { startNavigation } from "@/components/navigation-loading";

type Props = React.ComponentProps<typeof Link>;

/**
 * 내부 이동 시 클릭 즉시 로딩 바를 표시하는 Link.
 * 랜딩 등 서버 컴포넌트에서 사용합니다.
 */
export function NavLinkWithLoading({ href, onClick, children, ...props }: Props) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        startNavigation();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
