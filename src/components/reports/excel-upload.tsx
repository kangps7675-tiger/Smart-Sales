"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseExcelToReportEntries } from "@/lib/excel-report";
import type { ReportEntry } from "@/client/store/useReportsStore";
import { useReportsStore } from "@/client/store/useReportsStore";

interface ExcelUploadProps {
  shopId: string;
  onParsed?: (entries: Omit<ReportEntry, "id" | "uploadedAt">[], errors: string[]) => void;
}

export function ExcelUpload({ shopId, onParsed }: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setMessage({ type: "error", text: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { entries, errors } = await parseExcelToReportEntries(file, shopId);
      if (entries.length > 0) {
        useReportsStore.getState().addEntries(entries);
        setMessage({
          type: "success",
          text: `${entries.length}건의 고객 데이터를 불러왔습니다. 대시보드에 반영됩니다.`,
        });
      }
      if (errors.length > 0) {
        setMessage((prev) => ({
          type: prev ? prev.type : "error",
          text: [prev?.text, ...errors].filter(Boolean).join(" "),
        }));
      }
      if (entries.length === 0 && errors.length === 0) {
        setMessage({ type: "error", text: "추출된 데이터가 없습니다. 첫 행에 헤더(이름, 연락처 등)가 있는지 확인해 주세요." });
      }
      onParsed?.(entries, errors);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
        disabled={loading}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "엑셀 처리 중…" : "판매일보 엑셀 업로드"}
      </Button>
      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
