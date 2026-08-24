import React from 'react';
import { Activity, Layers } from 'lucide-react';
import { PresetProfile } from '../types';

interface HeaderProps {
  presets: PresetProfile[];
  selectedPresetId: string;
  onSelectPreset: (preset: PresetProfile) => void;
  activeCount: number;
  totalQueue: number;
}

export const Header: React.FC<HeaderProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  activeCount,
  totalQueue,
}) => {
  const options = presets.map((preset) => ({
    value: preset.id,
    label: preset.name,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = presets.find((p) => p.id === e.target.value);
    if (found) onSelectPreset(found);
  };

  return (
    <header className="h-[48px] bg-surface-dim border-b border-outline-variant px-6 flex items-center justify-between select-none">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-semibold text-on-surface tracking-wide uppercase font-display">
          Fansub & Anime Encoding Studio
        </span>
        {activeCount > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary-container/20 border border-primary/30 text-primary text-xs font-mono-technical">
            <Activity className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>{activeCount} İşlem Aktif</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs text-on-surface-variant">
          <Layers className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
          <span className="font-medium text-on-surface">Ön Ayar:</span>
        </div>

        <select
          value={selectedPresetId}
          onChange={handleChange}
          className="etched-input w-56 h-9 px-4 text-sm font-body"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="h-4 w-px bg-outline-variant" aria-hidden="true" />

        <div className="text-xs text-on-surface-variant font-mono-technical">
          Kuyruk: <span className="text-on-surface font-bold">{totalQueue}</span> dosya
        </div>
      </div>
    </header>
  );
};