/**
 * Tailwind CSS 설정 파일
 * 
 * 역할:
 * - Tailwind CSS 컴파일 대상 경로 설정
 * - 커스텀 색상 변수 정의 (다크 모드 지원)
 * - 테마 확장 설정
 * 
 * 주요 설정:
 * - content: Tailwind가 스캔할 파일 경로
 * - theme.extend: CSS 변수를 사용한 커스텀 색상 및 테마
 * - plugins: tailwindcss-animate 플러그인 사용
 * 
 * @file tailwind.config.ts
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/client/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        input: "var(--input)",
        border: "var(--border)",
        ring: "var(--ring)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        "sidebar": "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
