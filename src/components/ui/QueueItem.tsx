import React from 'react';
import { twMerge } from 'tailwind-merge';
import { FileVideo, Play, Pause, X, CheckCircle2, AlertCircle, Clock, Gauge, Trash2 } from 'lucide-react';
import { Button, ProgressBar, Badge } from './index';
import { QueueItem as QueueItemType } from '../../types';

interface QueueItemProps {
  item: QueueItemType;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

const statusConfig = {
  waiting: { label: 'Bekliyor', variant: 'default' as const, icon: Clock },
  encoding: { label: 'Kodlanıyor', variant: 'processing' as const, icon: Gauge },
  paused: { label: 'Duraklatıldı', variant: 'warning' as const, icon: Pause },
  completed: { label: 'Tamamlandı', variant: 'success' as const, icon: CheckCircle2 },
  error: { label: 'Hata', variant: 'error' as const, icon: AlertCircle },
};

export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  isSelected,
  onSelect,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRemove,
}) => {
  const config = statusConfig[item.status];
  const progress = item.progress?.percentage ?? 0;

  return (
    <div
      onClick={onSelect}
      className={twMerge(
        'group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer',
        isSelected
          ? 'bg-blue-500/10 border-blue-500/60 shadow-md shadow-blue-500/10'
          : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50'
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
        <FileVideo className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-100 truncate flex-1">{item.fileName}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant={config.variant} size="sm" dot>
              {config.label}
            </Badge>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Kuyruktan kaldır"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span>{(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>
          {item.metadata?.video_stream && (
            <>
              <span>•</span>
              <span>
                {item.metadata.video_stream.width}x{item.metadata.video_stream.height}
              </span>
            </>
          )}
          {item.metadata?.duration_secs && (
            <>
              <span>•</span>
              <span>{Math.floor(item.metadata.duration_secs / 60)}dk</span>
            </>
          )}
        </div>

        {item.status === 'encoding' || item.status === 'paused' ? (
          <div className="w-full">
            <ProgressBar
              value={progress}
              variant={item.status === 'encoding' ? 'primary' : 'warning'}
              size="sm"
              showLabel
            />
          </div>
        ) : item.status === 'completed' ? (
          <div className="w-full">
            <ProgressBar value={100} variant="success" size="sm" showLabel />
          </div>
        ) : item.status === 'error' ? (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{item.progress?.error_message || 'Bilinmeyen hata'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Başlat
            </Button>
          </div>
        )}
      </div>

      {(item.status === 'encoding' || item.status === 'paused') && (
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {item.status === 'encoding' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onPause(); }}
              leftIcon={<Pause className="w-3.5 h-3.5" />}
              aria-label="Duraklat"
            >
              Duraklat
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onResume(); }}
              leftIcon={<Play className="w-3.5 h-3.5" />}
              aria-label="Devam ettir"
            >
              Devam
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            leftIcon={<X className="w-3.5 h-3.5" />}
            aria-label="İptal et"
          >
            İptal
          </Button>
        </div>
      )}
    </div>
  );
};