/**
 * 테마 프로바이더 컴포넌트
 * 
 * 역할:
 * - next-themes의 ThemeProvider를 래핑
 * - 다크 모드 / 라이트 모드 상태 관리
 * - 시스템 테마 자동 감지 지원
 * 
 * @file theme-provider.tsx
 */

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type Props = { children: React.ReactNode };

/**
 * 테마 프로바이더 컴포넌트
 * 
 * next-themes의 ThemeProvider를 래핑하여
 * 앱 전체에서 테마 상태를 관리합니다.
 * 
 * 설정:
 * - attribute: "class" - 테마를 class 속성으로 적용
 * - defaultTheme: "system" - 기본값은 시스템 설정 따름
 * - enableSystem: true - 시스템 테마 자동 감지 활성화
 * 
 * @param children - 테마 프로바이더로 감쌀 컴포넌트
 */
export function ThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
