import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { twMerge } from 'tailwind-merge';
import { Upload, FileVideo, Plus } from 'lucide-react';

export interface FileDropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  className,
  onFilesSelected,
  accept = '.mkv,.mp4,.ts,.webm,.avi,.mov,.flv,.m4v,.m2ts',
  multiple = true,
  maxFiles,
  disabled = false,
  label = 'Dosya Sürükleyip Bırakın veya Tıklayın',
  description = 'Desteklenen formatlar: MKV, MP4, TS, WebM, AVI, MOV',
  children,
  ...props
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return accept.split(',').some((a) => a.trim() === ext);
      });

      if (maxFiles && validFiles.length > maxFiles) {
        alert(`Maksimum ${maxFiles} dosya seçilebilir.`);
        return;
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected, accept, maxFiles]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        handleClick();
      }
    },
    [disabled, handleClick]
  );

  return (
    <div
      ref={containerRef}
      className={twMerge(
        'relative rounded-2xl border-2 border-dashed transition-all duration-200',
        'flex flex-col items-center justify-center p-8 space-y-3',
        isDragOver
          ? 'border-white bg-white/10 shadow-lg shadow-white/10'
          : 'border-outline-variant/60 hover:border-white/40 hover:bg-white/5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={label}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
        aria-hidden="true"
      />
      <div className="flex flex-col items-center space-y-2 text-center">
        <div
          className={twMerge(
            'w-14 h-14 rounded-xl flex items-center justify-center',
            isDragOver
              ? 'bg-white/20 text-white'
              : 'bg-surface-container-high text-neutral-400'
          )}
        >
          {isDragOver ? (
            <FileVideo className="w-7 h-7" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-neutral-400">{description}</p>
        </div>
        {children}
      </div>
      <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface-container-high text-neutral-400">
        <Plus className="w-4 h-4" />
      </div>
    </div>
  );
};