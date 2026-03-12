/**
 * 엑셀 파일 업로드 컴포넌트 (바이브 코딩 스타일)
 *
 * - 파일 선택 버튼 + 드래그 앤 드롭
 * - 업로드된 파일명 표시 + "데이터 분석하기" 버튼
 * - xlsx 파싱 → useReportsStore.addEntries (shopId 자동 부여)
 * - 엑셀 헤더(판매사, 고객명, 개통단말기, 통신사, 요금제 등) 매핑
 * - 본사 정책 단가 참조로 마진 자동 계산 (엑셀에 마진 없을 때)
 * - 성공/실패 토스트 알림
 *
 * @file excel-upload.tsx
 */

"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { ReportEntry } from "@/client/store/useReportsStore";
import { useAuthStore } from "@/client/store/useAuthStore";
import { useReportsStore } from "@/client/store/useReportsStore";
import { usePolicyStore } from "@/client/store/usePolicyStore";
import { cn } from "@/lib/utils";


interface ExcelUploadProps {
  shopId: string;
  onParsed?: (entries: Omit<ReportEntry, "id" | "uploadedAt">[], errors: string[]) => void;
  /** 분석 성공 후 호출 (목록 갱신 후, 추출된 고객 목록으로 스크롤 등) */
  onSuccess?: () => void;
  /** 저장 버튼 클릭 핸들러 */
  onSave?: () => void;
  /** 저장 중 여부 */
  saving?: boolean;
}

const ACCEPT = ".xlsx,.xls,.csv";
const ACCEPT_LIST = [".xlsx", ".xls", ".csv"];

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPT_LIST.some((ext) => name.endsWith(ext));
}

/**
 * 정책 단가로 마진 자동 계산 (엑셀에 마진이 없거나 0일 때)
 * - 기기명(productName)으로 디바이스 정책 매칭 → 공시지원금
 * - 요금제명(planName)으로 요금제 정책 매칭 → 리베이트
 * - 마진 = 공시지원금 + 리베이트 (간이)
 */
function fillMarginsFromPolicy(
  entries: Omit<ReportEntry, "id" | "uploadedAt">[]
): Omit<ReportEntry, "id" | "uploadedAt">[] {
  const { devicePolicies, planPolicies } = usePolicyStore.getState();
  return entries.map((e) => {
    if (e.margin != null && e.margin !== 0) return e;
    let margin = 0;
    const productName = (e.productName ?? "").trim();
    const planName = (e.planName ?? "").trim();
    const device = devicePolicies.find((d) => productName.includes(d.name));
    if (device) margin += device.defaultSubsidy ?? 0;
    const plan = planPolicies.find((p) => p.name === planName || planName.includes(p.name));
    if (plan) margin += plan.rebate ?? 0;
    return { ...e, margin };
  });
}

