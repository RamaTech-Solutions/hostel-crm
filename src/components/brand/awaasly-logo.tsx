import { cn } from "@/lib/utils";
import { AwaaslyMark } from "@/components/brand/awaasly-mark";

const sizes = {
  sm: { mark: "h-7 w-6", word: "text-base", tag: "text-[10px]", gap: "gap-2" },
  md: { mark: "h-9 w-8", word: "text-xl", tag: "text-xs", gap: "gap-2.5" },
  lg: { mark: "h-12 w-10", word: "text-2xl", tag: "text-sm", gap: "gap-3" },
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
  monoLight: "text-background",
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
    <span className="flex min-w-0 flex-col">
      <span className={cn("font-semibold tracking-tight", s.word, wordClass[variant])}>Awaasly</span>
      {showTagline ? (
        <span className={cn("font-normal text-muted-foreground", s.tag)}>Every property. One place.</span>
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
