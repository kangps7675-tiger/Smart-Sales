# 권한·매장 연동 단계 정리

- **1단계** (완료): DB(store_groups, shops, profiles), useAuthStore 4단계 권한, rbac, 로그인/가입 API store_group_id, 대시보드·판매일보·직원·매장설정·고객 페이지 지점장 반영, reports/salaries API region_manager
- **2단계** (완료): Reports/Salaries API 지점장 shop_id 지점 소속 검증, GET /api/shops 추가, 로그인 후 매장 목록 DB 동기화

---

## 3단계 (완료) – 가입·매장 DB 일원화

- [x] 매장주 가입 시 API에서 `shops` 테이블에 매장 생성 후 `profiles.shop_id` 연결
- [x] 클라이언트 매장주 가입: `shop_name` 전달, 응답 `shop_id` 사용 (로컬 UUID 제거)

---

## 4단계 (완료) – 정책·설정·관리

- [x] 마진률·실적 목표·건당 인센티브 백엔드: `shop_settings` 테이블 + GET/PATCH `/api/shop-settings`
- [x] shop-settings 페이지: 매장 선택, 폼 저장, 판매일보 급여 계산에 설정 반영
- [x] admin: 매장 목록·구독 현황 테이블 (GET /api/shops)
- [x] 설정 페이지: 계정 요약 + 매장 설정 링크

**실행 필요:** Supabase에서 `scripts/002_shop_settings.sql` 실행 (shop_settings 테이블 생성). `shops.subscription_status` 컬럼은 선택(추가 시 admin에서 구독 상태 표시 가능).

---

## 5단계 – 부가·운영

- [x] Google Sheets URL 불러오기: `/api/reports/import-google-sheets` + UploadDropdown 연동 (공개 CSV)
- [x] 판매일보 CSV 내보내기: Reports 페이지에서 다운로드
- [x] 배포/운영 문서: `docs/DEPLOYMENT.md` (SUPER_ADMIN_SIGNUP_PASSWORD 포함)

---

## 6단계 – 보안 강화 (별도 단계)

- RLS 활성화 및 정책 적용
- 클라이언트 전달 role/shop 헤더 신뢰 제거 (서버 세션/쿠키 기반)
- JWT/세션 방식 개선, 감사 로그 등
