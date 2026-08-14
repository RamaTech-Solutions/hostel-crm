import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function maskIdNumber(idNumber: string | null | undefined): string {
  if (!idNumber) return "—";
  if (idNumber.length <= 4) return "****";
  return `${"*".repeat(Math.max(idNumber.length - 4, 4))}${idNumber.slice(-4)}`;
}

export function formatMobile(mobile: string | null | undefined): string {
  if (!mobile) return "—";
  if (mobile.length === 10) {
    return `${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  }
  return mobile;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function calculateOccupancy(occupied: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
}
