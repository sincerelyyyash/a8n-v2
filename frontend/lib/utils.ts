import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const loc = new URL(window.location.href);
    const currentPort = loc.port || (loc.protocol === "https:" ? "443" : "80");
    const guessedPort = currentPort === "3000" || currentPort === "3001" ? "8000" : currentPort;
    return `${loc.protocol}//${loc.hostname}:${guessedPort}`;
  }
  return "http://localhost:8000";
}
