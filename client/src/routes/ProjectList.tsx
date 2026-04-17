import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchProjects, type ProjectSummary } from '../lib/api';
import { colors, fontFamily, relativeTime, getScoreConfig } from '../lib/theme';
import { Select } from '../components/Select';
import { useToast } from '../App';

type SortMode = 'recent' | 'score_asc' | 'score_desc' | 'name';

export function ProjectList() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');

  const loadProjects = useCallback(() => {
    setLoading(true);
    fetchProjects()
      .then(setProjects)
      .catch((e) => setError(e.message ?? 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'recent':
          return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
        case 'score_asc':
          return (a.latest_score ?? 0) - (b.latest_score ?? 0);
        case 'score_desc':
          return (b.latest_score ?? 0) - (a.latest_score ?? 0);
        case 'name':
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [projects, filter, sort]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 24px' }}>
      {/* Centered brand */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src="/tenet-logo.png"
          alt="TENET"
          style={{
            height: 48,
            width: 'auto',
            opacity: 0.85,
            userSelect: 'none',
            display: 'inline-block',
          }}
          draggable={false}
        />
        <p
          style={{
            marginTop: 14,
            marginBottom: 0,
            fontSize: 13,
            color: colors.textMuted,
            fontStyle: 'italic',
            fontFamily: fontFamily.sans,
          }}
        >
          I build in a twilight world.
        </p>
      </div>

      {/* Previous runs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ClockIcon />
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: colors.textPrimary, fontFamily: fontFamily.display }}>
          Previous Runs
        </h2>
        <div style={{ flex: 1 }} />
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 180 }}
        />
        <Select
          value={sort}
          onChange={(v) => setSort(v as SortMode)}
          options={[
            { value: 'recent', label: 'Most recent' },
            { value: 'score_asc', label: 'Score: Low to high' },
            { value: 'score_desc', label: 'Score: High to low' },
            { value: 'name', label: 'Name' },
          ]}
        />
        <Link
          to="/settings"
          style={{
            color: colors.textMuted,
            fontSize: 12,
            textDecoration: 'none',
            fontFamily: fontFamily.sans,
            marginLeft: 8,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; }}
        >
          Settings
        </Link>
      </div>

      {/* States */}
      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
          Loading projects...
        </div>
      )}

      {error && (
        <div style={{ padding: 60, textAlign: 'center', color: '#F09595', fontSize: 12 }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && projects.length === 0 && (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 12,
          }}
        >
          No runs yet. Drop a report above to get started.
        </div>
      )}

      {!loading && !error && filtered.length === 0 && projects.length > 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 12,
          }}
        >
          No runs match your filter.
        </div>
      )}

      {/* Run rows */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((project) => (
            <RunCard key={project.slug} project={project} />
          ))}
        </div>
      )}

      {/* Upload zone (compact, at the bottom) */}
      <div style={{ marginTop: 32 }}>
        <UploadZone onUploaded={loadProjects} />
      </div>
    </div>
  );
}

function RunCard({ project }: { project: ProjectSummary }) {
  const score = project.latest_score ?? 0;
  const config = getScoreConfig(score);

  return (
    <Link
      to={`/p/${project.slug}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          transition: 'border-color 0.15s, background-color 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#4B5563';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1F2937';
        }}
      >
        {/* Small score ring */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${config.color}`,
            backgroundColor: config.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: fontFamily.mono, color: config.color, lineHeight: 1 }}>
            {project.latest_score ?? '—'}
          </span>
          <span style={{ fontSize: 8, color: config.color, marginTop: 1, letterSpacing: '1px', opacity: 0.8 }}>
            {config.grade}
          </span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: colors.textPrimary,
                fontFamily: fontFamily.mono,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.name}
            </span>
            {project.latest_branch && (
              <span
                style={{
                  fontSize: 10,
                  color: colors.textMuted,
                  fontFamily: fontFamily.mono,
                  backgroundColor: colors.inputBg,
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {project.latest_branch}
              </span>
            )}
            {project.latest_commit && (
              <span
                style={{
                  fontSize: 10,
                  color: colors.textMuted,
                  fontFamily: fontFamily.mono,
                }}
              >
                {project.latest_commit.slice(0, 7)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                fontSize: 11,
                color: colors.textMuted,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ClockIcon small />
              {project.last_seen_at ? new Date(project.last_seen_at).toLocaleString() : '—'}
            </span>
          </div>
        </div>

        {/* Right side stats */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: colors.textSecondary, fontFamily: fontFamily.sans }}>
            {project.report_count} {project.report_count === 1 ? 'report' : 'reports'}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            {relativeTime(project.last_seen_at)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const getToken = (): string | null => {
    let token = localStorage.getItem('tenet_api_token');
    if (!token) {
      token = window.prompt('Enter your Tenet API token (saved locally in your browser):');
      if (token) localStorage.setItem('tenet_api_token', token);
    }
    return token;
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const token = getToken();
    if (!token) {
      toast('Upload cancelled: no API token');
      return;
    }
    setUploading(true);
    let ok = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await fetch('/api/v1/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(json),
        });
        if (!res.ok) {
          failed++;
        } else {
          ok++;
        }
      } catch {
        failed++;
      }
    }
    setUploading(false);
    if (ok > 0 && failed === 0) toast(`Uploaded ${ok} report${ok !== 1 ? 's' : ''}`);
    else if (ok > 0 && failed > 0) toast(`Uploaded ${ok}, ${failed} failed`);
    else toast(`Upload failed`);
    if (ok > 0) onUploaded();
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
      }}
      style={{
        border: `1px dashed ${dragging ? '#378ADD' : '#374151'}`,
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: dragging ? 'rgba(55,138,221,0.05)' : 'transparent',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div style={{ color: colors.textMuted, display: 'flex' }}>
        <UploadCloudIcon />
      </div>
      <div style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>
        Drop{' '}
        <code
          style={{
            fontFamily: fontFamily.mono,
            color: '#85B7EB',
            fontSize: 11,
          }}
        >
          HealthReport.json
        </code>{' '}
        files here, or click to browse
      </div>
      <div style={{ fontSize: 11, color: colors.textMuted }}>
        {uploading ? 'Uploading…' : 'supports multiple'}
      </div>
    </div>
  );
}

function ClockIcon({ small }: { small?: boolean }) {
  const size = small ? 11 : 14;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.2V7l1.8 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 23a6 6 0 1 1 1.3-11.86 7.5 7.5 0 0 1 14.4 2.36A5.5 5.5 0 0 1 25 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 15v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 19.5L18 15l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
