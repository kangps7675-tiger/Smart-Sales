"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractWizardStepper } from "@/client/components/contract/ContractWizardStepper";
import {
  DailyReportModal,
  type DailyReportEntry,
} from "@/client/components/contract/DailyReportModal";
import { QuoteSummaryFixedBar } from "@/client/components/contract/QuoteSummaryFixedBar";
import { Step1CustomerWho } from "@/client/components/contract/Step1CustomerWho";
import { Step2DevicePlan } from "@/client/components/contract/Step2DevicePlan";
import { Step3DiscountAddOn } from "@/client/components/contract/Step3DiscountAddOn";
import { useContractStore } from "@/client/store/useContractStore";

const STEP_TITLES = [
  "기본 정보",
  "고객 및 유입 채널 (Who)",
  "기기 및 요금제 선택 (What)",
  "할인 및 부가서비스 (How)",
  "최종 정산 및 저장 (Result)",
] as const;

type StepId = 0 | 1 | 2 | 3 | 4;

export default function ContractNewPage() {
  const [currentStep, setCurrentStep] = useState<StepId>(0);
  const [dailyReport, setDailyReport] = useState<DailyReportEntry[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const totalSteps = 5;
  const getPayload = useContractStore((s) => s.getPayload);
  const reset = useContractStore((s) => s.reset);

  const handleSave = () => {
    const payload = getPayload();
    setDailyReport((prev) => [
      ...prev,
      { ...payload, savedAt: new Date().toISOString() },
    ]);
    setReportModalOpen(true);
    reset();
    setCurrentStep(0);
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => (s + 1) as StepId);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => (s - 1) as StepId);
    }
  };

  const showQuoteBar = currentStep === 2 || currentStep === 3;

  return (
    <div className={`mx-auto max-w-3xl ${showQuoteBar ? "pb-36 sm:pb-40" : ""}`}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          새 개통·상담 등록
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          질문 하나씩, 단계별로—20개 항목을 줄여드립니다. 판매 일보로 자동 반영됩니다.
        </p>
      </header>

      <Card className="mb-6 border-border/80 shadow-sm">
          <CardContent className="pt-6">
            <ContractWizardStepper currentStep={currentStep} />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm" aria-labelledby="step-title">
          <CardHeader className="pb-2">
            <CardTitle id="step-title" className="text-lg font-medium">
              Step {currentStep + 1}. {STEP_TITLES[currentStep]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="min-h-[200px]">
              {currentStep === 0 && (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    사장님, 이게 그 20개 항목을 줄여주는 마법입니다.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    다음 단계부터 질문이 하나씩 나옵니다. 고객 정보 → 기기·요금제 → 할인·부가 → 정산 순으로 입력하세요.
                  </p>
                </div>
              )}
              {currentStep === 1 && <Step1CustomerWho />}
              {currentStep === 2 && <Step2DevicePlan />}
              {currentStep === 3 && <Step3DiscountAddOn />}
              {currentStep === 4 && (
                <p className="text-sm text-muted-foreground">
                  할부·현금완납·리베이트·매장 마진·최종 판매가 확인 후 저장하면 오늘의 판매 일보에 한 줄 추가됩니다.
                </p>
              )}
            </div>

            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
              >
                이전
              </Button>
              {currentStep === totalSteps - 1 ? (
                <Button type="button" onClick={handleSave} size="lg">
                  저장 후 일보에 반영
                </Button>
              ) : (
                <Button type="button" onClick={goNext} size="lg">
                  다음
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      {showQuoteBar && <QuoteSummaryFixedBar />}
      {reportModalOpen && (
        <DailyReportModal
          entries={dailyReport}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </div>
  );
}
