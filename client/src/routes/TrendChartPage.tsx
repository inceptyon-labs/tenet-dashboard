import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTrends, type TrendDay } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';
import { TrendChart } from '../components/TrendChart';
import { TenetWordmark } from '../components/TenetWordmark';

export function TrendChartPage() {
  const { slug } = useParams<{ slug: string }>();
  const [days, setDays] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchTrends(slug)
      .then((res) => setDays(res.days))
      .catch((e) => setError(e.message ?? 'Failed to load trends'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={`/p/${slug}`} style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>
            &larr;
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: colors.textPrimary, fontFamily: fontFamily.display }}>
            Trends
          </h1>
        </div>
        <TenetWordmark />
      </div>

      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>Loading trends...</div>
      )}

      {error && (
        <div style={{ padding: 60, textAlign: 'center', color: '#F09595', fontSize: 12 }}>{error}</div>
      )}

      {!loading && !error && days.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
          Not enough data for trends yet. At least 2 reports are needed.
        </div>
      )}

      {!loading && !error && days.length > 0 && (
        <div
          style={{
            backgroundColor: colors.card,
            border: colors.cardBorder,
            borderRadius: 10,
            padding: 20,
          }}
        >
          <TrendChart days={days} />
        </div>
      )}
    </div>
  );
}
