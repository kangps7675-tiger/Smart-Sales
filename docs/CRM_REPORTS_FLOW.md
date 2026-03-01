# CRM·예정건·판매일보 연동

상담(CRM), 예정건, 판매일보가 각자 역할을 유지하면서 하나의 시스템으로 동작하는 방식을 정리합니다.

## 개통여부 O / △ / X

| 값 | 의미 | 동작 |
|----|------|------|
| **X** | 미개통 | CRM에만 유지. 예정건·판매일보에 노출되지 않음. |
| **△** | 예정건 | CRM 목록에서 개통여부를 △로 두면, **예정건** 페이지(`/dashboard/scheduled`)에서 `activation_status=△` 필터로 같은 데이터를 조회해 표시. (행 이동/삭제 없음, 필터 뷰) |
| **O** | 개통 | **판매일보 이동** 버튼으로 `move-to-report` 호출 시, `reports` 테이블에 한 건 생성되고 해당 상담에 `report_id`가 연결됨. |

## 데이터 흐름

- **CRM → 예정건**: 동일 `crm_consultations` 테이블을 예정건 페이지에서 `activation_status=△`로만 조회.
- **CRM O → 판매일보**: move-to-report API가 `reports` 한 건 insert 후 `crm_consultations.report_id` 업데이트.
- **엑셀 업로드 → 판매일보**: 엑셀 파싱 후 `POST /api/reports`로 `reports`에 저장. 동시에 `crm_customers` 테이블에 고객 자동 수집(upsert)됨.

## CRM 상단 요약·그래프

CRM 페이지 상단의 **월별 요약**과 **일별 실적 그래프**는 **판매일보(reports)** 데이터를 기반으로 합니다.  
엑셀 업로드로 적재된 건수와 매장 설정의 월 목표를 합산해 목표/실적/잔여/일평균과 일별 막대 그래프로 표시됩니다.

## 유입 통계 · 개통 통계

- **유입 통계**: CRM 상담 등록 시 선택한 **유입**(로드/컨택/전화/온라인/지인)과 **상담일** 기준으로 일별·월 합계·비율(%)이 자동 집계됩니다. `crm_consultations.inflow_type` 사용.
- **개통 통계**: **판매일보(reports)**의 `sale_date`·`path`(유입경로)를 5개 유형으로 매핑해 같은 형식으로 일별·계·%가 자동 반영됩니다.
- CRM 페이지에서 **월 선택**과 동일한 월로 두 표가 갱신되며, 상담/판매일보 입력만 하면 별도 작업 없이 통계표에 반영됩니다.

## 관련 파일

- CRM 페이지: `src/app/(dashboard)/dashboard/crm/page.tsx`
- 예정건 페이지: `src/app/(dashboard)/dashboard/scheduled/page.tsx`
- 판매일보 API: `src/app/api/reports/route.ts`
- move-to-report: `src/app/api/crm/consultations/[id]/move-to-report/route.ts`
