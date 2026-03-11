/**
 * 매장 설정 페이지
 * 
 * 역할:
 * - 매장별 마진 정책 설정
 * - 실적 목표 설정
 * - 매장 정보 관리
 * 
 * 접근 권한:
 * - tenant_admin: 본인 매장 설정만 가능
 * - super_admin: 모든 매장 설정 가능
 * - staff: 접근 불가 (대시보드로 리다이렉트)
 * 
 * @file page.tsx
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/client/store/useAuthStore";
import type { ReportImportConfig } from "@/lib/report-entry-map";

interface ShopSettingsDto {
  shop_id: string;
  margin_rate_pct: number;
  sales_target_monthly: number;
  per_sale_incentive: number;
  report_import_config?: ReportImportConfig | null;
  updated_at?: string;
}

const MARGIN_SUM_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: "faceAmount", label: "액면" },
  { key: "verbalA", label: "구두 A" },
  { key: "verbalB", label: "구두 B" },
  { key: "verbalC", label: "구두 C" },
  { key: "verbalD", label: "구두 D" },
  { key: "verbalE", label: "구두 E" },
  { key: "verbalF", label: "구두 F" },
  { key: "officialSubsidy", label: "공시지원" },
  { key: "supportAmount", label: "지원금" },
];

/**
 * 매장 설정 페이지 컴포넌트
 *
 * 매장주·지점장·슈퍼 어드민이 매장별 마진률, 실적 목표, 건당 인센티브를 설정합니다.
 */
