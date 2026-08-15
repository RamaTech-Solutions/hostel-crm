import Image from "next/image";
import { cn } from "@/lib/utils";

const variantSrc = {
  primary: "/brand/awaasly-logo-primary.png",
  primaryTagline: "/brand/awaasly-logo-primary-tagline.png",
  reversed: "/brand/awaasly-logo-reversed.png",
  reversedTagline: "/brand/awaasly-logo-reversed-tagline.png",
  stacked: "/brand/awaasly-logo-stacked.png",
  stackedReversed: "/brand/awaasly-logo-stacked-reversed.png",
  symbol: "/brand/awaasly-symbol-amber.svg",
} as const;

const variantSize = {
  primary: { width: 1592, height: 396 },
  primaryTagline: { width: 1592, height: 580 },
  reversed: { width: 1592, height: 396 },
  reversedTagline: { width: 1592, height: 580 },
  stacked: { width: 1104, height: 900 },
  stackedReversed: { width: 1104, height: 900 },
  symbol: { width: 64, height: 64 },
} as const;

const placementClass = {
  navbar: "h-[26px] w-auto md:h-[30px]",
  sidebar: "h-[30px] w-auto",
  sidebarCollapsed: "h-[30px] w-[30px]",
  preview: "h-[23px] w-auto",
  auth: "h-auto w-[200px]",
  footer: "h-auto w-[200px]",
  icon: "h-[30px] w-[30px]",
} as const;

export type AwaaslyLogoVariant = keyof typeof variantSrc;
export type AwaaslyLogoPlacement = keyof typeof placementClass;

export function AwaaslyLogo({
  variant = "primary",
  placement = "navbar",
  className,
  alt = "Awaasly",
  priority = false,
}: {
  variant?: AwaaslyLogoVariant;
  placement?: AwaaslyLogoPlacement;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const resolvedVariant: AwaaslyLogoVariant =
    placement === "sidebarCollapsed" || placement === "icon" ? "symbol" : variant;
  const src = variantSrc[resolvedVariant];
  const size = variantSize[resolvedVariant];
  const classes = cn("object-contain", placementClass[placement], className);

  if (resolvedVariant === "symbol") {
    return (
      // SVG: native img avoids Next Image rasterization of the canonical mark.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} width={30} height={30} className={classes} />
    );
  }

  const sizedByWidth = placement === "auth" || placement === "footer";

  return (
    <Image
      src={src}
      alt={alt}
      width={size.width}
      height={size.height}
      className={classes}
      style={sizedByWidth ? { height: "auto" } : { width: "auto" }}
      priority={priority}
    />
  );
}
