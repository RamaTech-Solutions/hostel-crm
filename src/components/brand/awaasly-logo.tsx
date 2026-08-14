import { cn } from "@/lib/utils";
import { AwaaslyMark } from "@/components/brand/awaasly-mark";

const sizes = {
  sm: { mark: "h-[28px] w-auto translate-y-px", word: "text-[17px] leading-none", tag: "text-[10px] leading-tight", gap: "gap-2.5" },
  md: { mark: "h-9 w-auto translate-y-px", word: "text-xl leading-none", tag: "text-xs", gap: "gap-2.5" },
  lg: { mark: "h-12 w-auto", word: "text-2xl leading-none", tag: "text-sm", gap: "gap-3" },
} as const;

type LogoVariant = "primary" | "reversed" | "monoDark" | "monoLight" | "icon" | "stacked";
type LogoSize = keyof typeof sizes;

const markFill: Record<LogoVariant, string> = {
  primary: "#F4B942",
  reversed: "#F4B942",
  monoDark: "#24221F",
  monoLight: "#FFF9EC",
  icon: "#F4B942",
  stacked: "#F4B942",
};

const wordClass: Record<LogoVariant, string> = {
  primary: "text-foreground",
  reversed: "text-sidebar-foreground",
  monoDark: "text-foreground",
  monoLight: "text-[#FFF9EC]",
  icon: "text-foreground",
  stacked: "text-foreground",
};

export function AwaaslyLogo({
  variant = "primary",
  size = "md",
  showTagline = false,
  className,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  showTagline?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  const mark = <AwaaslyMark className={s.mark} fill={markFill[variant]} />;

  if (variant === "icon") {
    return mark;
  }

  const wordmark = (
    <span className="flex min-w-0 flex-col justify-center">
      <span className={cn("font-semibold tracking-tight", s.word, wordClass[variant])}>Awaasly</span>
      {showTagline ? (
        <span className={cn("mt-0.5 font-normal text-muted-foreground", s.tag)}>Every property. One place.</span>
      ) : null}
    </span>
  );

  if (variant === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center text-center", s.gap, className)}>
        {mark}
        {wordmark}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      {mark}
      {wordmark}
    </span>
  );
}
