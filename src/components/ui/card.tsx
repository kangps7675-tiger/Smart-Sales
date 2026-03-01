/**
 * Card 컴포넌트
 * 
 * 역할:
 * - 재사용 가능한 카드 UI 컴포넌트 세트
 * - 콘텐츠를 카드 형태로 표시하는 컨테이너
 * 
 * 구성 요소:
 * - Card: 카드 컨테이너
 * - CardHeader: 카드 헤더 영역
 * - CardTitle: 카드 제목
 * - CardDescription: 카드 설명
 * - CardContent: 카드 본문 내용
 * - CardFooter: 카드 푸터 영역
 * 
 * @file card.tsx
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card 컴포넌트
 * 
 * 카드 컨테이너로, 다른 Card 하위 컴포넌트들을 감싸는 역할을 합니다.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * CardHeader 컴포넌트
 * 
 * 카드의 헤더 영역으로, 제목과 설명을 포함합니다.
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-3 px-6 pt-6 pb-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * CardTitle 컴포넌트
 * 
 * 카드의 제목을 표시하는 컴포넌트입니다.
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * CardDescription 컴포넌트
 * 
 * 카드의 설명 텍스트를 표시하는 컴포넌트입니다.
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * CardContent 컴포넌트
 * 
 * 카드의 본문 내용을 표시하는 영역입니다.
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pt-7 pb-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

/**
 * CardFooter 컴포넌트
 * 
 * 카드의 푸터 영역으로, 버튼이나 추가 정보를 표시할 때 사용합니다.
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center px-6 pb-6 pt-0 mt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
