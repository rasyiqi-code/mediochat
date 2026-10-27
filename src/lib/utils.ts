import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Division, TaskPriority } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DYNAMIC_PALETTES = [
  'bg-[#86EFAC]', // mint
  'bg-[#7DD3FC]', // sky blue
  'bg-[#F472B6]', // pink
  'bg-[#FDE047]', // yellow
  'bg-[#C084FC]', // purple
  'bg-[#FB7185]', // rose
  'bg-[#FED7AA]', // peach
  'bg-[#A7F3D0]', // emerald
  'bg-[#DDD6FE]', // violet
  'bg-[#BAE6FD]', // light blue
];

/**
 * Returns Neobrutalism badge classes for a given team division (built-in or dynamic)
 */
export function getDivisionBadge(divisi?: Division | string): string {
  if (!divisi) {
    return 'bg-[#E2E8F0] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
  }

  const normalized = divisi.toLowerCase().trim();
  switch (normalized) {
    case 'backend':
      return 'bg-[#86EFAC] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    case 'frontend':
      return 'bg-[#7DD3FC] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    case 'desain':
      return 'bg-[#F472B6] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    case 'qa':
      return 'bg-[#FDE047] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    case 'devops':
      return 'bg-[#C084FC] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    case 'general':
      return 'bg-[#E2E8F0] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    default: {
      // Deterministic palette pick for any dynamic division (marketing, sales, finance, etc.)
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colorClass = DYNAMIC_PALETTES[Math.abs(hash) % DYNAMIC_PALETTES.length];
      return `${colorClass} text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]`;
    }
  }
}

/**
 * Returns Neobrutalism badge classes for task priority levels
 */
export function getPriorityBadge(priority: TaskPriority | string): string {
  switch (priority) {
    case 'tinggi':
      return 'bg-[#FB7185] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    case 'sedang':
      return 'bg-[#FDE047] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
    default:
      return 'bg-[#86EFAC] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]';
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
