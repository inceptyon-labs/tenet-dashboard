import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchFinding, type FindingRow } from '../lib/api';
import { colors, fontFamily, severityConfig } from '../lib/theme';
import { SeverityPill } from '../components/SeverityPill';
import { copyFixPrompt } from '../lib/clipboard';
import { useToast } from '../App';
import { TenetWordmark } from '../components/TenetWordmark';

export function FindingDetail() {
  const { slug, findingId } = useParams<{ slug: string; findingId: string }>();
  const toast = useToast();

  const [finding, setFinding] = useState<FindingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!findingId) return;
    setLoading(true);
    fetchFinding(findingId)
      .then(setFinding)
      .catch((e) => setError(e.message ?? 'Failed to load finding'))
      .finally(() => setLoading(false));
  }, [findingId]);

  const handleCopy = async () => {
    if (!finding) return;
    const ok = await copyFixPrompt(finding.fix_prompt);
    toast(ok ? 'Fix prompt copied' : 'Copy failed');
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <Link to={slug ? `/p/${slug}` : '/'} style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>
          &larr; Back to project
        </Link>
        <div style={{ padding: 60, textAlign: 'center', color: '#F09595', fontSize: 12 }}>
          {error ?? 'Finding not found'}
        </div>
      </div>
    );
  }

  const sevConfig = severityConfig[finding.severity];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <Link to={slug ? `/p/${slug}` : '/'} style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>
          &larr; Back to project
        </Link>
        <TenetWordmark />
      </div>

      {/* Finding card */}
      <div
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <SeverityPill severity={finding.severity} />
          <span style={{ fontFamily: fontFamily.mono, fontSize: 11, color: sevConfig.text, opacity: 0.8 }}>
            {finding.rule}
          </span>
          <span style={{ fontFamily: fontFamily.mono, fontSize: 10, color: colors.textMuted }}>
            {finding.dimension_key}
          </span>
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 12px', color: colors.textPrimary, fontFamily: fontFamily.display }}>
          {finding.title}
        </h2>

        {/* Location */}
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 16,
            padding: '3px 8px',
            backgroundColor: colors.base,
            borderRadius: 4,
            display: 'inline-block',
          }}
        >
          {finding.file}:{finding.line}:{finding.column}
        </div>

        {/* Description */}
        <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: 16, fontFamily: fontFamily.sans }}>
          {finding.description}
        </p>

        {/* Confidence */}
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 5,
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: colors.textMuted,
              fontSize: 10,
              fontFamily: fontFamily.mono,
            }}
          >
            confidence: {finding.confidence ?? '---'}
          </span>
        </div>

        {/* Snippet */}
        {finding.snippet && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 500 }}>
              Code Snippet
            </div>
            <pre
              style={{
                backgroundColor: colors.base,
                border: '0.5px solid rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 14,
                margin: 0,
                overflow: 'auto',
                fontSize: 11,
                lineHeight: 1.7,
                fontFamily: fontFamily.mono,
                color: colors.textSecondary,
              }}
            >
              <code>{finding.snippet}</code>
            </pre>
          </div>
        )}

        {/* Fix prompt */}
        {finding.fix_prompt && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
                Fix Prompt
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: colors.inputBg,
                  border: 'none',
                  borderRadius: 5,
                  color: colors.textSecondary,
                  padding: '3px 10px',
                  fontSize: 11,
                  fontFamily: fontFamily.sans,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e2d45'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.inputBg; }}
              >
                Copy
              </button>
            </div>
            <pre
              style={{
                backgroundColor: colors.base,
                border: '0.5px solid rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 14,
                margin: 0,
                overflow: 'auto',
                fontSize: 11,
                lineHeight: 1.7,
                fontFamily: fontFamily.mono,
                color: colors.textSecondary,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {finding.fix_prompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