const DEBUG_UPLOAD = typeof window !== "undefined" && process.env.NODE_ENV === "development";
const logUploadDebug = (step: string, payload: Record<string, unknown>) => {
  if (!DEBUG_UPLOAD || typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log("[ExcelUploadDebug]", step, {
    ...payload,
    userAgent: window.navigator.userAgent,
  });
};

export function ExcelUpload({ shopId, onParsed, onSuccess, onSave, saving }: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, []);

  const handleFile = useCallback(
    async (selectedFile: File | null) => {
      if (!selectedFile) return;
      if (!isExcelFile(selectedFile)) {
        showToast("error", "엑셀/CSV 파일(.xlsx, .xls, .csv)만 업로드 가능합니다.");
        logUploadDebug("file:invalid-extension", {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        });
        return;
      }
      logUploadDebug("file:selected", {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      });
      setFile(selectedFile);
    },
    [showToast]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    handleFile(f ?? null);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f ?? null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleClearShopData = async () => {
    if (!shopId) {
      showToast("error", "매장 정보가 없습니다. 다시 로그인해 주세요.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm("이 매장의 판매일보 데이터를 모두 삭제할까요?")
    ) {
      return;
    }

    setLoading(true);
    setToast(null);
    try {
      await useReportsStore.getState().clearByShop(shopId);
      logUploadDebug("clear-shop:success", { shopId });
      showToast("success", "이 매장의 판매일보 데이터를 모두 삭제했습니다.");
    } catch (err) {
      logUploadDebug("clear-shop:error", {
        shopId,
        error: err instanceof Error ? err.message : String(err),
      });
      showToast("error", "데이터 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeAndSave = async () => {
    if (!file || !shopId) {
      showToast("error", "파일을 선택한 뒤 데이터 분석하기를 눌러주세요.");
      return;
    }
    logUploadDebug("analyze:start", {
      shopId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    setLoading(true);
    setToast(null);
    try {
      const form = new FormData();
      form.append("shop_id", shopId);
      form.append("overwrite", "true");
      form.append("file", file);

      const res = await fetch("/api/reports/import-file", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const sampleRows = Array.isArray(json?.debugSampleRows) ? json.debugSampleRows as string[][] : [];
        const sampleNote = sampleRows.length > 0
          ? ` [파일 내용: ${sampleRows.map((r: string[]) => r.join(", ")).join(" | ")}]`
          : "";
        const headersNote =
          !sampleNote && Array.isArray(json?.detectedHeaders) && json.detectedHeaders.length > 0
            ? ` [파일 헤더: ${(json.detectedHeaders as string[]).slice(0, 12).join(", ")}${json.detectedHeaders.length > 12 ? " …" : ""}]`
            : "";
        logUploadDebug("analyze:server-error", {
          shopId,
          fileName: file.name,
          error: json?.error ?? "server error",
          detectedHeaders: json?.detectedHeaders,
          debugSampleRows: json?.debugSampleRows,
        });
        const errMsg = json?.detail
          ? `${json.error ?? "저장 실패"}: ${json.detail}`
          : `${json?.error ?? "파일 처리 중 오류가 발생했습니다."}${sampleNote || headersNote} (총 ${json?.debugTotalRows ?? "?"}행)`;
        showToast("error", errMsg);
        return;
      }

      const role = useAuthStore.getState().user?.role;
      await useReportsStore.getState().loadEntries(shopId, role);

      const insertedCount = Number(json?.insertedCount ?? 0);
      if (json?._debug) {
        console.log("[upload-debug] headerMapping:", json._debug.headerMapping);
        console.log("[upload-debug] productName column:", json._debug.productNameColumn);
        console.log("[upload-debug] sampleProductName:", json._debug.sampleProductName);
        console.log("[upload-debug] dbSampleProductName:", json._debug.dbSampleProductName);
      }
      logUploadDebug("analyze:success", {
        shopId,
        fileName: file.name,
        insertedCount,
      });
      showToast("success", `${insertedCount.toLocaleString()}건이 저장되었습니다.`);
      onParsed?.([], Array.isArray(json?.errors) ? json.errors : []);
      onSuccess?.();
    } catch (err) {
      logUploadDebug("analyze:exception", {
        shopId,
        fileName: file?.name,
        error: err instanceof Error ? err.message : String(err),
      });
      showToast("error", err instanceof Error ? err.message : "엑셀 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearFile = () => {
    setFile(null);
    setToast(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileInputChange}
        disabled={loading}
      />

      {/* 드래그 앤 드롭 + 파일 선택 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"
        )}
      >
        <p className="text-sm text-muted-foreground">
          엑셀/CSV 파일을 여기에 놓거나, 아래 버튼으로 선택하세요.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          파일 선택
        </Button>
      </div>

      {/* 선택된 파일명 + 데이터 분석하기 / 저장 / 취소 */}
      {file && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]" title={file.name}>
            {file.name}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={analyzeAndSave}
              disabled={loading}
              className="transition-all hover:brightness-110 hover:shadow-sm active:scale-[0.97]"
            >
              {loading ? "분석 중…" : "데이터 분석하기"}
            </Button>
            {onSave && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onSave}
                disabled={loading || saving}
                className="border-primary text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm active:scale-[0.97]"
              >
                {saving ? "저장 중…" : "저장"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearFile}
              disabled={loading}
              className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 active:scale-[0.97]"
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* 분석 완료 후에도 항상 삭제 가능 */}
      {shopId && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClearShopData}
            disabled={loading}
            className="text-muted-foreground"
          >
            이 매장 데이터 삭제
          </Button>
          <span className="text-xs text-muted-foreground">
            업로드된 판매일보 데이터를 모두 지웁니다. 분석 전·후 언제든 삭제 가능합니다.
          </span>
        </div>
      )}

      {/* 토스트 알림 */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
            toast.type === "success"
              ? "bg-green-600 text-white dark:bg-green-700"
              : "bg-destructive text-destructive-foreground"
          )}
          role="alert"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
