import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  fetchProject,
  fetchProjectReports,
  type ReportDetail as ReportDetailData,
  type FindingRow,
  type ReportListItem,
} from '../lib/api';
import { colors, fontFamily } from '../lib/theme';
import { CompositeScoreRing } from '../components/CompositeScoreRing';
import { DeltaPill } from '../components/DeltaPill';
import { DimensionTable } from '../components/DimensionTable';
import { FindingsList } from '../components/FindingsList';
import { MutationTestingPanel, extractMutationMetrics } from '../components/MutationTestingPanel';
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
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
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

  useEffect(() => {
    if (!slug) return;
    setReportsLoading(true);
    fetchProjectReports(slug, 1, 25)
      .then((res) => setReports(res.items))
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  }, [slug]);

  const severityCounts = useMemo(
    () => (data ? computeSeverityCounts(data.findings) : { critical: 0, major: 0, minor: 0, info: 0 }),
    [data],
  );

  const dimensionMovement = useMemo(
    () => summarizeDimensionDeltas(data?.delta?.dimensions),
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
  const testingDimension = data.dimensions.find((dimension) => dimension.key === 'testing');
  const mutationMetrics = extractMutationMetrics(testingDimension?.metrics);

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
          <div style={{ marginBottom: 14 }}>
            <DeltaPill delta={data.delta?.composite ?? null} label={data.delta ? 'vs previous' : undefined} />
          </div>
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

      {(reportsLoading || reports.length > 1) && (
        <ReportHistory
          slug={slug ?? data.project_slug}
          reports={reports}
          selectedReportId={data.id}
          loading={reportsLoading}
        />
      )}

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '0 16px',
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: colors.textPrimary, fontFamily: fontFamily.display }}>
            Dimension Scores
          </h2>
          <div style={{ fontSize: 11, color: colors.textMuted }}>
            {data.delta
              ? `${dimensionMovement.better} better / ${dimensionMovement.worse} worse / ${dimensionMovement.steady} steady`
              : 'Baseline report'}
          </div>
        </div>
        <DimensionTable
          dimensions={data.dimensions}
          deltas={data.delta?.dimensions}
          findings={data.findings}
          toolchainSummary={data.toolchain_summary}
        />
      </div>

      {mutationMetrics && (
        <MutationTestingPanel metrics={mutationMetrics} />
      )}

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

function summarizeDimensionDeltas(deltas?: Record<string, number> | null) {
  const values = Object.values(deltas ?? {});
  return {
    better: values.filter((delta) => delta > 0).length,
    worse: values.filter((delta) => delta < 0).length,
    steady: values.filter((delta) => delta === 0).length,
  };
}

function ReportHistory({
  slug,
  reports,
  selectedReportId,
  loading,
}: {
  slug: string;
  reports: ReportListItem[];
  selectedReportId: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: '13px 16px',
          marginBottom: 16,
          color: colors.textMuted,
          fontSize: 11,
        }}
      >
        Loading report history...
      </div>
    );
  }

  if (reports.length <= 1) return null;

  const latestId = reports[0]?.id;

  return (
    <div
      style={{
        backgroundColor: colors.card,
        border: colors.cardBorder,
        borderRadius: 10,
        padding: '13px 14px 14px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: colors.textPrimary, fontFamily: fontFamily.display }}>
          Report History
        </h2>
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          {reports.length} latest reports
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {reports.map((report, index) => {
          const previous = reports[index + 1];
          const delta = previous ? report.composite_score - previous.composite_score : null;
          const selected = report.id === selectedReportId;
          const href = report.id === latestId ? `/p/${slug}` : `/p/${slug}?report_id=${report.id}`;

          return (
            <Link
              key={report.id}
              to={href}
              style={{
                minWidth: 188,
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 8,
                border: selected ? '1px solid #4B5563' : '1px solid #1F2937',
                backgroundColor: selected ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.025)',
                padding: '10px 11px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: index === 0 ? '#4ADE80' : colors.textMuted, fontFamily: fontFamily.sans }}>
                  {index === 0 ? 'Latest' : `Run ${reports.length - index}`}
                </span>
                <DeltaPill delta={delta} compact />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: fontFamily.mono, fontSize: 18, color: colors.textPrimary, lineHeight: 1 }}>
                  {report.composite_score}
                </span>
                <span style={{ fontFamily: fontFamily.mono, fontSize: 10, color: colors.textMuted }}>
                  {report.commit.slice(0, 7)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    color: colors.textMuted,
                    fontFamily: fontFamily.mono,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {report.branch}
                </span>
                <span style={{ fontSize: 10, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
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
