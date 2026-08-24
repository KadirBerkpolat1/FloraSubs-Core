import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon,
  title,
  description,
  action,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700/50 rounded-2xl text-center space-y-3 bg-slate-900/40',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-12 h-12 text-slate-500 opacity-60 flex-shrink-0">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-300">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};