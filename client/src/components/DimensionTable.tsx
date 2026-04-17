import { type DimensionRow } from '../lib/api';
import { getScoreConfig, colors, fontFamily } from '../lib/theme';
import { ScorePill } from './ScorePill';

interface Props {
  dimensions: DimensionRow[];
}

export function DimensionTable({ dimensions }: Props) {
  const sorted = [...dimensions].sort((a, b) => b.weighted - a.weighted);
  const totalWeight = sorted.reduce((sum, d) => sum + d.weight, 0);

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontWeight: 500,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontFamily: fontFamily.sans,
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Dimension</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Score</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Weight</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Weighted</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 36, padding: '8px 4px' }}>C</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 36, padding: '8px 4px' }}>Ma</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 36, padding: '8px 4px' }}>Mi</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 36, padding: '8px 4px' }}>I</th>
            <th style={{ ...thStyle, minWidth: 160 }}></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((dim) => {
            const scoreConfig = getScoreConfig(dim.score ?? 0);
            const counts = dim.counts ?? {};
            const weightPct = totalWeight > 0 ? ((dim.weight / totalWeight) * 100).toFixed(2) : '0.00';
            return (
              <tr
                key={dim.key}
                style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}
              >
                <td style={{ padding: '9px 12px', color: colors.textPrimary, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: 500 }}>
                  {dim.key}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  <ScorePill score={dim.score} />
                </td>
                <td
                  style={{
                    padding: '9px 12px',
                    textAlign: 'right',
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    color: colors.textMuted,
                  }}
                >
                  {weightPct}%
                </td>
                <td
                  style={{
                    padding: '9px 12px',
                    textAlign: 'right',
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    color: colors.textSecondary,
                  }}
                >
                  {dim.weighted.toFixed(1)}
                </td>
                <td style={{ padding: '9px 4px', textAlign: 'center', fontFamily: fontFamily.mono, color: (counts.critical ?? 0) > 0 ? '#F09595' : colors.textMuted, fontSize: 11 }}>
                  {counts.critical ?? 0}
                </td>
                <td style={{ padding: '9px 4px', textAlign: 'center', fontFamily: fontFamily.mono, color: (counts.major ?? 0) > 0 ? '#FAC775' : colors.textMuted, fontSize: 11 }}>
                  {counts.major ?? 0}
                </td>
                <td style={{ padding: '9px 4px', textAlign: 'center', fontFamily: fontFamily.mono, color: (counts.minor ?? 0) > 0 ? '#C0DD97' : colors.textMuted, fontSize: 11 }}>
                  {counts.minor ?? 0}
                </td>
                <td style={{ padding: '9px 4px', textAlign: 'center', fontFamily: fontFamily.mono, color: (counts.info ?? 0) > 0 ? '#85B7EB' : colors.textMuted, fontSize: 11 }}>
                  {counts.info ?? 0}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: colors.textSecondary, fontFamily: fontFamily.sans, whiteSpace: 'nowrap', minWidth: 70, textAlign: 'right' }}>
                      {dim.key}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${dim.score ?? 0}%`,
                          borderRadius: 5,
                          backgroundColor: scoreConfig.color,
                          transition: 'width 0.5s ease-out',
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
