import React from 'react';
import { twMerge } from 'tailwind-merge';

interface PillOption {
  id: string;
  label: string;
  desc: string;
  icon?: React.ReactNode;
}

interface ResolutionPillsProps {
  options: PillOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const ResolutionPills: React.FC<ResolutionPillsProps> = ({
  options,
  selectedId,
  onSelect,
  className,
  orientation = 'horizontal',
}) => {
  return (
    <div
      className={twMerge(
        'flex gap-2 flex-wrap',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      role="radiogroup"
      aria-orientation={orientation}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          role="radio"
          aria-checked={selectedId === option.id}
          className={twMerge(
            'radio-pill w-full justify-start text-left gap-2 p-2.5',
            selectedId === option.id ? 'radio-pill-active' : ''
          )}
        >
          {option.icon && <span className="flex-shrink-0 w-5 h-5">{option.icon}</span>}
          <div className="flex-1 text-left">
            <div className="text-xs font-bold text-on-surface">{option.label}</div>
            <div className="text-[10px] text-on-surface-variant">{option.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
};