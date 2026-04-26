import { useState, Fragment } from 'react';
import { type DimensionCheck, type DimensionRow, type FindingRow } from '../lib/api';
import { dimensionLabel } from '../lib/dimensions';
import { getScoreConfig, colors, fontFamily } from '../lib/theme';
import { DeltaPill } from './DeltaPill';
import { ScorePill } from './ScorePill';

interface Props {
  dimensions: DimensionRow[];
  deltas?: Record<string, number> | null;
  findings?: FindingRow[];
  toolchainSummary?: Record<string, unknown> | null;
}

const STATUS_STYLES: Record<DimensionCheck['status'], { color: string; symbol: string; label: string }> = {
  passed:  { color: '#4ADE80', symbol: '✓', label: 'Passed' },
  failed:  { color: '#F09595', symbol: '✗', label: 'Failed' },
  skipped: { color: '#9CA3AF', symbol: '—', label: 'Skipped' },
  info:    { color: '#85B7EB', symbol: '●', label: 'Info' },
};

export function DimensionTable({ dimensions, deltas, findings, toolchainSummary }: Props) {
  const sorted = [...dimensions].sort((a, b) => b.weighted - a.weighted);
  const totalWeight = sorted.reduce((sum, d) => sum + d.weight, 0);
  const showDeltaColumn = !!deltas && Object.keys(deltas).length > 0;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const colCount = 10 + (showDeltaColumn ? 1 : 0);

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
            <th style={{ ...thStyle, width: 28, padding: '8px 4px' }}></th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Dimension</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Score</th>
            {showDeltaColumn && <th style={{ ...thStyle, textAlign: 'center' }}>Change</th>}
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
            const isOpen = expanded.has(dim.key);
            const dimFindings = findings?.filter((f) => f.dimension_key === dim.key) ?? [];

            return (
              <Fragment key={dim.key}>
                <tr
                  onClick={() => toggle(dim.key)}
                  style={{
                    borderTop: '0.5px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    backgroundColor: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '9px 4px', textAlign: 'center', color: colors.textMuted, fontSize: 10 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                        transition: 'transform 0.15s',
                      }}
                    >
                      &#9654;
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', color: colors.textPrimary, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: 500 }}>
                    {dimensionLabel(dim.key)}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <ScorePill score={dim.score} />
                  </td>
                  {showDeltaColumn && (
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <DeltaPill delta={deltas?.[dim.key] ?? null} compact />
                    </td>
                  )}
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
                        {dimensionLabel(dim.key)}
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
                {isOpen && (
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                    <td colSpan={colCount} style={{ padding: '0 12px 16px 36px' }}>
                      <DimensionDetails
                        dim={dim}
                        findings={dimFindings}
                        toolchainSummary={toolchainSummary}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DimensionDetails({
  dim,
  findings,
  toolchainSummary,
}: {
  dim: DimensionRow;
  findings: FindingRow[];
  toolchainSummary?: Record<string, unknown> | null;
}) {
  const checks = dim.checks ?? [];
  const metrics = isPlainObject(dim.metrics) ? (dim.metrics as Record<string, unknown>) : {};
  const metricEntries = Object.entries(metrics);
  const passedCount = checks.filter((c) => c.status === 'passed').length;
  const failedCount = checks.filter((c) => c.status === 'failed').length;
  const skippedCount = checks.filter((c) => c.status === 'skipped').length;

  const dimToolNames = new Set(checks.map((c) => c.tool).filter(Boolean) as string[]);
  const relevantTools = toolchainSummary
    ? Object.entries(toolchainSummary).filter(([name]) => dimToolNames.size === 0 || dimToolNames.has(name))
    : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '12px 16px',
        backgroundColor: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 8,
        marginTop: 4,
      }}
    >
      {!dim.applicable && (
        <NotApplicableBanner notes={dim.notes} />
      )}

      <DetailMetaRow dim={dim} findingCount={findings.length} />

      {dim.notes && dim.applicable && (
        <DetailBlock label="Notes">
          <span style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 1.5 }}>{dim.notes}</span>
        </DetailBlock>
      )}

      <DetailBlock
        label={
          checks.length > 0
            ? `What was tested (${passedCount} passed${failedCount ? ` / ${failedCount} failed` : ''}${skippedCount ? ` / ${skippedCount} skipped` : ''})`
            : 'What was tested'
        }
      >
        {checks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {checks.map((c, i) => (
              <CheckRow key={i} check={c} />
            ))}
          </div>
        ) : (
          <span style={{ color: colors.textMuted, fontSize: 11, fontStyle: 'italic' }}>
            This skill did not report a structured list of checks. Score is derived from findings, metrics, and skill heuristics.
          </span>
        )}
      </DetailBlock>

      {metricEntries.length > 0 && (
        <DetailBlock label="Metrics">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '6px 16px',
            }}
          >
            {metricEntries.map(([k, v]) => (
              <MetricItem key={k} label={k} value={v} />
            ))}
          </div>
        </DetailBlock>
      )}

      {relevantTools.length > 0 && (
        <DetailBlock label="Toolchain">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {relevantTools.map(([name, info]) => (
              <ToolRow key={name} name={name} info={info} />
            ))}
          </div>
        </DetailBlock>
      )}
    </div>
  );
}