export default function ShopSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const getShopsForCurrentUser = useAuthStore((s) => s.getShopsForCurrentUser);

  const canManage = user?.role === "tenant_admin" || user?.role === "super_admin";
  const shops = getShopsForCurrentUser();
  const canSelectShop = user?.role === "super_admin";
  const [selectedShopId, setSelectedShopId] = useState("");
  const [settings, setSettings] = useState<ShopSettingsDto | null>(null);
  const [columnMappingText, setColumnMappingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canManage) {
      router.replace("/dashboard");
      return;
    }
  }, [user, canManage, router]);

  useEffect(() => {
    if (!user || !canManage || selectedShopId) return;
    if (canSelectShop && shops[0]) setSelectedShopId(shops[0].id);
    else if (user.shopId) setSelectedShopId(user.shopId);
  }, [user, canManage, canSelectShop, shops, selectedShopId]);

  const loadSettings = useCallback(async (shopId: string) => {
    if (!shopId || !user) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "x-user-role": user.role,
      };
      if (user.shopId) headers["x-user-shop-id"] = user.shopId;
      const res = await fetch(`/api/shop-settings?shop_id=${encodeURIComponent(shopId)}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettings(json as ShopSettingsDto);
        const cfg = (json as ShopSettingsDto).report_import_config?.columnMapping;
        setColumnMappingText(
          cfg && typeof cfg === "object"
            ? JSON.stringify(cfg, null, 2)
            : ""
        );
      } else {
        setSettings(null);
        setColumnMappingText("");
      }
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedShopId) loadSettings(selectedShopId);
    else setSettings(null);
  }, [selectedShopId, loadSettings]);

  const setReportImportConfig = useCallback((update: Partial<ReportImportConfig> | null) => {
    setSettings((prev) => {
      if (!prev) return prev;
      if (update === null) return { ...prev, report_import_config: null };
      const next = { ...(prev.report_import_config ?? {}), ...update };
      return { ...prev, report_import_config: next };
    });
  }, []);

  const buildReportImportConfig = useCallback((): ReportImportConfig | null => {
    let columnMapping: Record<string, string> | undefined;
    const trimmed = columnMappingText.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const m: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string") m[String(k).trim()] = v.trim();
          }
          columnMapping = Object.keys(m).length ? m : undefined;
        }
      } catch {
        columnMapping = settings?.report_import_config?.columnMapping;
      }
    } else {
      columnMapping = settings?.report_import_config?.columnMapping;
    }
    const marginFormula = settings?.report_import_config?.marginFormula;
    const marginSumFields = settings?.report_import_config?.marginSumFields?.length
      ? settings.report_import_config.marginSumFields
      : undefined;
    if (!columnMapping && !marginFormula && !marginSumFields?.length) {
      return null;
    }
    return {
      columnMapping,
      marginFormula,
      marginSumFields,
    };
  }, [columnMappingText, settings?.report_import_config]);

  const handleSave = async () => {
    if (!selectedShopId || !user || !settings) return;
    setSaving(true);
    setToast(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-role": user.role,
      };
      if (user.shopId) headers["x-user-shop-id"] = user.shopId;
      const reportImportConfig = buildReportImportConfig();
      const body: Record<string, unknown> = {
        shop_id: selectedShopId,
        margin_rate_pct: settings.margin_rate_pct,
        sales_target_monthly: settings.sales_target_monthly,
        per_sale_incentive: settings.per_sale_incentive,
        report_import_config: reportImportConfig,
      };
      const res = await fetch("/api/shop-settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettings((prev) => (prev ? { ...prev, ...json } : null));
        setToast({ type: "success", text: "저장되었습니다." });
      } else {
        setToast({ type: "error", text: (json?.error as string) ?? "저장에 실패했습니다." });
      }
    } catch {
      setToast({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !canManage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        접근 권한을 확인 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          매장 설정
        </h1>
        <p className="mt-1 text-muted-foreground">
          본인 매장의 마진 정책, 실적 목표 등을 설정합니다. 판매사에게는 이 메뉴가 보이지 않습니다.
        </p>
      </div>

      {(user.role === "tenant_admin" && user.shopId) || user.role === "super_admin" ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{user.role === "tenant_admin" ? "내 매장" : "매장 목록"}</CardTitle>
            <CardDescription>
              {user.role === "tenant_admin"
                ? "현재 로그인한 매장주 계정의 소속 매장입니다."
                : "설정할 매장을 선택하세요."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canSelectShop && shops.length > 1 ? (
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              shops.map((s) => (
                <p key={s.id} className="font-medium text-foreground">{s.name}</p>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {selectedShopId && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>매장 마진·실적 설정</CardTitle>
            <CardDescription>
              이 매장에만 적용되는 마진률, 월 실적 목표, 건당 인센티브입니다. 판매일보 급여 계산에 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            ) : settings ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="margin_rate">마진 반영률 (%)</Label>
                    <Input
                      id="margin_rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={settings.margin_rate_pct}
                      onChange={(e) => setSettings((s) => s ? { ...s, margin_rate_pct: Number(e.target.value) || 0 } : null)}
                    />
                    <p className="text-xs text-muted-foreground">마진의 N%를 급여에 반영 (0~100)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="per_sale">건당 인센티브 (원)</Label>
                    <Input
                      id="per_sale"
                      type="number"
                      min={0}
                      value={settings.per_sale_incentive}
                      onChange={(e) => setSettings((s) => s ? { ...s, per_sale_incentive: Number(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales_target">월 실적 목표 (건수)</Label>
                  <Input
                    id="sales_target"
                    type="number"
                    min={0}
                    value={settings.sales_target_monthly}
                    onChange={(e) => setSettings((s) => s ? { ...s, sales_target_monthly: Number(e.target.value) || 0 } : null)}
                  />
                </div>
                {toast && (
                  <p className={`text-sm ${toast.type === "success" ? "text-green-600" : "text-destructive"}`}>
                    {toast.text}
                  </p>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">설정을 불러올 수 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedShopId && settings && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${advancedOpen ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            고급 설정 (엑셀 가져오기 커스터마이징)
          </button>

          {advancedOpen && (
            <Card className="border-border/80 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">엑셀 가져오기 설정</CardTitle>
                <CardDescription>
                  대부분의 엑셀 파일은 자동으로 인식됩니다. 헤더가 인식되지 않을 때만 아래에서 수동 매핑을 설정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="column_mapping">컬럼 매핑 (선택)</Label>
                  <textarea
                    id="column_mapping"
                    className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={'{"엑셀 헤더명": "내부필드"}\n예: {"고객명":"name","연락처":"phone","판매일":"saleDate","마진":"margin"}'}
                    value={columnMappingText}
                    onChange={(e) => setColumnMappingText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    엑셀 첫 행 헤더명을 내부 필드로 매핑하는 JSON. 비워두면 자동 매핑을 사용합니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>마진 계산</Label>
                  <p className="text-xs text-muted-foreground">
                    엑셀에 마진 컬럼이 있으면 기본으로 그 값을 사용합니다. 필요 시 아래에서 계산 방식을 변경할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="margin_formula"
                        checked={(settings.report_import_config?.marginFormula ?? null) === null}
                        onChange={() => setReportImportConfig({ marginFormula: undefined, marginSumFields: undefined })}
                      />
                      기본 (액면 + 구두 A~F)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="margin_formula"
                        checked={settings.report_import_config?.marginFormula === "use_column"}
                        onChange={() => setReportImportConfig({ marginFormula: "use_column", marginSumFields: undefined })}
                      />
                      엑셀 마진 컬럼만 사용
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="margin_formula"
                        checked={settings.report_import_config?.marginFormula === "sum_fields"}
                        onChange={() =>
                          setReportImportConfig({
                            marginFormula: "sum_fields",
                            marginSumFields: settings.report_import_config?.marginSumFields ?? ["faceAmount", "verbalA", "verbalB", "verbalC", "verbalD", "verbalE", "verbalF"],
                          })
                        }
                      />
                      지정 필드 합산
                    </label>
                  </div>
                  {settings.report_import_config?.marginFormula === "sum_fields" && (
                    <div className="mt-2 flex flex-wrap gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                      {MARGIN_SUM_FIELD_OPTIONS.map(({ key, label }) => {
                        const list = settings.report_import_config?.marginSumFields ?? [];
                        const checked = list.includes(key);
                        return (
                          <label key={key} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked ? list.filter((x) => x !== key) : [...list, key];
                                setReportImportConfig({ marginSumFields: next.length ? next : undefined });
                              }}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
