import { useState } from 'react';
import { type FindingRow } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';
import { copyFixPrompt } from '../lib/clipboard';
import { dimensionLabel } from '../lib/dimensions';
import { SeverityPill } from './SeverityPill';
import { useToast } from '../App';

interface Props {
  finding: FindingRow;
  defaultOpen?: boolean;
}

export function FindingCard({ finding, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const toast = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyFixPrompt(finding.fix_prompt);
    toast(ok ? 'Fix prompt copied' : 'Copy failed');
  };

  return (
    <div
      style={{
        backgroundColor: colors.card,
        border: colors.cardBorder,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '10px 14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ paddingTop: 2, flexShrink: 0 }}>
          <SeverityPill severity={finding.severity} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                color: colors.textPrimary,
                fontWeight: 500,
              }}
            >
              {finding.rule}
            </span>
          </div>
          <div
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: open ? 'normal' : 'nowrap',
            }}
          >
            {finding.title}
          </div>
          {formatLocation(finding) && (
            <div
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 10,
                color: colors.textMuted,
                marginTop: 3,
              }}
            >
              {formatLocation(finding)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
          <button
            onClick={handleCopy}
            title="Copy fix prompt"
            style={{
              background: colors.inputBg,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 5,
              color: colors.textSecondary,
              padding: '3px 10px',
              fontSize: 10,
              fontFamily: fontFamily.sans,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e2d45'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.inputBg; }}
          >
            Fix prompt
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              padding: '2px 4px',
              fontSize: 10,
              fontFamily: fontFamily.sans,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            {open ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {open && (
        <div
          style={{
            padding: '0 14px 14px',
            borderTop: '0.5px solid rgba(255,255,255,0.05)',
            animation: 'fade-in 0.15s ease-out',
          }}
        >
          {/* Description */}
          <p style={{ color: colors.textSecondary, margin: '12px 0 10px', lineHeight: 1.6, fontFamily: fontFamily.sans, fontSize: 12 }}>
            {finding.description}
          </p>

          {/* Confidence */}
          <div style={{ marginBottom: 10 }}>
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
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: colors.textMuted,
                fontSize: 10,
                fontFamily: fontFamily.mono,
                marginLeft: 6,
              }}
            >
              {dimensionLabel(finding.dimension_key)}
            </span>
          </div>

          {/* Snippet */}
          {finding.snippet && (
            <pre
              style={{
                backgroundColor: colors.base,
                border: '0.5px solid rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 12,
                margin: '0 0 10px',
                overflow: 'auto',
                fontSize: 11,
                lineHeight: 1.7,
                fontFamily: fontFamily.mono,
                color: colors.textSecondary,
              }}
            >
              <code>{finding.snippet}</code>
            </pre>
          )}

          {/* Fix prompt */}
          {finding.fix_prompt && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
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
                    padding: '3px 8px',
                    fontSize: 10,
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
                  padding: 12,
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
      )}
    </div>
  );
}

function formatLocation(finding: FindingRow): string | null {
  if (!finding.file) return null;
  if (finding.line == null) return finding.file;
  return finding.column == null
    ? `${finding.file}:${finding.line}`
    : `${finding.file}:${finding.line}:${finding.column}`;
}
