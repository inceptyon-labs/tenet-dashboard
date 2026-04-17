import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchProject, type ReportDetail as ReportDetailData, type FindingRow } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';
import { CompositeScoreRing } from '../components/CompositeScoreRing';
import { DimensionTable } from '../components/DimensionTable';
import { FindingsList } from '../components/FindingsList';
import { TenetWordmark } from '../components/TenetWordmark';

function computeDurationMs(startedAt: string, completedAt: string): number | null {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  return end - start;
}

function computeSeverityCounts(findings: FindingRow[]): Record<string, number> {
  const counts: Record<string, number> = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}

const SEV_DOT_COLORS: Record<string, string> = {
  critical: '#E24B4A',
  major: '#EF9F27',
  minor: '#97C459',
  info: '#378ADD',
};

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('report_id') ?? undefined;

  const [data, setData] = useState<ReportDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetchProject(slug, reportId)
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [slug, reportId]);

  const severityCounts = useMemo(
    () => (data ? computeSeverityCounts(data.findings) : { critical: 0, major: 0, minor: 0, info: 0 }),
    [data],
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>
          &larr; All Reports
        </Link>
        <div style={{ padding: 60, textAlign: 'center', color: '#F09595', fontSize: 12 }}>
          {error ?? 'Project not found'}
        </div>
      </div>
    );
  }

  const durationMs = computeDurationMs(data.started_at, data.completed_at);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>
            &larr; All Reports
          </Link>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>|</span>
          {/* Green pulse dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#4ADE80',
              display: 'inline-block',
              animation: 'pulse-dot 2s infinite',
            }}
          />
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {data.commit}
          </span>
        </div>
        <TenetWordmark />
      </div>

      {/* Score + metadata strip */}
      <div
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <CompositeScoreRing score={data.composite_score} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px', color: colors.textPrimary, fontFamily: fontFamily.display }}>
            Composite Score
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 32px' }}>
            <MetaItem label="Branch" value={data.branch} />
            <MetaItem label="Commit" value={data.commit?.slice(0, 7)} mono />
            <MetaItem label="Files Analyzed" value={String(data.files_analyzed ?? '---')} />
            <MetaItem label="Lines of Code" value={data.lines_of_code?.toLocaleString() ?? '---'} />
            <MetaItem label="Scanned" value={data.created_at ? new Date(data.created_at).toLocaleString() : '---'} />
            <MetaItem label="Duration" value={durationMs ? `${(durationMs / 1000).toFixed(1)}s` : '---'} />
          </div>
        </div>
      </div>

      {/* Dimension table */}
      <div
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: '16px 0',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', padding: '0 16px', color: colors.textPrimary, fontFamily: fontFamily.display }}>
          Dimension Scores
        </h2>
        <DimensionTable dimensions={data.dimensions} />
      </div>

      {/* Severity summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['critical', 'major', 'minor', 'info'] as const).map((sev) => (
          <span key={sev} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: SEV_DOT_COLORS[sev], display: 'inline-block' }} />
            <span style={{ color: colors.textSecondary, textTransform: 'capitalize' }}>{sev}</span>
            <span style={{ color: colors.textPrimary, fontFamily: fontFamily.mono, fontSize: 12, fontWeight: 500 }}>{severityCounts[sev] ?? 0}</span>
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <Link
          to={`/p/${slug}/trends`}
          style={{
            color: colors.textMuted,
            fontSize: 11,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: fontFamily.sans,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(0.73 0.012 245)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.48 0.015 245)'; }}
        >
          View trends &rarr;
        </Link>
      </div>

      {/* Findings */}
      <FindingsList findings={data.findings} dimensions={data.dimensions} />
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3, fontFamily: fontFamily.sans, fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: colors.textPrimary,
          fontWeight: 500,
          fontFamily: mono ? fontFamily.mono : fontFamily.sans,
        }}
      >
        {value}
      </div>
    </div>
  );
}
