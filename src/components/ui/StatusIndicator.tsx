import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Loader2, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning' | 'processing';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showDot?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  className,
  status = 'idle',
  size = 'md',
  label,
  showDot = true,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 font-mono';

  const statusConfig = {
    idle: { color: 'text-slate-500', icon: Circle, dotColor: 'bg-slate-500' },
    loading: { color: 'text-blue-400', icon: Loader2, dotColor: 'bg-blue-400 animate-pulse' },
    success: { color: 'text-emerald-400', icon: CheckCircle2, dotColor: 'bg-emerald-400' },
    error: { color: 'text-rose-400', icon: AlertCircle, dotColor: 'bg-rose-400' },
    warning: { color: 'text-amber-400', icon: AlertCircle, dotColor: 'bg-amber-400 animate-pulse' },
    processing: { color: 'text-purple-400', icon: Loader2, dotColor: 'bg-purple-400 animate-spin' },
  };

  const sizes = {
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-sm',
  };

  const Icon = statusConfig[status].icon;
  const dotColor = statusConfig[status].dotColor;
  const textColor = statusConfig[status].color;

  return (
    <span
      className={twMerge(baseStyles, sizes[size], textColor, className)}
      {...props}
    >
      {showDot && (
        <span
          className={twMerge(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            size === 'sm' && 'w-1 h-1',
            size === 'lg' && 'w-2 h-2',
            dotColor
          )}
          aria-hidden="true"
        />
      )}
      {children ?? label ?? status.charAt(0).toUpperCase() + status.slice(1)}
      {status === 'loading' && <Icon className="w-3 h-3 animate-spin" aria-hidden="true" />}
      {status === 'processing' && <Icon className="w-3 h-3 animate-spin" aria-hidden="true" />}
    </span>
  );
};