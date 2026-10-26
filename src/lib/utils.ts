import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Division, TaskPriority } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns Tailwind badge classes for a given team division
 */
export function getDivisionBadge(divisi: Division | string): string {
  switch (divisi) {
    case 'backend':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'frontend':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'desain':
      return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30';
    case 'qa':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'devops':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
}

/**
 * Returns Tailwind badge classes for task priority levels
 */
export function getPriorityBadge(priority: TaskPriority | string): string {
  switch (priority) {
    case 'tinggi':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'sedang':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
}

/**
 * Formats byte numbers to KB / MB strings
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats time to HH:mm string
 */
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
