import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface EncoderOption {
  value: string;
  label: string;
  group: string;
  disabled?: boolean;
}

interface EncoderSelectProps {
  value: string;
  onChange: (value: string) => void;
  encoders: EncoderOption[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EncoderSelect: React.FC<EncoderSelectProps> = ({
  value,
  onChange,
  encoders,
  className,
  size = 'md',
}) => {
  const groups = [...new Set(encoders.map((e) => e.group))];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full">
      <select
        value={value}
        onChange={handleChange}
        className={twMerge(
          'w-full etched-input text-on-surface transition-all duration-100 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer',
          size === 'sm' && 'h-8 px-3 text-xs pr-10',
          size === 'md' && 'h-9 px-4 text-sm pr-10',
          size === 'lg' && 'h-11 px-4 text-base pr-10',
          className
        )}
      >
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {encoders
              .filter((e) => e.group === group)
              .map((e) => (
                <option key={e.value} value={e.value} disabled={e.disabled}>
                  {e.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};