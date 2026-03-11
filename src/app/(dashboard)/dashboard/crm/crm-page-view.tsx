"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrmExcelUpload } from "@/components/reports/crm-excel-upload";
import { CrmUploadDropdown } from "@/components/reports/crm-upload-dropdown";
import {
  INFLOW_OPTIONS,
  type Consultation,
  type CrmSummarySheet,
  type CrmFormState,
} from "./crm-types";

const CONSULTATIONS_PER_PAGE = 50;

export type CrmPageViewProps = {
  error: string | null;
  canSelectShop: boolean;
  shops: Array<{ id: string; name: string }>;
  shopId: string;
  selectedShopId: string;
  setSelectedShopId: React.Dispatch<React.SetStateAction<string>>;
  summaryMonth: string;
  setSummaryMonth: React.Dispatch<React.SetStateAction<string>>;
  summaryLoading: boolean;
  summarySheet: CrmSummarySheet;
  form: CrmFormState;
  setForm: React.Dispatch<React.SetStateAction<CrmFormState>>;
  submitConsultation: () => void | Promise<void>;
  submitting: boolean;
  filterStatus: string;
  setFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  consultations: Consultation[];
  updateStatus: (id: string, activation_status: "O" | "△" | "X") => void | Promise<void>;
  moveToReport: (id: string) => void | Promise<void>;
  consultationsInMonth: Consultation[];
  pendingInMonth: Consultation[];
  /** 상담 파일 가져오기 성공 시 목록 새로고침 */
  onImportSuccess?: () => void;
  /** 초대된 판매사가 있는지 여부 */
  hasInvitedStaff?: boolean;
};

