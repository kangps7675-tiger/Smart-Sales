/**
 * PostCSS 설정 파일
 * 
 * 역할:
 * - CSS 후처리 도구 설정
 * - Tailwind CSS 플러그인 통합
 * 
 * 주요 기능:
 * - Tailwind CSS를 사용하여 유틸리티 클래스 생성
 * - CSS 변수 및 다크 모드 지원
 * 
 * 향후 추가 가능한 플러그인:
 * - autoprefixer: 브라우저 호환성 자동 추가
 * - cssnano: 프로덕션 빌드 시 CSS 최적화
 * 
 * @file postcss.config.mjs
 */

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {}, // Tailwind CSS 플러그인
  },
};

export default config;
