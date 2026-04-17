import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings, adminRollup, adminDeleteExpired, adminWipeAll } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';
import { useToast } from '../App';
import { TenetWordmark } from '../components/TenetWordmark';

interface SettingsShape {
  dimension_weights?: Record<string, number>;
  retention?: {
    full_retention_days?: number;
    snapshot_retention_days?: number;
  };
  usage?: {
    total_projects?: number;
    total_reports?: number;
    total_findings?: number;
    db_size_bytes?: number;
  };
}

function parseSettings(raw: Record<string, unknown>): SettingsShape {
  return raw as SettingsShape;
}

export function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [fullRetention, setFullRetention] = useState(30);
  const [snapshotRetention, setSnapshotRetention] = useState(365);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState(false);

  // Confirmation modal
  const [modal, setModal] = useState<{ action: string; phrase: string; onConfirm: () => Promise<void> } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    fetchSettings()
      .then((raw) => {
        const s = parseSettings(raw);
        setSettings(s);
        setFullRetention(s.retention?.full_retention_days ?? 30);
        setSnapshotRetention(s.retention?.snapshot_retention_days ?? 365);
        setWeights({ ...(s.dimension_weights ?? {}) });
      })
      .catch((e) => setError(e.message ?? 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const raw = await updateSettings({
        retention: {
          full_retention_days: fullRetention,
          snapshot_retention_days: snapshotRetention,
        },
        dimension_weights: weights,
      });
      const updated = parseSettings(raw);
      setSettings(updated);
      setDirty(false);
      toast('Settings saved');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast(msg);
    } finally {
      setSaving(false);
    }
  }, [fullRetention, snapshotRetention, weights, toast]);

  const handleCancel = () => {
    if (!settings) return;
    setFullRetention(settings.retention?.full_retention_days ?? 30);
    setSnapshotRetention(settings.retention?.snapshot_retention_days ?? 365);
    setWeights({ ...(settings.dimension_weights ?? {}) });
    setDirty(false);
  };

  const handleRollup = async () => {
    try {
      const res = await adminRollup();
      toast(`Rollup complete: ${JSON.stringify(res.summary)}`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Rollup failed');
    }
  };

  const handleDeleteExpired = async () => {
    try {
      const res = await adminDeleteExpired();
      toast(`Deleted ${res.deleted} expired reports`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleWipe = async () => {
    try {
      await adminWipeAll();
      toast('All data wiped');
      setSettings(null);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Wipe failed');
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: fontFamily.mono,
    width: 80,
    textAlign: 'right',
  };

  const btnStyle: React.CSSProperties = {
    backgroundColor: colors.inputBg,
    border: colors.inputBorder,
    borderRadius: 6,
    color: colors.textSecondary,
    padding: '6px 14px',
    fontSize: 11,
    fontFamily: fontFamily.sans,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>&larr; Back</Link>
        <div style={{ padding: 60, textAlign: 'center', color: '#F09595', fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 12 }}>&larr;</Link>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: colors.textPrimary, fontFamily: fontFamily.display }}>Settings</h1>
        </div>
        <TenetWordmark />
      </div>

      {/* Retention */}
      <section
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: 20,
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: colors.textPrimary, fontFamily: fontFamily.display }}>
          Retention
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary, fontSize: 13, fontFamily: fontFamily.sans }}>Full report retention (days)</span>
            <input
              type="number"
              min={1}
              value={fullRetention}
              onChange={(e) => { setFullRetention(Number(e.target.value)); setDirty(true); }}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary, fontSize: 13, fontFamily: fontFamily.sans }}>Snapshot retention (days)</span>
            <input
              type="number"
              min={1}
              value={snapshotRetention}
              onChange={(e) => { setSnapshotRetention(Number(e.target.value)); setDirty(true); }}
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      {/* Dimension weights */}
      <section
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: 20,
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: colors.textPrimary, fontFamily: fontFamily.display }}>
          Dimension Weights
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(weights)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, weight]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ color: colors.textSecondary, fontSize: 13, fontFamily: fontFamily.sans }}>{name}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weight}
                  onChange={(e) => {
                    setWeights((prev) => ({ ...prev, [name]: Number(e.target.value) }));
                    setDirty(true);
                  }}
                  style={inputStyle}
                />
              </div>
            ))}
        </div>
      </section>

      {/* Usage stats */}
      {settings?.usage && (
        <section
          style={{
            backgroundColor: colors.card,
            border: colors.cardBorder,
            borderRadius: 10,
            padding: 20,
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: colors.textPrimary, fontFamily: fontFamily.display }}>
            Usage
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            <UsageStat label="Projects" value={String(settings.usage.total_projects ?? 0)} />
            <UsageStat label="Reports" value={String(settings.usage.total_reports ?? 0)} />
            <UsageStat label="Findings" value={String(settings.usage.total_findings ?? 0)} />
            <UsageStat label="DB Size" value={formatBytes(settings.usage.db_size_bytes ?? 0)} />
          </div>
        </section>
      )}

      {/* Save / Cancel */}
      {dirty && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btnStyle,
              backgroundColor: '#378ADD',
              color: '#fff',
              border: 'none',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handleCancel} style={btnStyle}>
            Cancel
          </button>
        </div>
      )}

      {/* Danger zone */}
      <section
        style={{
          backgroundColor: colors.card,
          border: '0.5px solid rgba(226,75,74,0.15)',
          borderRadius: 10,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: '#F09595', fontFamily: fontFamily.display }}>
          Danger Zone
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DangerButton
            label="Rollup Now"
            description="Compress old reports into snapshots"
            onClick={() =>
              setModal({
                action: 'Rollup Now',
                phrase: 'ROLLUP',
                onConfirm: handleRollup,
              })
            }
          />
          <DangerButton
            label="Delete Expired"
            description="Remove reports past retention period"
            onClick={() =>
              setModal({
                action: 'Delete Expired',
                phrase: 'DELETE EXPIRED',
                onConfirm: handleDeleteExpired,
              })
            }
          />
          <DangerButton
            label="Wipe All Data"
            description="Permanently delete all projects, reports, and findings"
            onClick={() =>
              setModal({
                action: 'Wipe All Data',
                phrase: 'DELETE EVERYTHING',
                onConfirm: handleWipe,
              })
            }
          />
        </div>
      </section>

      {/* Confirmation modal */}
      {modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => { setModal(null); setConfirmInput(''); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              border: '0.5px solid rgba(226,75,74,0.2)',
              borderRadius: 10,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              animation: 'fade-in 0.15s ease-out',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F09595', margin: '0 0 12px', fontFamily: fontFamily.display }}>
              Confirm: {modal.action}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.6, marginBottom: 16, fontFamily: fontFamily.sans }}>
              Type{' '}
              <code
                style={{
                  fontFamily: fontFamily.mono,
                  backgroundColor: 'rgba(226,75,74,0.12)',
                  color: '#F09595',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                {modal.phrase}
              </code>{' '}
              to confirm this action.
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={modal.phrase}
              autoFocus
              style={{
                fontFamily: fontFamily.mono,
                width: '100%',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModal(null); setConfirmInput(''); }}
                style={{
                  ...btnStyle,
                  border: 'none',
                }}
              >
                Cancel
              </button>
              <button
                disabled={confirmInput !== modal.phrase}
                onClick={async () => {
                  await modal.onConfirm();
                  setModal(null);
                  setConfirmInput('');
                }}
                style={{
                  backgroundColor: confirmInput === modal.phrase ? '#E24B4A' : 'rgba(226,75,74,0.3)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '6px 14px',
                  fontSize: 11,
                  fontFamily: fontFamily.sans,
                  cursor: confirmInput === modal.phrase ? 'pointer' : 'not-allowed',
                  opacity: confirmInput === modal.phrase ? 1 : 0.5,
                  transition: 'background-color 0.15s, opacity 0.15s',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '0.5px solid rgba(255,255,255,0.03)',
      }}
    >
      <div>
        <div style={{ color: colors.textPrimary, fontSize: 13, fontFamily: fontFamily.sans }}>{label}</div>
        <div style={{ color: colors.textMuted, fontSize: 11 }}>{description}</div>
      </div>
      <button
        onClick={onClick}
        style={{
          backgroundColor: 'rgba(226,75,74,0.1)',
          border: '0.5px solid rgba(226,75,74,0.2)',
          borderRadius: 6,
          color: '#F09595',
          padding: '5px 12px',
          fontSize: 11,
          fontFamily: fontFamily.sans,
          cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(226,75,74,0.18)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(226,75,74,0.1)'; }}
      >
        {label}
      </button>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: colors.textPrimary, fontFamily: fontFamily.mono }}>
        {value}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(1)} ${sizes[idx]}`;
}
