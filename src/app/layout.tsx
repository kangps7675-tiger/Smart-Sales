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
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalErrorSetup } from "@/components/global-error-setup";
import "./globals.css";

/**
 * Geist Sans 폰트 설정
 * 가변 폰트 (100-900 weight)로 다양한 굵기 지원
 */
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

/**
 * Geist Mono 폰트 설정
 * 가변 폰트 (100-900 weight)로 다양한 굵기 지원
 */
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
