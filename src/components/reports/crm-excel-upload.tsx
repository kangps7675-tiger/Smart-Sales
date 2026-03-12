"use client";

/**
 * CRM용 엑셀 업로드: 파일에서 고객 명부를 읽어 crm_consultations에 등록합니다.
 * 개통(O)된 건만 판매일보로 이동할 수 있습니다. 판매사·매장주·지점장 모두 사용 가능.
 */

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


const ACCEPT = ".xlsx,.xls,.csv";
const ACCEPT_LIST = [".xlsx", ".xls", ".csv"];

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPT_LIST.some((ext) => name.endsWith(ext));
}

interface CrmExcelUploadProps {
  shopId: string;
  /** 가져오기 성공 시 상담 목록 새로고침 등 */
  onSuccess?: () => void;
}

export function CrmExcelUpload({ shopId, onSuccess }: CrmExcelUploadProps) {
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
    (selectedFile: File | null) => {
      if (!selectedFile) return;
      if (!isExcelFile(selectedFile)) {
        showToast("error", "엑셀/CSV 파일(.xlsx, .xls, .csv)만 업로드 가능합니다.");
        return;
      }
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
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const importToCrm = async () => {
    if (!file || !shopId) {
      showToast("error", "파일을 선택한 뒤 가져오기를 눌러주세요.");
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const form = new FormData();
      form.append("shop_id", shopId);
      form.append("file", file);

      const res = await fetch("/api/crm/import-file", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const sampleRows = Array.isArray(json?.debugSampleRows) ? json.debugSampleRows as string[][] : [];
        const sampleNote = sampleRows.length > 0
          ? ` [파일 내용: ${sampleRows.map((r: string[]) => r.join(", ")).join(" | ")}]`
          : "";
        const headersNote =
          !sampleNote && Array.isArray(json?.detectedHeaders) && (json.detectedHeaders as string[]).length > 0
            ? ` [파일 헤더: ${(json.detectedHeaders as string[]).slice(0, 12).join(", ")}…]`
            : "";
        const errMsg =
          json?.detail
            ? `${json.error ?? "저장 실패"}: ${json.detail}`
            : `${String(json?.error ?? "파일 처리 중 오류가 발생했습니다.")}${sampleNote || headersNote} (총 ${json?.debugTotalRows ?? "?"}행)`;
        showToast("error", errMsg);
        return;
      }

      const insertedCount = Number(json?.insertedCount ?? 0);
      showToast("success", `${insertedCount.toLocaleString()}건을 상담(CRM)으로 가져왔습니다. 개통(O)으로 바꾼 뒤 판매일보로 이동하세요.`);
      onSuccess?.();
    } catch (err) {
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

  const handleClearShopCrm = async () => {
    if (!shopId) {
      showToast("error", "매장 정보가 없습니다.");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("이 매장의 상담(CRM) 데이터를 전부 삭제할까요?")) {
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch(`/api/crm/consultations?shop_id=${encodeURIComponent(shopId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        showToast("error", (json?.error as string) ?? "삭제에 실패했습니다.");
        return;
      }
      const deletedCount = Number(json?.deletedCount ?? 0);
      showToast("success", `상담(CRM) 데이터 ${deletedCount.toLocaleString()}건을 삭제했습니다.`);
      onSuccess?.();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
          엑셀/CSV 파일을 여기에 놓거나, 아래 버튼으로 선택하세요. 고객 명부가 상담(CRM)으로 등록됩니다.
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

      {file && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="max-w-[200px] truncate text-sm font-medium text-foreground" title={file.name}>
            {file.name}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={importToCrm}
              disabled={loading}
              className="transition-all hover:brightness-110 hover:shadow-sm active:scale-[0.97]"
            >
              {loading ? "가져오는 중…" : "상담으로 가져오기"}
            </Button>
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

      {shopId && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClearShopCrm}
            disabled={loading}
            className="text-muted-foreground"
          >
            이 매장 상담(CRM) 데이터 전부 삭제
          </Button>
          <span className="text-xs text-muted-foreground">
            업로드·가져오기한 상담 데이터를 모두 지웁니다.
          </span>
        </div>
      )}

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
