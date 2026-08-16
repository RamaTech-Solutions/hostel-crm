import { z } from "zod";
import { INDIAN_MOBILE_ERROR, normalizeIndianMobile } from "@/lib/india/phone";
import { isIndianState, STATE_REQUIRED_MESSAGE } from "@/lib/india/states";

export const requiredIndianMobileSchema = z.string().transform((val, ctx) => {
  const normalized = normalizeIndianMobile(val);
  if (normalized.kind !== "ok") {
    ctx.addIssue({ code: "custom", message: INDIAN_MOBILE_ERROR });
    return z.NEVER;
  }
  return normalized.value;
});

export const optionalIndianMobileSchema = z.preprocess((val) => val ?? "", z.string().transform((value, ctx) => {
  const normalized = normalizeIndianMobile(value);
  if (normalized.kind === "empty") return "";
  if (normalized.kind !== "ok") {
    ctx.addIssue({ code: "custom", message: INDIAN_MOBILE_ERROR });
    return z.NEVER;
  }
  return normalized.value;
}));

export const requiredIndianStateSchema = z
  .string()
  .trim()
  .refine(isIndianState, { message: STATE_REQUIRED_MESSAGE });

export const optionalIndianStateSchema = z.preprocess(
  (val) => val ?? "",
  z.string().trim().refine((value) => value === "" || isIndianState(value), { message: STATE_REQUIRED_MESSAGE })
);
