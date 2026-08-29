import React from 'react';
import {
  Film,
  FileText,
  RefreshCw,
  Minimize2,
  Terminal,
  Settings,
} from 'lucide-react';
import { HardwareProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hardware: HardwareProfile | null;
}

const navItems = [
  { id: 'home', label: 'Ana Sayfa', icon: Film },
  { id: 'subtitle', label: 'Altyazı', icon: FileText },
  { id: 'converter', label: 'Dönüştürücü', icon: RefreshCw },
  { id: 'compressor', label: 'Sıkıştırıcı', icon: Minimize2 },
  { id: 'console', label: 'Konsol', icon: Terminal },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <aside className="w-[200px] bg-surface-container-low border-r border-outline-variant flex flex-col justify-between select-none">
      <div>
        {/* Branding Header */}
        <div className="h-[48px] px-4 flex items-center space-x-2.5 border-b border-outline-variant">
          <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
            <Film className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xs font-bold text-white tracking-wider uppercase font-display">
              FloraSubs
            </h1>
            <p className="text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
              Pro Studio
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-2 space-y-1" role="navigation" aria-label="Ana navigasyon">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 text-left
                ${activeTab === id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-surface-container-high'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Footer Branding info */}
      <div className="p-3 border-t border-outline-variant/40 text-[10px] font-mono text-neutral-500 flex items-center justify-between">
        <span>v1.3.0-STABLE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Online" />
      </div>
    </aside>
  );
};
