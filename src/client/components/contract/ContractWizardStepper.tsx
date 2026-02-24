/**
 * 계약 마법사 스테퍼 컴포넌트
 * 
 * 역할:
 * - 계약 생성 과정의 진행 단계를 시각적으로 표시
 * - 현재 단계, 완료된 단계, 남은 단계를 구분하여 표시
 * 
 * 단계 구성:
 * - Step 0: 기본 정보
 * - Step 1: 고객 정보
 * - Step 2: 기기·요금제
 * - Step 3: 할인·부가
 * - Step 4: 정산·저장
 * 
 * @file ContractWizardStepper.tsx
 */

"use client";

/**
 * 계약 마법사 단계 목록
 */
const STEPS = [
  { id: 0, label: "기본 정보" },
  { id: 1, label: "고객 정보" },
  { id: 2, label: "기기·요금제" },
  { id: 3, label: "할인·부가" },
  { id: 4, label: "정산·저장" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/**
 * ContractWizardStepper 컴포넌트 Props
 */
interface ContractWizardStepperProps {
  currentStep: StepId; // 현재 진행 중인 단계 ID
}

/**
 * 계약 마법사 스테퍼 컴포넌트
 * 
 * 계약 생성 과정의 진행 상황을 시각적으로 표시합니다.
 * 현재 단계는 활성화 상태로, 완료된 단계는 체크 표시로 표시됩니다.
 */
export function ContractWizardStepper({ currentStep }: ContractWizardStepperProps) {
  return (
    <nav aria-label="진행 단계" className="w-full">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPast = currentStep > step.id;
          return (
            <li
              key={step.id}
              className="flex flex-1 flex-col items-center last:flex-none"
            >
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isPast ? "bg-primary" : "bg-muted"
                    }`}
                    aria-hidden
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isPast
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background"
                  }`}
                >
                  {isPast ? "✓" : step.id + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isPast ? "bg-primary" : "bg-muted"
                    }`}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium sm:text-sm ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
