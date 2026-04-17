export const colors = {
  base: '#030712',
  card: '#111827',
  cardBorder: '1px solid #1F2937',
  inputBg: '#1F2937',
  inputBorder: '1px solid #374151',
  hover: '#1F2937',
  textPrimary: '#FFFFFF',
  textSecondary: '#F3F4F6',
  textMuted: '#9CA3AF',
} as const;

export type SeverityLevel = 'critical' | 'major' | 'minor' | 'info';

export interface SeverityConfig {
  color: string;
  bg: string;
  text: string;
  label: string;
  order: number;
}

export const severityConfig: Record<SeverityLevel, SeverityConfig> = {
  critical: { color: '#E24B4A', bg: 'rgba(226,75,74,0.15)', text: '#F09595', label: 'Critical', order: 0 },
  major:    { color: '#EF9F27', bg: 'rgba(239,159,39,0.15)', text: '#FAC775', label: 'Major', order: 1 },
  minor:    { color: '#97C459', bg: 'rgba(151,196,89,0.15)', text: '#C0DD97', label: 'Minor', order: 2 },
  info:     { color: '#378ADD', bg: 'rgba(55,138,221,0.15)', text: '#85B7EB', label: 'Info', order: 3 },
} as const;

export type Grade = 'A' | 'B' | 'C' | 'F';

export interface ScoreConfig {
  grade: Grade;
  color: string;
  bg: string;
}

export function getScoreConfig(score: number): ScoreConfig {
  if (score >= 90) return { grade: 'A', color: '#4ADE80', bg: '#04342C' };
  if (score >= 70) return { grade: 'B', color: '#378ADD', bg: '#042C53' };
  if (score >= 50) return { grade: 'C', color: '#EF9F27', bg: '#412402' };
  return { grade: 'F', color: '#E24B4A', bg: '#501313' };
}

export const fontFamily = {
  sans: "'Figtree', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  display: "'Familjen Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
} as const;

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}
