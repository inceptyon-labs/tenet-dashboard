import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type MutationTrendPoint, type TrendDay } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';

export interface MutationWorstFile {
  file: string;
  survived: number | null;
  total: number | null;
}

export interface MutationMetrics {
  available: boolean;
  provider: string | null;
  reportPath: string | null;
  scope: string | null;
  scoringMode: string | null;
  scorePct: number | null;
  rating: string | null;
  total: number | null;
  killed: number | null;
  survived: number | null;
  timedOut: number | null;
  equivalent: number | null;
  bonusApplied: number | null;
  worstFiles: MutationWorstFile[];
}

const MUTATION_COLORS = {
  killed: '#34D399',
  survived: '#F09595',
  timedOut: '#FAC775',
  equivalent: '#85B7EB',
  track: 'rgba(255,255,255,0.06)',
};

export function extractMutationMetrics(metrics: unknown): MutationMetrics | null {
  if (!isPlainObject(metrics)) return null;

  const hasMutationKeys = Object.keys(metrics).some((key) => key.startsWith('mutation_'));
  if (!hasMutationKeys) return null;

  return {
    available: metrics.mutation_available === true,
    provider: readString(metrics.mutation_provider),
    reportPath: readString(metrics.mutation_report_path),
    scope: readString(metrics.mutation_scope),
    scoringMode: readString(metrics.mutation_scoring_mode),
    scorePct: readNumber(metrics.mutation_score_pct),
    rating: readString(metrics.mutation_rating),
    total: readNumber(metrics.mutation_mutants_total),
    killed: readNumber(metrics.mutation_mutants_killed),
    survived: readNumber(metrics.mutation_mutants_survived),
    timedOut: readNumber(metrics.mutation_mutants_timed_out),
    equivalent: readNumber(metrics.mutation_mutants_equivalent),
    bonusApplied: readNumber(metrics.mutation_bonus_applied),
    worstFiles: readWorstFiles(metrics.mutation_worst_files),
  };
}

