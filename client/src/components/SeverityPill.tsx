import { severityConfig, type SeverityLevel } from '../lib/theme';

interface Props {
  severity: SeverityLevel;
  count?: number;
}

export function SeverityPill({ severity, count }: Props) {
  const config = severityConfig[severity];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 6,
        backgroundColor: config.bg,
        color: config.text,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.2px',
      }}
    >
      {config.label}
      {count !== undefined && (
        <span style={{ opacity: 0.6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{count}</span>
      )}
    </span>
  );
}