function DetailMetaRow({ dim, findingCount }: { dim: DimensionRow; findingCount: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px', fontSize: 11, color: colors.textMuted, fontFamily: fontFamily.sans }}>
      {dim.skill_version && (
        <span>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: 9, marginRight: 6 }}>Skill</span>
          <span style={{ fontFamily: fontFamily.mono, color: colors.textSecondary }}>{dim.skill_version}</span>
        </span>
      )}
      <span>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: 9, marginRight: 6 }}>Findings</span>
        <span style={{ fontFamily: fontFamily.mono, color: colors.textSecondary }}>{findingCount}</span>
      </span>
      <span>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: 9, marginRight: 6 }}>Applicable</span>
        <span style={{ fontFamily: fontFamily.mono, color: colors.textSecondary }}>{dim.applicable ? 'yes' : 'no'}</span>
      </span>
    </div>
  );
}

function NotApplicableBanner({ notes }: { notes: string | null }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px dashed rgba(156,163,175,0.3)',
        color: colors.textMuted,
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: colors.textSecondary, marginRight: 6 }}>Not applicable.</strong>
      {notes ?? 'This dimension was not evaluated for this project.'}
    </div>
  );
}

function CheckRow({ check }: { check: DimensionCheck }) {
  const status = STATUS_STYLES[check.status];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        style={{
          color: status.color,
          fontFamily: fontFamily.mono,
          fontSize: 13,
          minWidth: 14,
          lineHeight: '18px',
          textAlign: 'center',
        }}
        title={status.label}
      >
        {status.symbol}
      </span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: colors.textSecondary, fontSize: 12, fontFamily: fontFamily.sans }}>
            {check.name}
          </span>
          {check.tool && (
            <span style={{ fontFamily: fontFamily.mono, fontSize: 10, color: colors.textMuted }}>
              [{check.tool}]
            </span>
          )}
          {typeof check.count === 'number' && (
            <span style={{ fontFamily: fontFamily.mono, fontSize: 10, color: colors.textMuted }}>
              {check.count.toLocaleString()}
            </span>
          )}
        </div>
        {check.description && (
          <span style={{ color: colors.textMuted, fontSize: 11, lineHeight: 1.45 }}>
            {check.description}
          </span>
        )}
        {check.details && (
          <pre
            style={{
              margin: 0,
              padding: '6px 8px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 4,
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: colors.textSecondary,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {check.details}
          </pre>
        )}
      </div>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {humanizeKey(label)}
      </span>
      <span style={{ fontFamily: fontFamily.mono, fontSize: 12, color: colors.textSecondary }}>
        {formatValue(value)}
      </span>
    </div>
  );
}

function ToolRow({ name, info }: { name: string; info: unknown }) {
  const obj = isPlainObject(info) ? (info as Record<string, unknown>) : {};
  const ran = obj.ran === true;
  const version = typeof obj.version === 'string' ? obj.version : null;
  const findingCount = typeof obj.finding_count === 'number' ? obj.finding_count : null;
  const mode = typeof obj.mode === 'string' ? obj.mode : null;

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11, fontFamily: fontFamily.mono }}>
      <span style={{ color: ran ? '#4ADE80' : colors.textMuted, minWidth: 12, textAlign: 'center' }}>
        {ran ? '✓' : '—'}
      </span>
      <span style={{ color: colors.textSecondary }}>{name}</span>
      {version && <span style={{ color: colors.textMuted }}>v{version}</span>}
      {mode && <span style={{ color: colors.textMuted }}>({mode})</span>}
      {findingCount !== null && (
        <span style={{ color: findingCount > 0 ? '#FAC775' : colors.textMuted }}>
          {findingCount} finding{findingCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: 6,
          fontFamily: fontFamily.sans,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function humanizeKey(key: string): string {
  return key.replace(/[_-]+/g, ' ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
