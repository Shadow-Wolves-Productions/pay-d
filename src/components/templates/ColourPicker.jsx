import React from 'react';

const PRESETS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

export default function ColourPicker({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-7 h-7 rounded-full border-2 transition-all"
            style={{
              background: c,
              borderColor: value === c ? '#fff' : 'transparent',
              transform: value === c ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer"
        />
        <span className="font-mono text-sm text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}