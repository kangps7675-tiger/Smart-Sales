"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractState } from "@/client/store/useContractStore";
import { MOCK_ADDONS, MOCK_PLANS } from "@/client/store/useContractStore";

const DEFAULT_INSTALLMENTS = 24;

export interface DailyReportEntry extends ContractState {
  savedAt: string;
}

function getMonthlyPayment(entry: ContractState): number {
  const planMatch = MOCK_PLANS.find((p) => p.name === entry.plan.planName);
  const monthlyFee = planMatch?.monthlyFee ?? 0;
  const installments = entry.plan.installments > 0 ? entry.plan.installments : DEFAULT_INSTALLMENTS;
  const monthlyDevice = installments > 0 ? Math.round(entry.settlement.finalPrice / installments) : 0;
  const addOnMonthly = entry.discount.addOnServices.reduce((sum, id) => {
    const addon = MOCK_ADDONS.find((a) => a.id === id);
    const price = addon?.price ?? 0;
    return sum + (price > 0 ? Math.round(price / 12) : 0);
  }, 0);
  return monthlyDevice + monthlyFee + addOnMonthly;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

interface DailyReportModalProps {
  entries: DailyReportEntry[];
  onClose: () => void;
}

export function DailyReportModal({ entries, onClose }: DailyReportModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-report-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle id="daily-report-title" className="text-lg font-semibold">
            오늘의 판매 일보
          </CardTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            ×
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95">
              <tr>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">No.</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">등록</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">고객명</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">연락처</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">모델</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">요금제</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground text-right">할부원금</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground text-right">월납부</th>
                <th className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground text-right">마진</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border-b border-border px-3 py-6 text-center text-muted-foreground">
                    아직 저장된 건이 없습니다.
                  </td>
                </tr>
              ) : (
                entries.map((entry, i) => (
                  <tr key={entry.contract_id} className="border-b border-border/80 hover:bg-muted/50">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatTime(entry.savedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{entry.customer.name || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-muted-foreground">{entry.customer.phone || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {entry.device.model && entry.device.capacity
                        ? `${entry.device.model} ${entry.device.capacity}`
                        : entry.device.model || "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-muted-foreground">{entry.plan.planName || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {entry.settlement.finalPrice > 0 ? `${entry.settlement.finalPrice.toLocaleString()}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">
                      {getMonthlyPayment(entry) > 0 ? `${getMonthlyPayment(entry).toLocaleString()}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-primary">
                      {entry.settlement.margin !== 0 ? `${entry.settlement.margin.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
        <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
          총 {entries.length}건 · 엑셀처럼 한눈에 정리됩니다 (추후 엑셀 내보내기 지원 예정)
        </div>
      </Card>
    </div>
  );
}
