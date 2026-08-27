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
    <header className="h-[44px] bg-surface-container-low border-b border-outline-variant px-5 flex items-center justify-between select-none">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-bold text-white tracking-widest uppercase font-display">
          Fansub & Anime Encoding Studio
        </span>
        {activeCount > 0 && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white text-xs font-mono animate-pulse">
            <Activity className="w-3 h-3 animate-spin" aria-hidden="true" />
            <span>{activeCount} İşlem Aktif</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
          <Layers className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          <span className="font-medium text-neutral-300">Ön Ayar:</span>
        </div>

        <select
          value={selectedPresetId}
          onChange={handleChange}
          className="etched-input w-60 h-8 px-3 text-xs font-body rounded-md focus:border-white focus:ring-1 focus:ring-white"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-container text-white">
              {opt.label}
            </option>
          ))}
        </select>

        <div className="h-3.5 w-px bg-outline-variant" aria-hidden="true" />

        <div className="text-xs text-neutral-400 font-mono">
          Kuyruk: <span className="text-white font-bold">{totalQueue}</span> dosya
        </div>
      </div>
    </header>
  );
};