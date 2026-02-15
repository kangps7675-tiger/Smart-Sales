"use client";

import { cn } from "@/lib/utils";

const wrapper = "flex items-center justify-center rounded-t-lg bg-muted/50 p-8";

export function IlluSmartQuote({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path className="text-primary/70" d="M20 90V50h20v40H20zM50 90V30h20v60H50zM80 90V45h20v45H80zM110 90V60h20v30h-20z" />
        <path className="text-muted-foreground/60" d="M20 50l15-25 15 15 15-20 15 10" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function IlluCrm({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="50" cy="45" r="18" className="text-primary/60" />
        <circle cx="110" cy="55" r="14" className="text-primary/40" />
        <circle cx="75" cy="85" r="12" className="text-primary/40" />
        <path className="text-muted-foreground/50" d="M65 58l20 12M68 75l18-8" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function IlluReport({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="30" y="25" width="100" height="70" rx="4" className="text-primary/30 stroke-primary/60" />
        <path d="M45 50h70M45 65h50M45 80h35" className="text-muted-foreground/50" strokeWidth="1.2" />
        <path d="M30 95l15-15 20 20 25-30 25 15" className="text-primary/70" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function IlluPolicy({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="80" cy="50" r="28" className="text-primary/20 stroke-primary/50" />
        <path d="M80 35v30M65 50h30" className="text-primary/60" />
        <path d="M50 85h60M55 95h50M60 105h40" className="text-muted-foreground/40" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function IlluWizard({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <circle cx={32 + i * 24} cy="55" r="12" className={i < 3 ? "stroke-primary/60 text-primary/20" : "stroke-muted-foreground/30"} />
            {i < 4 && <path d={`M${44 + i * 24} 55h${i === 2 ? 4 : 16}`} className="text-muted-foreground/30" strokeWidth="1.2" />}
          </g>
        ))}
        <path d="M32 85h96" className="text-primary/40" strokeWidth="2" strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

export function IlluMultiShop({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="25" y="45" width="35" height="50" rx="3" className="text-primary/30 stroke-primary/50" />
        <rect x="70" y="35" width="35" height="60" rx="3" className="text-primary/40 stroke-primary/60" />
        <rect x="115" y="50" width="30" height="45" rx="3" className="text-primary/20 stroke-primary/40" />
        <path d="M42 70h21M77 58h21M122 72h16" className="text-muted-foreground/40" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function IlluFast({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="80" cy="55" r="35" className="text-primary/20 stroke-primary/50" />
        <path d="M80 28v27l18 18" className="text-primary/60" strokeWidth="2" />
        <path d="M55 55h50M80 30v50" className="text-muted-foreground/30" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    </div>
  );
}

export function IlluTransparent({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="40" y="40" width="80" height="45" rx="4" className="text-primary/20 stroke-primary/50" />
        <path d="M55 58h50M55 68h35M55 78h45" className="text-muted-foreground/50" />
        <path d="M70 35l10 15-10 10 5 8" className="text-primary/60" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function IlluSummary({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M35 45h90v55H35z" rx="3" className="text-primary/20 stroke-primary/50" />
        <path d="M50 62h60M50 75h45M50 88h55" className="text-muted-foreground/40" strokeWidth="1.2" />
        <circle cx="115" cy="82" r="12" className="text-primary/50 stroke-primary/70" />
        <path d="M110 82l4 4 8-8" className="text-primary" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function IlluContinue({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="45" cy="55" r="22" className="text-primary/30 stroke-primary/50" />
        <circle cx="115" cy="55" r="22" className="text-primary/30 stroke-primary/50" />
        <path d="M67 55h38" className="text-primary/50" strokeWidth="2" />
        <path d="M95 45l20 10-20 10" className="text-primary/60" strokeWidth="1.5" />
        <path d="M45 85v15M115 85v15" className="text-muted-foreground/30" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function IlluSimpleChoice({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        {[40, 65, 90].map((y, i) => (
          <g key={i}>
            <rect x="35" y={y} width="90" height="18" rx="3" className="text-primary/10 stroke-primary/40" />
            <circle cx="50" cy={y + 9} r="5" className={i === 0 ? "fill-primary/50 stroke-primary/70" : "stroke-muted-foreground/30"} />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function IlluConsistent({ className }: { className?: string }) {
  return (
    <div className={cn(wrapper, "min-h-[200px] sm:min-h-[240px]", className)}>
      <svg viewBox="0 0 160 120" className="h-32 w-full max-w-xs sm:h-40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M80 25l25 15v30l-25 15-25-15V40z" className="text-primary/20 stroke-primary/50" />
        <path d="M72 55l8 8 16-16" className="text-primary/70" strokeWidth="2" />
        <circle cx="80" cy="85" r="18" className="text-primary/10 stroke-primary/40" />
        <path d="M75 85l4 4 8-8" className="text-primary/60" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

const dealerIllustrations = [IlluSmartQuote, IlluCrm, IlluReport, IlluPolicy, IlluWizard, IlluMultiShop];
const customerIllustrations = [IlluFast, IlluTransparent, IlluSummary, IlluContinue, IlluSimpleChoice, IlluConsistent];

export function FeatureIllustration({ type, index }: { type: "dealer" | "customer"; index: number }) {
  const List = type === "dealer" ? dealerIllustrations : customerIllustrations;
  const Illu = List[index] ?? List[0];
  return <Illu />;
}
