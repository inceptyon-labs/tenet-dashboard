import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { type TrendDay } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';

interface Props {
  days: TrendDay[];
}

const DIMENSION_COLORS: Record<string, string> = {
  Security: '#E24B4A',
  Reliability: '#EF9F27',
  Maintainability: '#378ADD',
  Performance: '#97C459',
  Complexity: '#A78BFA',
  Documentation: '#F472B6',
  Testing: '#34D399',
  Style: '#FBBF24',
};

function getDimensionColor(name: string): string {
  return DIMENSION_COLORS[name] ?? '#' + ((Math.abs(hashStr(name)) % 0xFFFFFF).toString(16).padStart(6, '0'));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function TrendChart({ days }: Props) {
  const allDimensions = useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      for (const key of Object.keys(day.dimensions)) {
        set.add(key);
      }
    }
    return [...set].sort();
  }, [days]);

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const chartData = useMemo(
    () =>
      days.map((d) => ({
        date: d.day,
        Composite: d.composite,
        ...d.dimensions,
      })),
    [days],
  );

  const toggleLine = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={360}>
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
            itemStyle={{ padding: '1px 0' }}
            labelStyle={{ color: colors.textPrimary, marginBottom: 4, fontFamily: fontFamily.mono, fontSize: 10 }}
          />
          {!hidden.has('Composite') && (
            <Line
              type="monotone"
              dataKey="Composite"
              stroke="#4ADE80"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#4ADE80' }}
            />
          )}
          {allDimensions.map((dim) =>
            hidden.has(dim) ? null : (
              <Line
                key={dim}
                type="monotone"
                dataKey={dim}
                stroke={getDimensionColor(dim)}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
                activeDot={{ r: 2.5 }}
              />
            ),
          )}
          <Legend content={() => null} />
        </LineChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: 12,
          justifyContent: 'center',
        }}
      >
        <LegendItem
          label="Composite"
          color="#4ADE80"
          active={!hidden.has('Composite')}
          onClick={() => toggleLine('Composite')}
        />
        {allDimensions.map((dim) => (
          <LegendItem
            key={dim}
            label={dim}
            color={getDimensionColor(dim)}
            active={!hidden.has(dim)}
            onClick={() => toggleLine(dim)}
          />
        ))}
      </div>
    </div>
  );
}

function LegendItem({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 5,
        border: 'none',
        backgroundColor: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: active ? colors.textSecondary : colors.textMuted,
        fontSize: 10,
        fontFamily: fontFamily.sans,
        cursor: 'pointer',
        opacity: active ? 1 : 0.35,
        transition: 'opacity 0.15s',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
      {label}
    </button>
  );
}
