import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      variant = 'primary',
      size = 'md',
      indeterminate = false,
      showLabel = false,
      label,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const baseStyles = 'w-full rounded-full overflow-hidden bg-surface-container-lowest relative border border-outline-variant/20';

    const variants = {
      primary: 'bg-gradient-to-r from-primary to-orange',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-danger',
      ai: 'bg-secondary',
    };

    const sizes = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-2.5',
    };

    return (
      <div ref={ref} className={twMerge(baseStyles, sizes[size], className)} {...props}>
        {indeterminate ? (
          <div
            className={twMerge(variants[variant], 'h-full w-1/4 animate-[shimmer_1.5s_infinite]')}
            style={{
              background: `linear-gradient(90deg, transparent, ${variants[variant].replace('bg-', '#')}, transparent)`,
            }}
          />
        ) : (
          <div
            className={twMerge(variants[variant], 'h-full transition-all duration-300 ease-out')}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label}
          />
        )}
        {showLabel && (
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-mono-technical text-on-surface-variant pr-2"
            aria-hidden="true"
          >
            {label ?? `${Math.round(percentage)}%`}
          </span>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';