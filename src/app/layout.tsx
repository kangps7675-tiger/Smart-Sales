/**
 * 루트 레이아웃 컴포넌트
 * 
 * 역할:
 * - 전체 앱의 최상위 레이아웃
 * - 폰트 설정 (Geist Sans, Geist Mono)
 * - 테마 프로바이더 설정 (다크 모드 지원)
 * - 전역 CSS 적용
 * 
 * @file layout.tsx
 */

import type { Metadata } from "next";
import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalErrorSetup } from "@/components/global-error-setup";
import { NavigationLoading } from "@/components/navigation-loading";
import "./globals.css";

/**
 * 본문·UI용 sans 폰트 (로컬 폰트 의존 제거로 500 방지)
 */
const geistSans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * 코드·숫자용 mono 폰트
 */
const geistMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500"],
  display: "swap",
});

/**
 * 페이지 메타데이터
 * SEO 및 브라우저 탭 제목에 사용됩니다.
 */
export const metadata: Metadata = {
  title: "휴대폰 매장 통합 관리",
  description: "상담·견적·판매 일보를 한 흐름으로 연결하는 통합 관리 시스템",
};

/**
 * 루트 레이아웃 컴포넌트
 * 
 * 모든 페이지의 공통 레이아웃을 제공합니다.
 * 
 * @param children - 페이지 컴포넌트
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
        suppressHydrationWarning
      >
        <GlobalErrorSetup />
        <ThemeProvider>
          <NavigationLoading />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
