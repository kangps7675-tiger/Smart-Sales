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
import { parseExcelToReportEntries } from "@/lib/excel-report";
import type { ReportEntry } from "@/client/store/useReportsStore";
import { useReportsStore } from "@/client/store/useReportsStore";
import { usePolicyStore } from "@/client/store/usePolicyStore";
import { cn } from "@/lib/utils";

interface ExcelUploadProps {
  shopId: string;
  onParsed?: (entries: Omit<ReportEntry, "id" | "uploadedAt">[], errors: string[]) => void;
}

const ACCEPT = ".xlsx,.xls";
const ACCEPT_LIST = [".xlsx", ".xls"];

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

export function ExcelUpload({ shopId, onParsed }: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
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
        showToast("error", "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.");
        return;
      }
      setFile(selectedFile);
      setFileHash(null);
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

  const analyzeAndSave = async () => {
    if (!file || !shopId) {
      showToast("error", "파일을 선택한 뒤 데이터 분석하기를 눌러주세요.");
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      // 파일 해시 계산 (SHA-256) 후 중복 업로드인지 서버에 확인
      let hash = fileHash;
      if (!hash) {
        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(digest));
        hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        setFileHash(hash);
      }

      try {
        const dupRes = await fetch("/api/reports/check-duplicate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_hash: hash,
            shop_id: shopId,
          }),
        });
        const dupJson = await dupRes.json().catch(() => ({} as any));
        if (dupRes.status === 409 || dupJson?.duplicate) {
          showToast("error", "이미 업로드한 파일입니다. 중복 업로드를 방지하기 위해 처리하지 않았습니다.");
          setLoading(false);
          return;
        }
      } catch (dupErr) {
        console.error("[Reports] 중복 업로드 체크 실패", dupErr);
        // 중복 체크 실패 시에도 업로드 자체는 계속 진행
      }

      const { entries: rawEntries, errors } = await parseExcelToReportEntries(file, shopId);
      const entries = fillMarginsFromPolicy(rawEntries);

      if (entries.length > 0) {
        useReportsStore.getState().addEntries(entries);
        showToast(
          "success",
          `${entries.length}건을 불러왔습니다. 마진은 정책 단가로 자동 반영되었습니다.`
        );
        onParsed?.(entries, errors);
      }
      if (errors.length > 0) {
        showToast("error", errors.join(" "));
      }
      if (entries.length === 0 && errors.length === 0) {
        showToast(
          "error",
          "추출된 데이터가 없습니다. 첫 행에 헤더가 있는지 확인해 주세요."
        );
      }
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
          엑셀 파일을 여기에 놓거나, 아래 버튼으로 선택하세요.
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

      {/* 선택된 파일명 + 데이터 분석하기 */}
      {file && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]" title={file.name}>
            {file.name}
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={analyzeAndSave} disabled={loading}>
              {loading ? "분석 중…" : "데이터 분석하기"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearFile} disabled={loading}>
              취소
            </Button>
          </div>
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
