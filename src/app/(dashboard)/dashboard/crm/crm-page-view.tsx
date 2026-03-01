"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INFLOW_OPTIONS,
  type InflowType,
  type Consultation,
  type StatsPayload,
  type CrmSummarySheet,
  type CrmFormState,
} from "./crm-types";

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
  statsLoading: boolean;
  statsData: StatsPayload | null;
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
};

export function CrmPageView(props: CrmPageViewProps) {
  const hasGoal = props.summarySheet.goal > 0;

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
        <>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">월별 요약</CardTitle>
                <CardDescription>
                  목표 대비 실적, 잔여, 일평균 목표·실적입니다. 월 목표는 매장 설정에서 입력합니다.
                </CardDescription>
              </div>
              <Input
                type="month"
                value={props.summaryMonth}
                onChange={(e) => props.setSummaryMonth(e.target.value)}
                className="w-40"
              />
            </CardHeader>
            <CardContent>
              {props.summaryLoading ? (
                <p className="text-sm text-muted-foreground">불러오는 중…</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-2 text-left font-medium text-muted-foreground">목표(건)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">실적(건)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">잔여(건)</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">일평균 목표</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">일평균 실적</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/30">
                          <td className="py-2 tabular-nums">
                            {hasGoal ? `${props.summarySheet.goal}건` : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums">{props.summarySheet.actual}건</td>
                          <td className="py-2 text-right tabular-nums">
                            {hasGoal ? `${props.summarySheet.remain}건` : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {hasGoal ? `${props.summarySheet.avgGoalPerDay.toFixed(1)}건` : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {props.summarySheet.avgActualPerDay.toFixed(1)}건
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {props.summaryMonth.slice(0, 4)}년 {props.summaryMonth.slice(5, 7)}월 기준 · 경과 {props.summarySheet.elapsedDays}일 / {props.summarySheet.daysInMonth}일
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">유입/개통 통계</CardTitle>
              <CardDescription>
                선택 월의 상담 유입·개통(판매일보) 건수입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {props.statsLoading ? (
                <p className="text-sm text-muted-foreground">불러오는 중…</p>
              ) : props.statsData ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-2 text-left font-medium text-muted-foreground">유입</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">건수</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">비율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {props.statsData.inflow.rows.map((r) => (
                          <tr key={r.label} className="border-b border-border/30">
                            <td className="py-2">{r.label}</td>
                            <td className="py-2 text-right tabular-nums">{r.total}</td>
                            <td className="py-2 text-right tabular-nums">{r.percent}%</td>
                          </tr>
                        ))}
                        <tr className="border-b border-border/30 font-medium">
                          <td className="py-2">합계</td>
                          <td className="py-2 text-right tabular-nums">{props.statsData.inflow.totalRow.total}</td>
                          <td className="py-2 text-right tabular-nums">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-2 text-left font-medium text-muted-foreground">개통</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">건수</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">비율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {props.statsData.activation.rows.map((r) => (
                          <tr key={r.label} className="border-b border-border/30">
                            <td className="py-2">{r.label}</td>
                            <td className="py-2 text-right tabular-nums">{r.total}</td>
                            <td className="py-2 text-right tabular-nums">{r.percent}%</td>
                          </tr>
                        ))}
                        <tr className="border-b border-border/30 font-medium">
                          <td className="py-2">합계</td>
                          <td className="py-2 text-right tabular-nums">{props.statsData.activation.totalRow.total}</td>
                          <td className="py-2 text-right tabular-nums">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">담당</label>
              <Input
                value={props.form.sales_person}
                onChange={(e) => props.setForm((prev) => ({ ...prev, sales_person: e.target.value }))}
                placeholder="담당자"
              />
            </div>
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
          <div className="flex items-center gap-2">
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 font-medium text-muted-foreground">고객명</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">연락처</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">상담일</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">유입</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">담당</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">개통여부</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">동작</th>
                  </tr>
                </thead>
                <tbody>
                  {props.consultations.map((c) => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.phone ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{c.consultation_date?.slice(0, 10) ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.inflow_type ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.sales_person ?? "—"}</td>
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2">
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
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/scheduled">예정건 보기</Link>
            </Button>
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
