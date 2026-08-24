import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: Array<{ id: string; label: React.ReactNode; icon?: React.ReactNode }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'ghost';
}

export const Tabs: React.FC<TabsProps> = ({
  className,
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'border-b border-slate-700',
    ghost: 'bg-transparent',
  };

  return (
    <div className={twMerge('flex flex-col', variants[variant], className)} {...props}>
      <div
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-orientation="horizontal"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
              activeTab === tab.id
                ? variant === 'default'
                  ? 'text-blue-400 bg-slate-800/50 border-b-2 border-blue-500 -mb-px'
                  : 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {children}
      </div>
    </div>
  );
};