export function CrmPageView(props: CrmPageViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(props.consultations.length / CONSULTATIONS_PER_PAGE));
  const pageConsultations = useMemo(
    () =>
      props.consultations.slice(
        (page - 1) * CONSULTATIONS_PER_PAGE,
        page * CONSULTATIONS_PER_PAGE
      ),
    [props.consultations, page]
  );

  useEffect(() => {
    setPage(1);
  }, [props.consultations.length, props.filterStatus]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectAllOnPage = () => {
    const ids = pageConsultations.map((c) => c.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    };
  const clearSelection = () => setSelectedIds([]);
  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allOnPageSelected =
    pageConsultations.length > 0 &&
    pageConsultations.every((c) => selectedIds.includes(c.id));
  const someOnPageSelected = pageConsultations.some((c) => selectedIds.includes(c.id));

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  /** 페이지네이션에 표시할 번호들 (많을 때는 현재 주변 + 처음/끝) */
  const paginationNumbers = useMemo(() => {
    const maxVisible = 9;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const result: (number | "ellipsis")[] = [];
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) {
      result.push(1);
      if (start > 2) result.push("ellipsis");
    }
    for (let i = start; i <= end; i++) result.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) result.push("ellipsis");
      result.push(totalPages);
    }
    return result;
  }, [totalPages, page]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">상담(CRM)</h1>
          <p className="mt-2 text-muted-foreground">
            상단: 월별 요약(목표/실적/잔여/일평균) + 유입·개통 통계. 상담 등록·목록·개통여부(O/△/X) 관리. O → 판매일보 이동.
          </p>
        </div>
        {props.canSelectShop && props.shops.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">매장 선택</label>
            <select
              value={props.selectedShopId}
              onChange={(e) => props.setSelectedShopId(e.target.value)}
              className="flex h-9 min-w-[12rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {props.shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {props.error && (
        <p className="text-sm text-destructive" role="alert">{props.error}</p>
      )}

      {props.shopId && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">파일에서 고객 데이터 가져오기</CardTitle>
              <CardDescription>
                엑셀/CSV 고객 명부를 업로드하면 상담(CRM)으로 등록됩니다. 개통(O)으로 표시한 건만 판매일보로 이동할 수 있습니다.
              </CardDescription>
            </div>
            <CrmUploadDropdown shopId={props.shopId} onSuccess={props.onImportSuccess} />
          </CardHeader>
          <CardContent>
            <CrmExcelUpload shopId={props.shopId} onSuccess={props.onImportSuccess} />
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">상담 등록</CardTitle>
          <CardDescription>고객 상담을 등록합니다. 개통 후 O로 변경하고 판매일보로 이동할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">고객명 *</label>
              <Input
                value={props.form.name}
                onChange={(e) => props.setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="고객명"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">연락처</label>
              <Input
                value={props.form.phone}
                onChange={(e) => props.setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="연락처"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">상품명</label>
              <Input
                value={props.form.product_name}
                onChange={(e) => props.setForm((prev) => ({ ...prev, product_name: e.target.value }))}
                placeholder="상품명"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">상담일</label>
              <Input
                type="date"
                value={props.form.consultation_date}
                onChange={(e) => props.setForm((prev) => ({ ...prev, consultation_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {props.hasInvitedStaff && (
              <div className="space-y-2">
                <label className="text-sm font-medium">담당</label>
                <Input
                  value={props.form.sales_person}
                  onChange={(e) => props.setForm((prev) => ({ ...prev, sales_person: e.target.value }))}
                  placeholder="담당자"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">유입</label>
              <select
                value={props.form.inflow_type}
                onChange={(e) => props.setForm((prev) => ({ ...prev, inflow_type: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">선택</option>
                {INFLOW_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">개통여부</label>
            <div className="flex gap-2">
              {(["O", "△", "X"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={props.form.activation_status === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => props.setForm((prev) => ({ ...prev, activation_status: status }))}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">메모</label>
            <Input
              value={props.form.memo}
              onChange={(e) => props.setForm((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="메모"
            />
          </div>
          <Button onClick={props.submitConsultation} disabled={props.submitting}>
            {props.submitting ? "등록 중…" : "등록"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">상담 목록</CardTitle>
            <CardDescription>
              개통여부(O/△/X)를 변경하거나, O인 경우 판매일보로 이동할 수 있습니다.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted-foreground">개통여부</label>
            <select
              value={props.filterStatus}
              onChange={(e) => props.setFilterStatus(e.target.value)}
              className="flex h-9 min-w-[6rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">전체</option>
              <option value="O">O</option>
              <option value="△">△</option>
              <option value="X">X</option>
            </select>
            {props.consultations.length > 0 && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={selectAllOnPage}>
                  전체선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedIds.length === 0}
                >
                  선택해제
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!props.shopId ? (
            <p className="text-sm text-muted-foreground">매장을 선택하세요.</p>
          ) : props.loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : props.consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">상담이 없습니다.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="border-b border-border/60 bg-muted/60">
                    <tr>
                      <th className="w-10 px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          ref={selectAllCheckboxRef}
                          checked={allOnPageSelected}
                          onChange={() =>
                            allOnPageSelected
                              ? setSelectedIds((prev) => prev.filter((id) => !pageConsultations.some((c) => c.id === id)))
                              : selectAllOnPage()
                          }
                          className="h-4 w-4 rounded border-input"
                          aria-label="현재 페이지 전체선택"
                        />
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">고객명</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">연락처</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">상담일</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">유입</th>
                      {props.hasInvitedStaff && <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">담당</th>}
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">개통여부</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">동작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageConsultations.map((c) => (
                      <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="w-10 px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleOne(c.id)}
                            className="h-4 w-4 rounded border-input"
                            aria-label={`${c.name} 선택`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{c.name}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{c.phone ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{c.consultation_date?.slice(0, 10) ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{c.inflow_type ?? "—"}</td>
                        {props.hasInvitedStaff && <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{c.sales_person ?? "—"}</td>}
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex gap-1">
                            {(["O", "△", "X"] as const).map((status) => (
                              <Button
                                key={status}
                                type="button"
                                variant={c.activation_status === status ? "default" : "outline"}
                                size="sm"
                                className="min-w-8"
                                onClick={() => props.updateStatus(c.id, status)}
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {c.activation_status === "O" && !c.report_id && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => props.moveToReport(c.id)}
                            >
                              판매일보 이동
                            </Button>
                          )}
                          {c.report_id && (
                            <span className="text-xs text-muted-foreground">이동 완료</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">
                  {(page - 1) * CONSULTATIONS_PER_PAGE + 1}–
                  {Math.min(page * CONSULTATIONS_PER_PAGE, props.consultations.length)} / {props.consultations.length}건
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {paginationNumbers.map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-sm text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        type="button"
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                        className="min-w-[2rem]"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {props.shopId && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">이번 달 연관</CardTitle>
              <CardDescription>
                선택 월({props.summaryMonth})의 상담 건수와 활성화 대기(△) 건수입니다.
              </CardDescription>
            </div>
            <Link href="/dashboard/scheduled" className={buttonVariants({ variant: "outline", size: "sm" })}>
              예정건 보기
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold tabular-nums">{props.consultationsInMonth.length}건</p>
                <p className="text-xs text-muted-foreground">이번 달 상담</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {props.pendingInMonth.length}건
                </p>
                <p className="text-xs text-muted-foreground">활성화 대기(△)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
