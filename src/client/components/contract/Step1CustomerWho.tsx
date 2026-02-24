/**
 * Step 1: 고객 정보 입력 컴포넌트
 * 
 * 역할:
 * - 토스 스타일의 단계별 질문으로 고객 정보 입력
 * - 한 번에 하나의 질문만 표시하여 사용자 부담 감소
 * 
 * 입력 항목:
 * - 고객명
 * - 연락처
 * - 생년월일
 * 
 * @file Step1CustomerWho.tsx
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useContractStore } from "@/client/store/useContractStore";

/**
 * 고객 정보 입력 질문 목록
 * 
 * 토스처럼 한 질문씩 보여주는 형태로 고객 정보를 입력받습니다.
 */
const QUESTIONS = [
  { key: "name" as const, label: "고객님 성함을 알려주세요.", placeholder: "예: 홍길동" },
  { key: "phone" as const, label: "연락처를 알려주세요.", placeholder: "예: 010-0000-0000" },
  { key: "birthDate" as const, label: "생년월일을 알려주세요.", placeholder: "예: 1990-01-01" },
];

export function Step1CustomerWho() {
  const customer = useContractStore((s) => s.customer);
  const setCustomer = useContractStore((s) => s.setCustomer);
  const [questionIndex, setQuestionIndex] = useState(0);

  const q = QUESTIONS[questionIndex];
  const value =
    q.key === "name"
      ? customer.name
      : q.key === "phone"
        ? customer.phone
        : customer.birthDate;

  const setValue = (v: string) => {
    if (q.key === "name") setCustomer({ name: v });
    else if (q.key === "phone") setCustomer({ phone: v });
    else setCustomer({ birthDate: v });
  };

  const goNext = () => {
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  };

  return (
    <div className="py-4">
      <p className="mb-6 text-xl font-medium text-foreground sm:text-2xl">
        {q.label}
      </p>
      <Input
        type={q.key === "birthDate" ? "date" : "text"}
        placeholder={q.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 text-lg"
        autoFocus
      />
      <div className="mt-8 flex justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={goPrev}
          disabled={questionIndex === 0}
        >
          이전
        </Button>
        <Button type="button" onClick={goNext} disabled={!value.trim()}>
          {questionIndex < QUESTIONS.length - 1 ? "다음" : "완료"}
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        질문 하나씩 입력하면 실수 없이 등록됩니다. ({questionIndex + 1}/{QUESTIONS.length})
      </p>
    </div>
  );
}
