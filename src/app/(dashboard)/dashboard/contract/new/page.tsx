/**
 * 새 계약·상담 등록 라우트
 * 
 * 역할:
 * - /dashboard/contract/new 경로에서 ContractNewPage 컴포넌트를 렌더링
 * - Next.js 라우트와 클라이언트 페이지 컴포넌트 연결
 * 
 * @file page.tsx
 */

import ContractNewPage from "@/client/pages/ContractNewPage";

/**
 * 새 계약·상담 등록 라우트 컴포넌트
 * 
 * Next.js 라우트 파일로, 클라이언트 컴포넌트인 ContractNewPage를 렌더링합니다.
 */
export default function ContractNewRoute() {
  return <ContractNewPage />;
}
