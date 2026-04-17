import { getScoreConfig, fontFamily } from '../lib/theme';

interface Props {
  score: number | null;
}

export function ScorePill({ score }: Props) {
  if (score === null) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.05)',
          color: 'oklch(0.48 0.015 245)',
          fontFamily: fontFamily.mono,
          fontSize: 11,
          fontWeight: 500,
          lineHeight: '18px',
          whiteSpace: 'nowrap',
        }}
      >
        ---
      </span>
    );
  }

  const config = getScoreConfig(score);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 6,
        backgroundColor: config.bg,
        color: config.color,
        fontFamily: fontFamily.mono,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      {score}
      <span style={{ opacity: 0.6, fontSize: 10 }}>{config.grade}</span>
    </span>
  );
}
