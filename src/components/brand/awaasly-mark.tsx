import { cn } from "@/lib/utils";

/** Canonical modular-A paths. Keep identical in public/brand and app/icon.svg. */
export const AWAASLY_MARK_VIEWBOX = "0 0 56 72";

export const AWAASLY_MARK_PATHS = [
  "M28 .5c.6 0 1.2.3 1.5.8l8.2 12.2c.5.8 0 1.8-.9 1.8H19.2c-.9 0-1.4-1-.9-1.8L26.5 1.3C26.8.8 27.4.5 28 .5Z",
  "M9.2 17.2c.2-.7.8-1.1 1.5-1.1h14.6c.8 0 1.4.6 1.4 1.4v17.2c0 .8-.6 1.4-1.4 1.4H7.8c-.9 0-1.5-.8-1.3-1.6l2.7-17.3Z",
  "M29.3 16.1c-.8 0-1.4.6-1.4 1.4v17.2c0 .8.6 1.4 1.4 1.4h16.8c.9 0 1.5-.8 1.3-1.6l-2.7-17.3c-.2-.7-.8-1.1-1.5-1.1H29.3Zm8.8 7.4c-2.3 0-3.8 1.6-3.8 4.2 0 .8.2 1.5.6 2 .6.8 1.5 1.2 3.2 1.2s2.6-.4 3.2-1.2c.4-.5.6-1.2.6-2 0-2.6-1.5-4.2-3.8-4.2Z",
  "M5.8 39.6c.2-.7.8-1.2 1.5-1.2h17.9c.8 0 1.4.6 1.4 1.4v18.4c0 .8-.6 1.4-1.4 1.4H1.8c-.9 0-1.5-.8-1.3-1.7l5.3-18.3Z",
  "M30.8 38.4c0-.8.6-1.4 1.4-1.4h17.9c.7 0 1.3.5 1.5 1.2l5.3 18.3c.2.9-.4 1.7-1.3 1.7H32.2c-.8 0-1.4-.6-1.4-1.4V38.4Z",
] as const;

export function AwaaslyMark({
  className,
  fill = "currentColor",
  title = "Awaasly",
}: {
  className?: string;
  fill?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={AWAASLY_MARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-auto shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {AWAASLY_MARK_PATHS.map((d) => (
        <path key={d} fill={fill} fillRule="evenodd" d={d} />
      ))}
    </svg>
  );
}
