import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateSafe(val: any, fmt: string = "MMM d, yyyy"): string {
  if (!val) return "-";
  try {
    const parsed = typeof val === "string" ? new Date(val.includes("T") ? val : val.replace(" ", "T")) : new Date(val);
    if (isNaN(parsed.getTime())) return "-";
    return format(parsed, fmt);
  } catch {
    return "-";
  }
}

