import { useState, useMemo } from 'react';
import { type FindingRow, type DimensionRow } from '../lib/api';
import { colors, fontFamily, severityConfig, type SeverityLevel } from '../lib/theme';
import { dimensionLabel } from '../lib/dimensions';
import { FindingCard } from './FindingCard';
import { Select } from './Select';
import { ScorePill } from './ScorePill';

interface Props {
  findings: FindingRow[];
  dimensions: DimensionRow[];
}

type SortBy = 'severity' | 'file' | 'dimension';

export function FindingsList({ findings, dimensions }: Props) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dimensionFilter, setDimensionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('severity');
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const dimensionNames = useMemo(
    () => [...new Set(dimensions.map((d) => d.key))].sort(),
    [dimensions],
  );

  const dimScoreMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const d of dimensions) {
      map[d.key] = d.score;
    }
    return map;
  }, [dimensions]);

  const filtered = useMemo(() => {
    let result = [...findings];

    if (severityFilter !== 'all') {
      result = result.filter((f) => f.severity === severityFilter);
    }
    if (dimensionFilter !== 'all') {
      result = result.filter((f) => f.dimension_key === dimensionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          (f.rule?.toLowerCase().includes(q) ?? false) ||
          (f.file?.toLowerCase().includes(q) ?? false),
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'severity') {
        return severityConfig[a.severity as SeverityLevel].order - severityConfig[b.severity as SeverityLevel].order;
      }
      if (sortBy === 'file') {
        return (a.file ?? '').localeCompare(b.file ?? '') || (a.line ?? 0) - (b.line ?? 0);
      }
      return a.dimension_key.localeCompare(b.dimension_key);
    });

    return result;
  }, [findings, severityFilter, dimensionFilter, sortBy, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, FindingRow[]>();
    for (const f of filtered) {
      const key = f.dimension_key;
      const arr = groups.get(key);
      if (arr) arr.push(f);
      else groups.set(key, [f]);
    }
    return groups;
  }, [filtered]);

  const groupKeys = [...grouped.keys()];

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: colors.textPrimary, fontFamily: fontFamily.display }}>
          Findings
        </h2>
        <span style={{ color: colors.textMuted, fontSize: 11, fontFamily: fontFamily.sans }}>
          Showing {filtered.length} of {findings.length} findings
        </span>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <Select
          value={severityFilter}
          onChange={setSeverityFilter}
          options={[
            { value: 'all', label: 'All Severities' },
            { value: 'critical', label: 'Critical' },
            { value: 'major', label: 'Major' },
            { value: 'minor', label: 'Minor' },
            { value: 'info', label: 'Info' },
          ]}
        />

        <Select
          value={dimensionFilter}
          onChange={setDimensionFilter}
          options={[
            { value: 'all', label: 'All Dimensions' },
            ...dimensionNames.map((d) => ({ value: d, label: dimensionLabel(d) })),
          ]}
        />

        <Select
          value={sortBy}
          onChange={(v) => setSortBy(v as SortBy)}
          options={[
            { value: 'severity', label: 'Sort: Severity' },
            { value: 'file', label: 'Sort: File' },
            { value: 'dimension', label: 'Sort: Dimension' },
          ]}
        />

        <input
          type="text"
          placeholder="Search file, message, rule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px',
            minWidth: 150,
          }}
        />
      </div>

      {/* Grouped findings */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 12,
          }}
        >
          No findings match your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupKeys.map((groupName, groupIndex) => {
            const items = grouped.get(groupName) ?? [];
            const isOpen = groupIndex < 2
              ? !collapsedGroups.has(groupName)
              : collapsedGroups.has(groupName);

            // Compute severity counts for this group
            const groupCounts: Record<string, number> = {};
            for (const f of items) {
              groupCounts[f.severity] = (groupCounts[f.severity] ?? 0) + 1;
            }

            const dimScore = dimScoreMap[groupName] ?? null;

            return (
              <div key={groupName}>
                <button
                  onClick={() => toggleGroup(groupName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: fontFamily.display,
                    cursor: 'pointer',
                    padding: '6px 0',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                      transition: 'transform 0.15s',
                      fontSize: 10,
                      color: colors.textMuted,
                    }}
                  >
                    &#9654;
                  </span>
                  {dimensionLabel(groupName)}
                  {dimScore !== null && (
                    <ScorePill score={dimScore} />
                  )}
                  <div style={{ flex: 1 }} />
                  {/* Severity count badges */}
                  {(groupCounts.major ?? 0) > 0 && (
                    <span style={{ fontSize: 10, fontFamily: fontFamily.mono, color: '#FAC775' }}>
                      &#9650; {groupCounts.major}
                    </span>
                  )}
                  {(groupCounts.minor ?? 0) > 0 && (
                    <span style={{ fontSize: 10, fontFamily: fontFamily.mono, color: '#C0DD97' }}>
                      &#9650; {groupCounts.minor}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 10,
                      color: colors.textMuted,
                    }}
                  >
                    {items.length} finding{items.length !== 1 ? 's' : ''}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {items.map((f) => (
                      <FindingCard key={f.id} finding={f} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
