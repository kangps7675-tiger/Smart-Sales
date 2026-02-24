/**
 * Input 컴포넌트
 * 
 * 역할:
 * - 재사용 가능한 입력 필드 UI 컴포넌트
 * - 일관된 스타일링 및 접근성 지원
 * 
 * @file input.tsx
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input 컴포넌트
 * 
 * 표준화된 입력 필드 컴포넌트입니다.
 * HTML input 요소의 모든 속성을 지원하며, 일관된 스타일을 제공합니다.
 * 
 * 특징:
 * - 포커스 시 링 표시
 * - 플레이스홀더 스타일링
 * - 비활성화 상태 지원
 * 
 * @example
 * <Input type="text" placeholder="이름을 입력하세요" />
 * <Input type="email" disabled />
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
