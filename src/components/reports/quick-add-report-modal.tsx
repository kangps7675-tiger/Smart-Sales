"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useReportsStore } from "@/client/store/useReportsStore";
import { usePolicyStore } from "@/client/store/usePolicyStore";
import type { ReportEntry } from "@/client/store/useReportsStore";

type AdditionalDiscount = { id: string; name: string; amount: number };

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
  serialNumber: "",
  factoryPrice: 0,
  officialSubsidy: 0,
  installmentPrincipal: 0,
  installmentMonths: 0,
  faceAmount: 0,
  verbalA: 0,
  verbalB: 0,
  verbalC: 0,
  verbalD: 0,
  verbalE: 0,
  verbalF: 0,
  inspectionStore: "",
  inspectionOffice: "",
  welfare: "",
  insurance: "",
  card: "",
  combined: "",
  lineType: "",
  saleType: "",
  activationTime: "",
  additionalDiscountIds: [],
  additionalDiscountAmount: 0,
};

interface QuickAddReportModalProps {
  open: boolean;
  onClose: () => void;
  shopId: string;
  hasInvitedStaff?: boolean;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-border/60 pb-1 text-sm font-semibold text-foreground">{children}</h3>
  );
}

export function QuickAddReportModal({ open, onClose, shopId, hasInvitedStaff }: QuickAddReportModalProps) {
  const addEntries = useReportsStore((s) => s.addEntries);
  const [form, setForm] = useState<QuickAddReportPayload>({ ...emptyForm, shopId });
  const [discounts, setDiscounts] = useState<AdditionalDiscount[]>([]);
  const [discountDropdowns, setDiscountDropdowns] = useState<string[]>([""]);

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm, shopId, saleDate: todayStr() });
    setDiscountDropdowns([""]);
  }, [shopId]);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (open && shopId) setForm((prev) => ({ ...prev, shopId }));
  }, [open, shopId]);

  useEffect(() => {
    if (!open || !shopId) return;
    fetch(`/api/additional-discounts?shop_id=${encodeURIComponent(shopId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setDiscounts(Array.isArray(list) ? list : []))
      .catch(() => setDiscounts([]));
  }, [open, shopId]);

  useEffect(() => {
    if (!open || !form.productName?.trim()) return;
    const { devicePolicies, planPolicies } = usePolicyStore.getState();
    let margin = 0;
    const productName = form.productName.trim();
    const planName = (form.planName ?? "").trim();
    const device = devicePolicies.find((d) => productName.includes(d.name));
    if (device) margin += device.defaultSubsidy ?? 0;
    const plan = planPolicies.find((p) => p.name === planName || planName.includes(p.name));
    if (plan) margin += plan.rebate ?? 0;
    setForm((prev) => ({ ...prev, margin }));
  }, [open, form.productName, form.planName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    const selectedIds = discountDropdowns.filter((id) => id !== "");
    const additionalDiscountAmount = selectedIds.reduce((sum, id) => {
      const d = discounts.find((x) => x.id === id);
      return sum + (d?.amount ?? 0);
    }, 0);
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
      serialNumber: form.serialNumber?.trim() ?? "",
      factoryPrice: Number(form.factoryPrice) || 0,
      officialSubsidy: Number(form.officialSubsidy) || 0,
      installmentPrincipal: Number(form.installmentPrincipal) || 0,
      installmentMonths: Number(form.installmentMonths) || 0,
      faceAmount: Number(form.faceAmount) || 0,
      verbalA: Number(form.verbalA) || 0,
      verbalB: Number(form.verbalB) || 0,
      verbalC: Number(form.verbalC) || 0,
      verbalD: Number(form.verbalD) || 0,
      verbalE: Number(form.verbalE) || 0,
      verbalF: Number(form.verbalF) || 0,
      inspectionStore: form.inspectionStore?.trim() ?? "",
      inspectionOffice: form.inspectionOffice?.trim() ?? "",
      welfare: form.welfare?.trim() ?? "",
      insurance: form.insurance?.trim() ?? "",
      card: form.card?.trim() ?? "",
      combined: form.combined?.trim() ?? "",
      lineType: form.lineType?.trim() ?? "",
      saleType: form.saleType?.trim() ?? "",
      activationTime: form.activationTime?.trim() ?? "",
      additionalDiscountIds: selectedIds,
      additionalDiscountAmount,
    };
    addEntries([entry]);
    onClose();
  };

  const update = (key: keyof QuickAddReportPayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const numUpdate = (key: keyof QuickAddReportPayload) => (e: React.ChangeEvent<HTMLInputElement>) => {
    update(key, e.target.value ? Number(e.target.value) : 0);
  };

  const textUpdate = (key: keyof QuickAddReportPayload) => (e: React.ChangeEvent<HTMLInputElement>) => {
    update(key, e.target.value);
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
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden shadow-xl"
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
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── 기본 정보 ── */}
            <SectionTitle>기본 정보</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {hasInvitedStaff && (
                <div className="space-y-1">
                  <FieldLabel htmlFor="qa-salesPerson">판매사</FieldLabel>
                  <Input id="qa-salesPerson" value={form.salesPerson ?? ""} onChange={textUpdate("salesPerson")} placeholder="담당 판매사" className="h-9" />
                </div>
              )}
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-saleDate">판매일</FieldLabel>
                <Input id="qa-saleDate" type="date" value={form.saleDate ?? ""} onChange={textUpdate("saleDate")} className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-activationTime">개통 시간</FieldLabel>
                <Input id="qa-activationTime" value={form.activationTime ?? ""} onChange={textUpdate("activationTime")} placeholder="예: 14:30" className="h-9" />
              </div>
            </div>

            {/* ── 고객 정보 ── */}
            <SectionTitle>고객 정보</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-name">고객명</FieldLabel>
                <Input id="qa-name" value={form.name} onChange={textUpdate("name")} placeholder="고객명" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-phone">연락처</FieldLabel>
                <Input id="qa-phone" value={form.phone} onChange={textUpdate("phone")} placeholder="010-0000-0000" className="h-9" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-birthDate">생년월일</FieldLabel>
                <Input id="qa-birthDate" value={form.birthDate} onChange={textUpdate("birthDate")} placeholder="YYYY-MM-DD" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-path">유입경로</FieldLabel>
                <Input id="qa-path" value={form.path} onChange={textUpdate("path")} placeholder="유입 경로" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-existingCarrier">통신사</FieldLabel>
                <Input id="qa-existingCarrier" value={form.existingCarrier} onChange={textUpdate("existingCarrier")} placeholder="기존 통신사" className="h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="qa-address">주소</FieldLabel>
              <Input id="qa-address" value={form.address} onChange={textUpdate("address")} placeholder="주소" className="h-9" />
            </div>

            {/* ── 기기·요금제 ── */}
            <SectionTitle>기기 · 요금제</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-productName">모델 (개통단말기)</FieldLabel>
                <Input id="qa-productName" value={form.productName} onChange={textUpdate("productName")} placeholder="예: iPhone 16 128GB" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-serialNumber">일련번호</FieldLabel>
                <Input id="qa-serialNumber" value={form.serialNumber ?? ""} onChange={textUpdate("serialNumber")} placeholder="일련번호" className="h-9" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-planName">요금제</FieldLabel>
                <Input id="qa-planName" value={form.planName ?? ""} onChange={textUpdate("planName")} placeholder="요금제명" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-saleType">유형</FieldLabel>
                <Input id="qa-saleType" value={form.saleType ?? ""} onChange={textUpdate("saleType")} placeholder="번호이동/기기변경" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-lineType">유무선</FieldLabel>
                <Input id="qa-lineType" value={form.lineType ?? ""} onChange={textUpdate("lineType")} placeholder="유선/무선" className="h-9" />
              </div>
            </div>

            {/* ── 금액·마진 ── */}
            <SectionTitle>금액 · 마진</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-amount">금액</FieldLabel>
                <Input id="qa-amount" type="number" min={0} value={form.amount || ""} onChange={numUpdate("amount")} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-margin">판매마진</FieldLabel>
                <Input id="qa-margin" type="number" value={form.margin ?? ""} onChange={numUpdate("margin")} placeholder="0" className="h-9" />
                <p className="text-xs text-muted-foreground">정책·단가가 자동 반영됩니다</p>
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-supportAmount">지원금</FieldLabel>
                <Input id="qa-supportAmount" type="number" min={0} value={form.supportAmount ?? ""} onChange={numUpdate("supportAmount")} placeholder="0" className="h-9" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-factoryPrice">출고가</FieldLabel>
                <Input id="qa-factoryPrice" type="number" min={0} value={form.factoryPrice || ""} onChange={numUpdate("factoryPrice")} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-officialSubsidy">공시지원</FieldLabel>
                <Input id="qa-officialSubsidy" type="number" min={0} value={form.officialSubsidy || ""} onChange={numUpdate("officialSubsidy")} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-faceAmount">액면</FieldLabel>
                <Input id="qa-faceAmount" type="number" min={0} value={form.faceAmount || ""} onChange={numUpdate("faceAmount")} placeholder="0" className="h-9" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-installmentPrincipal">할부원금</FieldLabel>
                <Input id="qa-installmentPrincipal" type="number" min={0} value={form.installmentPrincipal || ""} onChange={numUpdate("installmentPrincipal")} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-installmentMonths">할부 개월수</FieldLabel>
                <Input id="qa-installmentMonths" type="number" min={0} value={form.installmentMonths || ""} onChange={numUpdate("installmentMonths")} placeholder="0" className="h-9" />
              </div>
            </div>

            {/* ── 구두 A~F ── */}
            <SectionTitle>구두 A ~ F</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["verbalA", "verbalB", "verbalC", "verbalD", "verbalE", "verbalF"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <FieldLabel htmlFor={`qa-${key}`}>{key.replace("verbal", "구두 ")}</FieldLabel>
                  <Input id={`qa-${key}`} type="number" value={form[key] || ""} onChange={numUpdate(key)} placeholder="0" className="h-9" />
                </div>
              ))}
            </div>

            {/* ── 검수·부가 ── */}
            <SectionTitle>검수 · 부가</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-inspectionStore">매장 검수</FieldLabel>
                <Input id="qa-inspectionStore" value={form.inspectionStore ?? ""} onChange={textUpdate("inspectionStore")} className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-inspectionOffice">사무실 검수</FieldLabel>
                <Input id="qa-inspectionOffice" value={form.inspectionOffice ?? ""} onChange={textUpdate("inspectionOffice")} className="h-9" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-welfare">복지</FieldLabel>
                <Input id="qa-welfare" value={form.welfare ?? ""} onChange={textUpdate("welfare")} className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-insurance">보험</FieldLabel>
                <Input id="qa-insurance" value={form.insurance ?? ""} onChange={textUpdate("insurance")} className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-card">카드</FieldLabel>
                <Input id="qa-card" value={form.card ?? ""} onChange={textUpdate("card")} className="h-9" />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="qa-combined">결합</FieldLabel>
                <Input id="qa-combined" value={form.combined ?? ""} onChange={textUpdate("combined")} className="h-9" />
              </div>
            </div>

            {/* ── 추가 할인 ── */}
            <SectionTitle>추가 할인</SectionTitle>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {discountDropdowns.map((selectedId, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <select
                      value={selectedId}
                      onChange={(e) => {
                        const next = [...discountDropdowns];
                        next[idx] = e.target.value;
                        setDiscountDropdowns(next);
                      }}
                      className="flex h-9 min-w-[10rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">선택 안 함</option>
                      {discounts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (-{Number(d.amount).toLocaleString()}원)
                        </option>
                      ))}
                    </select>
                    {discountDropdowns.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground"
                        aria-label="이 할인 제거"
                        onClick={() => setDiscountDropdowns((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setDiscountDropdowns((prev) => [...prev, ""])}>
                  + 추가
                </Button>
              </div>
              {discounts.length === 0 && (
                <p className="text-xs text-muted-foreground">추가 할인 메뉴에서 항목을 등록하면 여기서 선택할 수 있습니다.</p>
              )}
            </div>

            {/* ── 하단 버튼 ── */}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
