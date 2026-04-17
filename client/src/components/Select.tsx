import { useState, useRef, useEffect } from 'react';
import { colors, fontFamily } from '../lib/theme';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function Select({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: 6,
          color: '#F3F4F6',
          padding: '6px 10px',
          fontSize: 12,
          fontFamily: fontFamily.sans,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4B5563'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = '#374151'; }}
      >
        {selected?.label ?? value}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '100%',
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: 8,
            padding: '4px 0',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'fade-in 0.1s ease-out',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: opt.value === value ? 'rgba(255,255,255,0.06)' : 'none',
                border: 'none',
                color: opt.value === value ? colors.textPrimary : colors.textSecondary,
                padding: '7px 12px',
                fontSize: 12,
                fontFamily: fontFamily.sans,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = opt.value === value ? 'rgba(255,255,255,0.06)' : 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
