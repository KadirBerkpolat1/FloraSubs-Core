import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'processing';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center font-mono-technical font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full';

    const variants = {
      default: 'bg-surface-container-highest/50 text-on-surface-variant border border-outline-variant/30',
      primary: 'bg-primary-container/20 text-primary border border-primary/30',
      success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      error: 'bg-danger/20 text-danger border border-danger/30',
      processing: 'bg-ai-purple/20 text-ai-purple border border-ai-purple/30',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-[10px] gap-1',
      md: 'px-2.5 py-1 text-[11px] gap-1.5',
    };

    return (
      <span
        ref={ref}
        className={twMerge(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && (
          <span
            className={twMerge(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              variant === 'default' && 'bg-surface-bright',
              variant === 'primary' && 'bg-primary',
              variant === 'success' && 'bg-success',
              variant === 'warning' && 'bg-warning',
              variant === 'error' && 'bg-danger',
              variant === 'processing' && 'bg-ai-purple animate-pulse'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';