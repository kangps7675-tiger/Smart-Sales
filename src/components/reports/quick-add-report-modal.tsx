/**
 * 판매일보 한 건 직접 입력 (Quick Add) 모달
 *
 * useReportsStore의 ReportEntry 구조와 동일한 필드를 입력받아
 * 저장 시 addEntries로 한 건 추가 후 리스트에 즉시 반영됩니다.
 *
 * @file quick-add-report-modal.tsx
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useReportsStore } from "@/client/store/useReportsStore";
import type { ReportEntry } from "@/client/store/useReportsStore";

export type QuickAddReportPayload = Omit<ReportEntry, "id" | "uploadedAt">;

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm: QuickAddReportPayload = {
  shopId: "",
  name: "",
  phone: "",
  birthDate: "",
  address: "",
  path: "",
  existingCarrier: "",
  saleDate: todayStr(),
  productName: "",
  amount: 0,
  margin: 0,
  salesPerson: "",
  planName: "",
  supportAmount: 0,
};

interface QuickAddReportModalProps {
  open: boolean;
  onClose: () => void;
  shopId: string;
}

export function QuickAddReportModal({ open, onClose, shopId }: QuickAddReportModalProps) {
  const addEntries = useReportsStore((s) => s.addEntries);
  const [form, setForm] = useState<QuickAddReportPayload>({ ...emptyForm, shopId });

  const resetForm = useCallback(() => {
    setForm({
      ...emptyForm,
      shopId,
      saleDate: todayStr(),
    });
  }, [shopId]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (open && shopId) {
      setForm((prev) => ({ ...prev, shopId }));
    }
  }, [open, shopId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    const entry: QuickAddReportPayload = {
      ...form,
      shopId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      birthDate: form.birthDate.trim(),
      address: form.address.trim(),
      path: form.path.trim(),
      existingCarrier: form.existingCarrier.trim(),
      saleDate: form.saleDate.trim() || todayStr(),
      productName: form.productName.trim(),
      amount: Number(form.amount) || 0,
      margin: Number(form.margin) || 0,
      salesPerson: form.salesPerson?.trim() ?? "",
      planName: form.planName?.trim() ?? "",
      supportAmount: Number(form.supportAmount) || 0,
    };
    addEntries([entry]);
    onClose();
  };

  const update = (key: keyof QuickAddReportPayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-report-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle id="quick-add-report-title" className="text-lg font-semibold">
            판매일보 한 건 추가
          </CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="닫기">
            닫기
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="quick-salesPerson" className="text-sm font-medium text-muted-foreground">
                  판매사
                </label>
                <Input
                  id="quick-salesPerson"
                  value={form.salesPerson ?? ""}
                  onChange={(e) => update("salesPerson", e.target.value)}
                  placeholder="담당 판매사"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quick-saleDate" className="text-sm font-medium text-muted-foreground">
                  판매일
                </label>
                <Input
                  id="quick-saleDate"
                  type="date"
                  value={form.saleDate ?? ""}
                  onChange={(e) => update("saleDate", e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="quick-name" className="text-sm font-medium text-muted-foreground">
                  고객명
                </label>
                <Input
                  id="quick-name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="고객명"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quick-phone" className="text-sm font-medium text-muted-foreground">
                  연락처
                </label>
                <Input
                  id="quick-phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="010-0000-0000"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="quick-productName" className="text-sm font-medium text-muted-foreground">
                개통단말기
              </label>
              <Input
                id="quick-productName"
                value={form.productName}
                onChange={(e) => update("productName", e.target.value)}
                placeholder="예: iPhone 16 128GB"
                className="h-9"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="quick-existingCarrier" className="text-sm font-medium text-muted-foreground">
                  통신사
                </label>
                <Input
                  id="quick-existingCarrier"
                  value={form.existingCarrier}
                  onChange={(e) => update("existingCarrier", e.target.value)}
                  placeholder="기존 통신사"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quick-planName" className="text-sm font-medium text-muted-foreground">
                  요금제
                </label>
                <Input
                  id="quick-planName"
                  value={form.planName ?? ""}
                  onChange={(e) => update("planName", e.target.value)}
                  placeholder="요금제명"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="quick-amount" className="text-sm font-medium text-muted-foreground">
                  금액
                </label>
                <Input
                  id="quick-amount"
                  type="number"
                  min={0}
                  value={form.amount || ""}
                  onChange={(e) => update("amount", e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quick-margin" className="text-sm font-medium text-muted-foreground">
                  마진
                </label>
                <Input
                  id="quick-margin"
                  type="number"
                  value={form.margin || ""}
                  onChange={(e) => update("margin", e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quick-supportAmount" className="text-sm font-medium text-muted-foreground">
                  지원금
                </label>
                <Input
                  id="quick-supportAmount"
                  type="number"
                  min={0}
                  value={form.supportAmount ?? ""}
                  onChange={(e) => update("supportAmount", e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="quick-birthDate" className="text-sm font-medium text-muted-foreground">
                  생년월일
                </label>
                <Input
                  id="quick-birthDate"
                  value={form.birthDate}
                  onChange={(e) => update("birthDate", e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quick-path" className="text-sm font-medium text-muted-foreground">
                  유입경로
                </label>
                <Input
                  id="quick-path"
                  value={form.path}
                  onChange={(e) => update("path", e.target.value)}
                  placeholder="유입 경로"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="quick-address" className="text-sm font-medium text-muted-foreground">
                주소
              </label>
              <Input
                id="quick-address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="주소"
                className="h-9"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
