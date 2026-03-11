/**
 * CRM 업로드 드롭다운: 파일 추가 / Google Sheets 링크 추가
 * CRM 업로드 카드 우측 상단에 배치하는 + 버튼
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


const ACCEPT = ".xlsx,.xls,.csv";

interface CrmUploadDropdownProps {
  shopId: string;
  /** 가져오기 성공 시 상담 목록 새로고침 */
  onSuccess?: () => void;
}

export function CrmUploadDropdown({ shopId, onSuccess }: CrmUploadDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showGoogleSheetsInput, setShowGoogleSheetsInput] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowGoogleSheetsInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setMessage({ type: "error", text: "엑셀/CSV 파일(.xlsx, .xls, .csv)만 업로드 가능합니다." });
      return;
    }
    setLoading(true);
    setMessage(null);
    setOpen(false);
    try {
      const form = new FormData();
      form.append("shop_id", shopId);
      form.append("file", file);
      const res = await fetch("/api/crm/import-file", { method: "POST", body: form });
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: (json?.error ?? json?.detail ?? "파일 처리 중 오류가 발생했습니다.") as string,
        });
        return;
      }
      const count = Number(json?.insertedCount ?? 0);
      setMessage({ type: "success", text: `${count.toLocaleString()}건을 상담(CRM)으로 가져왔습니다.` });
      onSuccess?.();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "파일 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUploadClick = () => {
    if (!shopId) {
      setMessage({ type: "error", text: "매장을 선택해주세요." });
      return;
    }
    setShowGoogleSheetsInput(false);
    setMessage(null);
    fileInputRef.current?.click();
  };

  const handleLoadGoogleSheets = async () => {
    if (!shopId) {
      setMessage({ type: "error", text: "매장을 선택해주세요." });
      return;
    }
    if (!googleSheetsUrl.trim()) {
      setMessage({ type: "error", text: "Google Sheets URL을 입력해주세요." });
      return;
    }
    setLoading(true);
    setMessage(null);
    setOpen(false);
    try {
      const res = await fetch("/api/crm/import-google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shopId, url: googleSheetsUrl.trim() }),
      });
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: (json?.error ?? "Google Sheets 불러오기에 실패했습니다.") as string,
        });
        return;
      }
      const count = Number(json?.insertedCount ?? 0);
      setMessage({ type: "success", text: `${count.toLocaleString()}건을 상담(CRM)으로 가져왔습니다.` });
      setGoogleSheetsUrl("");
      setShowGoogleSheetsInput(false);
      onSuccess?.();
    } catch {
      setMessage({ type: "error", text: "Google Sheets 처리 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFile}
        disabled={loading}
      />
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-full p-0"
        aria-expanded={open}
        aria-haspopup="true"
        disabled={loading}
      >
        {loading ? (
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </Button>

      {message && !open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-card p-3 shadow-lg">
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-card p-4 shadow-lg">
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleFileUploadClick}
              disabled={loading || !shopId}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="font-medium">{loading ? "처리 중…" : "파일 업로드"}</span>
            </button>
            <div className="border-t border-border" />
            <div>
              <button
                type="button"
                onClick={() => setShowGoogleSheetsInput(true)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="font-medium">Google Sheets URL</span>
              </button>
              {showGoogleSheetsInput && (
                <div className="mt-3 space-y-2">
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLoadGoogleSheets();
                      }
                    }}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleLoadGoogleSheets} className="flex-1">
                      불러오기
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowGoogleSheetsInput(false);
                        setGoogleSheetsUrl("");
                      }}
                    >
                      취소
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    공개된 Google Sheets URL을 입력하세요. (링크가 있는 모든 사용자에게 공개)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
