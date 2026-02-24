/**
 * 판매일보 업로드 드롭다운 컴포넌트
 * 
 * 역할:
 * - + 버튼 클릭 시 드롭다운 메뉴 표시
 * - 파일 업로드 및 Google Sheets URL 입력 옵션 제공
 * 
 * @file upload-dropdown.tsx
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseExcelToReportEntries } from "@/lib/excel-report";
import { useReportsStore } from "@/client/store/useReportsStore";

/**
 * UploadDropdown 컴포넌트 Props
 */
interface UploadDropdownProps {
  shopId: string | null; // 판매일보를 등록할 매장 ID (null이면 매장 선택 필요)
  /** 매장이 없을 때 표시할 메시지 */
  noShopMessage?: string;
}

/**
 * 판매일보 업로드 드롭다운 컴포넌트
 * 
 * 드롭다운 메뉴:
 * - 파일 업로드: 기존 ExcelUpload 컴포넌트 사용
 * - Google Sheets URL: URL 입력 후 불러오기 (Phase 2에서 실제 연동 구현)
 */
export function UploadDropdown({ shopId, noShopMessage }: UploadDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showGoogleSheetsInput, setShowGoogleSheetsInput] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  /**
   * 외부 클릭 감지
   * 
   * 드롭다운 외부를 클릭하면 자동으로 닫힙니다.
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowGoogleSheetsInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * 파일 선택 핸들러
   * 
   * 파일이 선택되면:
   * 1. 파일 확장자 검증 (.xlsx, .xls만 허용)
   * 2. 엑셀 파일 파싱
   * 3. 파싱된 데이터를 스토어에 저장
   * 4. 성공/에러 메시지 표시 및 드롭다운 닫기
   * 
   * @param e - 파일 입력 이벤트
   */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 매장 ID 확인
    if (!shopId) {
      setMessage({ type: "error", text: noShopMessage || "매장을 선택해주세요." });
      return;
    }

    // 파일 확장자 검증
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setMessage({ type: "error", text: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다." });
      return;
    }

    setLoading(true);
    setMessage(null);
    setOpen(false); // 파일 선택 시 드롭다운 닫기

    try {
      // 엑셀 파일 파싱
      const { entries, errors } = await parseExcelToReportEntries(file, shopId);
      
      // 파싱된 데이터가 있으면 스토어에 저장
      if (entries.length > 0) {
        useReportsStore.getState().addEntries(entries);
        setMessage({
          type: "success",
          text: `${entries.length}건의 고객 데이터를 불러왔습니다. 대시보드에 반영됩니다.`,
        });
      }
      
      // 에러가 있으면 에러 메시지 추가
      if (errors.length > 0) {
        setMessage((prev) => ({
          type: prev ? prev.type : "error",
          text: [prev?.text, ...errors].filter(Boolean).join(" "),
        }));
      }
      
      // 데이터도 없고 에러도 없으면 안내 메시지 표시
      if (entries.length === 0 && errors.length === 0) {
        setMessage({ type: "error", text: "추출된 데이터가 없습니다. 첫 행에 헤더가 있는지 확인해 주세요." });
      }
    } catch {
      setMessage({ type: "error", text: "파일 처리 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
      // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /**
   * 파일 업로드 버튼 클릭 핸들러
   * 
   * 파일 선택 다이얼로그를 엽니다.
   */
  const handleFileUploadClick = () => {
    if (!shopId) {
      setMessage({ type: "error", text: noShopMessage || "매장을 선택해주세요." });
      return;
    }
    setShowGoogleSheetsInput(false);
    setMessage(null);
    // 파일 선택 다이얼로그 열기
    fileInputRef.current?.click();
  };

  /**
   * Google Sheets URL 불러오기 핸들러
   * 
   * Phase 2에서 실제 Google Sheets API 연동 구현 예정
   * 현재는 UI만 제공합니다.
   */
  const handleLoadGoogleSheets = () => {
    if (!googleSheetsUrl.trim()) {
      alert("Google Sheets URL을 입력해주세요.");
      return;
    }

    // Google Sheets URL에서 시트 ID 추출
    const sheetIdMatch = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      alert("유효한 Google Sheets URL이 아닙니다.\n예: https://docs.google.com/spreadsheets/d/SHEET_ID/edit");
      return;
    }

    const sheetId = sheetIdMatch[1];
    
    // Phase 2: 실제 Google Sheets API 연동 구현 예정
    alert(`Google Sheets 연동 기능은 준비 중입니다.\n시트 ID: ${sheetId}\n\n현재는 파일 업로드를 사용해주세요.`);
    
    // TODO: Phase 2에서 구현
    // 1. Google Sheets API 호출
    // 2. 데이터 파싱
    // 3. useReportsStore에 저장
  };

  return (
    <div className="relative" ref={ref}>
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
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
      
      {/* 성공/에러 메시지 표시 (드롭다운 외부) */}
      {message && !open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-card p-3 shadow-lg">
          <p
            className={`text-sm ${
              message.type === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}
      
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-card p-4 shadow-lg">
          <div className="space-y-3">
            {/* 파일 업로드 옵션 */}
            <div>
              <button
                type="button"
                onClick={handleFileUploadClick}
                disabled={loading || !shopId}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span className="font-medium">
                  {loading ? "처리 중..." : "파일 업로드"}
                </span>
              </button>
              {!shopId && noShopMessage && (
                <p className="mt-2 text-xs text-muted-foreground">{noShopMessage}</p>
              )}
            </div>

            {/* 구분선 */}
            <div className="border-t border-border" />

            {/* Google Sheets URL 옵션 */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleSheetsInput(true);
                }}
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
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLoadGoogleSheets}
                      className="flex-1"
                    >
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
                    공개된 Google Sheets의 URL을 입력하세요. (준비 중)
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
