import { colors, fontFamily } from '../lib/theme';

interface Props {
  delta: number | null | undefined;
  label?: string;
  compact?: boolean;
}

export function DeltaPill({ delta, label, compact = false }: Props) {
  const hasDelta = delta !== null && delta !== undefined;
  const value = hasDelta ? Math.round(delta) : null;
  const tone =
    value === null
      ? {
          text: 'Baseline',
          color: colors.textMuted,
          bg: 'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.06)',
        }
      : value > 0
        ? {
            text: `+${value}`,
            color: '#4ADE80',
            bg: 'rgba(74,222,128,0.11)',
            border: 'rgba(74,222,128,0.2)',
          }
        : value < 0
          ? {
              text: String(value),
              color: '#F09595',
              bg: 'rgba(226,75,74,0.13)',
              border: 'rgba(226,75,74,0.22)',
            }
          : {
              text: '0',
              color: colors.textMuted,
              bg: 'rgba(255,255,255,0.04)',
              border: 'rgba(255,255,255,0.06)',
            };

  return (
    <span
      title={hasDelta ? `${tone.text} vs previous report` : 'First report for this project'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        borderRadius: 6,
        border: `1px solid ${tone.border}`,
        backgroundColor: tone.bg,
        color: tone.color,
        fontFamily: fontFamily.mono,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        lineHeight: compact ? '16px' : '18px',
        padding: compact ? '0 6px' : '1px 7px',
        whiteSpace: 'nowrap',
      }}
    >
      {tone.text}
      {label && (
        <span
          style={{
            color: colors.textMuted,
            fontFamily: fontFamily.sans,
            fontSize: compact ? 9 : 10,
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
