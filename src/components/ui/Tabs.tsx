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
    default: 'border-b border-outline-variant',
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
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white',
              activeTab === tab.id
                ? variant === 'default'
                  ? 'text-white bg-surface-container border-b-2 border-white -mb-px font-bold'
                  : 'text-white bg-white/10 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-surface-container/50'
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