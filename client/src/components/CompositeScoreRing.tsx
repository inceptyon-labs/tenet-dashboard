import { useEffect, useRef } from 'react';
import { getScoreConfig, fontFamily, colors } from '../lib/theme';

interface Props {
  score: number;
  size?: number;
}

export function CompositeScoreRing({ score, size = 96 }: Props) {
  const circleRef = useRef<SVGCircleElement>(null);
  const config = getScoreConfig(score);

  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.setProperty('--ring-circumference', String(circumference));
    el.style.setProperty('--ring-target', String(offset));
    el.style.strokeDashoffset = String(circumference);
    // Trigger reflow then animate
    void el.getBoundingClientRect();
    el.style.animation = 'ring-fill 1s ease-out forwards';
  }, [score, circumference, offset]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={config.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: size * 0.28,
            fontWeight: 500,
            fontFamily: fontFamily.mono,
            color: config.color,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontSize: size * 0.12,
            fontFamily: fontFamily.mono,
            color: colors.textMuted,
            marginTop: 3,
            letterSpacing: '1px',
          }}
        >
          {config.grade}
        </span>
      </div>
    </div>
  );
}