export function MutationTestingPanel({ metrics }: { metrics: MutationMetrics }) {
  const score = metrics.scorePct;
  const rating = metrics.rating ?? (score === null ? 'unavailable' : score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'weak' : 'poor');
  const total = metrics.total ?? sumKnown([metrics.killed, metrics.survived, metrics.timedOut, metrics.equivalent]);
  const killedPct = percentOf(metrics.killed, total);
  const survivedPct = percentOf(metrics.survived, total);
  const timedOutPct = percentOf(metrics.timedOut, total);
  const equivalentPct = percentOf(metrics.equivalent, total);

  return (
    <section
      style={{
        backgroundColor: colors.card,
        border: colors.cardBorder,
        borderRadius: 10,
        padding: '18px 20px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
            Mutation testing
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: fontFamily.mono, fontSize: 34, lineHeight: 1, color: colors.textPrimary }}>
              {score === null ? '--' : score.toFixed(1)}
            </span>
            <span style={{ fontFamily: fontFamily.mono, color: colors.textMuted, fontSize: 13 }}>%</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Badge label={rating} tone={ratingTone(rating)} />
            {metrics.provider && <Badge label={metrics.provider} />}
            {metrics.scope && <Badge label={metrics.scope.replace(/_/g, ' ')} />}
            {metrics.bonusApplied !== null && metrics.bonusApplied > 0 && (
              <Badge label={`+${metrics.bonusApplied} testing`} tone="good" />
            )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <Metric label="Killed" value={metrics.killed} color={MUTATION_COLORS.killed} />
            <Metric label="Survived" value={metrics.survived} color={MUTATION_COLORS.survived} />
            <Metric label="Timed out" value={metrics.timedOut} color={MUTATION_COLORS.timedOut} />
            <Metric label="Total" value={total} />
          </div>
          <div
            style={{
              height: 12,
              borderRadius: 6,
              overflow: 'hidden',
              backgroundColor: MUTATION_COLORS.track,
              display: 'flex',
              marginBottom: 10,
            }}
            aria-label="Mutation outcome distribution"
          >
            <Segment width={killedPct} color={MUTATION_COLORS.killed} />
            <Segment width={survivedPct} color={MUTATION_COLORS.survived} />
            <Segment width={timedOutPct} color={MUTATION_COLORS.timedOut} />
            <Segment width={equivalentPct} color={MUTATION_COLORS.equivalent} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 10, color: colors.textMuted }}>
            <LegendDot color={MUTATION_COLORS.killed} label="Killed" />
            <LegendDot color={MUTATION_COLORS.survived} label="Survived" />
            <LegendDot color={MUTATION_COLORS.timedOut} label="Timed out" />
            {metrics.equivalent !== null && <LegendDot color={MUTATION_COLORS.equivalent} label="Equivalent" />}
          </div>
          {!metrics.available && (
            <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 11, lineHeight: 1.45 }}>
              Mutation mode is present, but no usable report was attached to this run.
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>
            Worst files
          </div>
          {metrics.worstFiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {metrics.worstFiles.slice(0, 5).map((file) => (
                <WorstFileRow key={file.file} file={file} />
              ))}
            </div>
          ) : (
            <div style={{ color: colors.textMuted, fontSize: 11, lineHeight: 1.45 }}>
              No survivor hotspots reported.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MutationTrendPanel({ days }: { days: TrendDay[] }) {
  const mutationDays = days.filter((day) => day.mutation?.score_pct !== null && day.mutation?.score_pct !== undefined);
  if (mutationDays.length === 0) return null;

  const chartData = mutationDays.map((day) => ({
    date: day.day,
    score: day.mutation?.score_pct ?? null,
    killed: day.mutation?.killed ?? 0,
    survived: day.mutation?.survived ?? 0,
    timedOut: day.mutation?.timed_out ?? 0,
    rating: day.mutation?.rating ?? '',
    provider: day.mutation?.provider ?? '',
  }));

  const latest = mutationDays[mutationDays.length - 1].mutation as MutationTrendPoint;

  return (
    <section
      style={{
        backgroundColor: colors.card,
        border: colors.cardBorder,
        borderRadius: 10,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, color: colors.textPrimary, fontFamily: fontFamily.display, fontWeight: 600 }}>
            Mutation Testing
          </h2>
          <div style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            {mutationDays.length} report{mutationDays.length === 1 ? '' : 's'} with mutation data
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Badge label={`${formatPct(latest.score_pct)} latest`} tone={ratingTone(latest.rating)} />
          {latest.provider && <Badge label={latest.provider} />}
          {latest.scope && <Badge label={latest.scope.replace(/_/g, ' ')} />}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke={colors.textMuted}
            tick={{ fill: colors.textMuted, fontSize: 10, fontFamily: fontFamily.mono }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke={colors.textMuted}
            tick={{ fill: colors.textMuted, fontSize: 10, fontFamily: fontFamily.mono }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 11,
              fontFamily: fontFamily.sans,
              color: colors.textSecondary,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            formatter={(value, name) => [name === 'score' ? `${Number(value).toFixed(1)}%` : value, 'Mutation score']}
            labelStyle={{ color: colors.textPrimary, marginBottom: 4, fontFamily: fontFamily.mono, fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={MUTATION_COLORS.killed}
            strokeWidth={2}
            dot={{ r: 2, fill: MUTATION_COLORS.killed }}
            activeDot={{ r: 3.5, fill: MUTATION_COLORS.killed }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
        {mutationDays.slice(-8).map((day) => (
          <MiniOutcome key={day.day} day={day} />
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: number | null; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: fontFamily.mono, fontSize: 15, color: color ?? colors.textSecondary }}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

function Segment({ width, color }: { width: number; color: string }) {
  if (width <= 0) return null;
  return <div style={{ width: `${width}%`, backgroundColor: color, minWidth: width > 0 ? 2 : 0 }} />;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
      {label}
    </span>
  );
}

function WorstFileRow({ file }: { file: MutationWorstFile }) {
  const total = file.total ?? file.survived ?? 0;
  const width = percentOf(file.survived, total);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
        <span style={{ color: colors.textSecondary, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.file}
        </span>
        <span style={{ color: colors.textMuted, fontFamily: fontFamily.mono, fontSize: 10, flexShrink: 0 }}>
          {formatNumber(file.survived)} / {formatNumber(file.total)}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, backgroundColor: MUTATION_COLORS.track, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', backgroundColor: MUTATION_COLORS.survived }} />
      </div>
    </div>
  );
}

function MiniOutcome({ day }: { day: TrendDay }) {
  const mutation = day.mutation;
  if (!mutation) return null;
  const total = mutation.total ?? sumKnown([mutation.killed, mutation.survived, mutation.timed_out]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
        <span style={{ color: colors.textMuted, fontFamily: fontFamily.mono, fontSize: 10 }}>{day.day.slice(5)}</span>
        <span style={{ color: colors.textSecondary, fontFamily: fontFamily.mono, fontSize: 10 }}>{formatPct(mutation.score_pct)}</span>
      </div>
      <div style={{ height: 6, display: 'flex', borderRadius: 3, overflow: 'hidden', backgroundColor: MUTATION_COLORS.track }}>
        <Segment width={percentOf(mutation.killed, total)} color={MUTATION_COLORS.killed} />
        <Segment width={percentOf(mutation.survived, total)} color={MUTATION_COLORS.survived} />
        <Segment width={percentOf(mutation.timed_out, total)} color={MUTATION_COLORS.timedOut} />
      </div>
    </div>
  );
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const toneStyle = {
    good: { color: '#B4F2C9', bg: 'rgba(52,211,153,0.13)', border: 'rgba(52,211,153,0.28)' },
    warn: { color: '#FAC775', bg: 'rgba(239,159,39,0.13)', border: 'rgba(239,159,39,0.28)' },
    bad: { color: '#F09595', bg: 'rgba(226,75,74,0.13)', border: 'rgba(226,75,74,0.28)' },
    neutral: { color: colors.textSecondary, bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 20,
        padding: '2px 7px',
        borderRadius: 5,
        border: `1px solid ${toneStyle.border}`,
        backgroundColor: toneStyle.bg,
        color: toneStyle.color,
        fontSize: 10,
        fontFamily: fontFamily.mono,
        textTransform: 'lowercase',
      }}
    >
      {label}
    </span>
  );
}

function ratingTone(rating?: string | null): 'good' | 'warn' | 'bad' | 'neutral' {
  if (rating === 'excellent' || rating === 'good') return 'good';
  if (rating === 'weak') return 'warn';
  if (rating === 'poor' || rating === 'invalid') return 'bad';
  return 'neutral';
}

function readWorstFiles(value: unknown): MutationWorstFile[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isPlainObject(item)) return null;
      const file = readString(item.file);
      if (!file) return null;
      return {
        file,
        survived: readNumber(item.survived),
        total: readNumber(item.total),
      };
    })
    .filter((item): item is MutationWorstFile => item !== null)
    .sort((a, b) => (b.survived ?? 0) - (a.survived ?? 0));
}

function percentOf(value: number | null, total: number | null): number {
  if (value === null || total === null || total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function sumKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, value) => sum + value, 0);
}

function formatNumber(value: number | null): string {
  return value === null ? '--' : value.toLocaleString();
}

function formatPct(value: number | null): string {
  return value === null ? '--%' : `${value.toFixed(1)}%`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
