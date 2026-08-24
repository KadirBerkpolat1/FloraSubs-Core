import React from 'react';
import { Select, SelectOption } from './index';
import { PresetProfile } from '../../types';

interface PresetSelectorProps {
  presets: PresetProfile[];
  selectedPresetId: string;
  onSelectPreset: (preset: PresetProfile) => void;
  className?: string;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  className,
}) => {
  const options: SelectOption[] = presets.map((preset) => ({
    value: preset.id,
    label: preset.name,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = presets.find((p) => p.id === e.target.value);
    if (found) onSelectPreset(found);
  };

  return (
    <Select
      className={className}
      value={selectedPresetId}
      onChange={handleChange}
      options={options}
      placeholder="Ön ayar seçin..."
      size="sm"
      variant="default"
    />
  );
};