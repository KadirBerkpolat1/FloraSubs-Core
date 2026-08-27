import React from 'react';
import {
  Film,
  FileText,
  PlaySquare,
  RefreshCw,
  Terminal,
  Settings,
  Cpu,
  Sparkles,
  Zap,
} from 'lucide-react';
import { HardwareProfile } from '../types';
import { Card, Badge } from './ui';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hardware: HardwareProfile | null;
}

const navItems = [
  { id: 'home', label: 'Ana Sayfa', icon: Film },
  { id: 'subtitle', label: 'Altyazı', icon: FileText },
  { id: 'preview', label: 'Önizleme', icon: PlaySquare },
  { id: 'converter', label: 'Dönüştürücü', icon: RefreshCw },
  { id: 'console', label: 'Konsol', icon: Terminal },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  hardware,
}) => {
  const primaryGpu = hardware?.gpus?.[0]?.name || null;
  const recommendedEnc = hardware?.recommended_encoder || 'libx264';

  return (
    <aside className="w-[260px] bg-surface-container-low border-r border-outline-variant flex flex-col justify-between select-none">
      <div>
        {/* Branding Header */}
        <div className="h-[48px] px-4 flex items-center space-x-3 border-b border-outline-variant">
          <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Film className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-on-surface truncate uppercase tracking-wider font-display">
              FloraSubs
            </h1>
            <p className="text-[10px] text-primary font-mono-technical font-semibold truncate">
              v2.0-INDUSTRIAL
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1" role="navigation" aria-label="Ana navigasyon">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                font-body text-body-md transition-all duration-150 text-left
                ${activeTab === id
                  ? 'bg-surface-container text-primary border-l-4 border-primary font-semibold shadow-inner'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Hardware / Engine Status Card */}
      <div className="p-3 border-t border-outline-variant bg-surface-container-lowest/60 space-y-2">
        <div className="flex items-center justify-between text-label-caps text-on-surface-variant">
          <span>TELEMETRY</span>
          <Badge variant="success" size="sm" dot>
            LIVE
          </Badge>
        </div>

        <Card variant="default" padding="sm" className="space-y-2 border-outline-variant/30 bg-surface-container/60">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span className="text-on-surface-variant">GPU</span>
            </div>
            <span className="font-mono-technical font-bold text-on-surface truncate max-w-[140px]">
              {primaryGpu || 'Standart Grafik'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-on-surface-variant">Encoder</span>
            </div>
            <span className="font-mono-technical font-bold text-emerald-400">
              {recommendedEnc}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span className="text-on-surface-variant">FFmpeg</span>
            </div>
            <span className="font-mono-technical font-bold text-primary">
              7.1 Static
            </span>
          </div>
        </Card>
      </div>
    </aside>
  );
};