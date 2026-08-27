import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  AiModelInfo,
  EncodeJobConfig,
  EncodeProgress,
  ExtractedTrackResult,
  HardwareProfile,
  JobLogMessage,
  MediaMetadata,
  ModelDownloadProgress,
  PresetProfile,
  SubtitleDialogue,
} from '../types';
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
};

export function convertMediaSrc(filePath: string): string {
  if (!isTauri()) return filePath;
  return filePath;
}
export async function getHardwareProfile(): Promise<HardwareProfile> {
  if (!isTauri()) {
    return {
      gpus: [
        {
          name: 'AMD Radeon RX 7600 (Navi 33)',
          vendor: 'amd',
        },
      ],
      cpu_name: '12th Gen Intel(R) Core(TM) i5-12400F',
      cpu_threads: 12,
      supported_encoders: [
        { id: 'h264_amf', name: 'h264_amf (AMD AMF Hızlı)', family: 'h264', hardware_type: 'amd', is_available: true, description: 'AMD AMF Hardware Encoder' },
        { id: 'hevc_amf', name: 'hevc_amf (AMD HEVC 10-bit)', family: 'hevc', hardware_type: 'amd', is_available: true, description: 'AMD HEVC Hardware Encoder' },
        { id: 'av1_amf', name: 'av1_amf (AMD AV1)', family: 'av1', hardware_type: 'amd', is_available: true, description: 'AMD AV1 Hardware Encoder' },
        { id: 'libx264', name: 'libx264 (H.264 CPU Standart)', family: 'h264', hardware_type: 'cpu', is_available: true, description: 'Software CPU x264' },
        { id: 'libx265', name: 'libx265 (HEVC 10-bit)', family: 'hevc', hardware_type: 'cpu', is_available: true, description: 'Software CPU x265' },
      ],
      recommended_encoder: 'h264_amf',
      ffmpeg_path: '/usr/bin/ffmpeg',
      ffmpeg_version: '7.1-static',
    };
  }
  return await invoke<HardwareProfile>('get_hardware_profile');
}

export async function probeMedia(filePath: string): Promise<MediaMetadata> {
  if (!isTauri()) {
    return {
      file_path: filePath,
      file_name: filePath.split('/').pop() || 'Video',
      file_size: 382730240,
      duration_secs: 1422.5,
      duration_formatted: '00:23:42.500',
      video_stream: {
        index: 0,
        codec: 'hevc',
        width: 1920,
        height: 1080,
        fps: 23.976,
        pix_fmt: 'yuv420p10le',
        bitrate: 1850000,
      },
      audio_streams: [
        { index: 1, audio_index: 0, codec: 'aac', channels: 2, sample_rate: 48000, language: 'jpn', title: 'Japanese Audio (Original)', bitrate: 192000, is_default: true },
        { index: 2, audio_index: 1, codec: 'aac', channels: 2, sample_rate: 48000, language: 'eng', title: 'English Dub', bitrate: 192000, is_default: false },
      ],
      subtitle_streams: [
        { index: 3, subtitle_index: 0, codec: 'ass', language: 'tur', title: 'Türkçe Fansub (FloraSubs)', is_default: true, is_forced: false },
        { index: 4, subtitle_index: 1, codec: 'ass', language: 'eng', title: 'English Dialogue', is_default: false, is_forced: false },
      ],
      attachments: [],
      font_count: 14,
    };
  }
  return await invoke<MediaMetadata>('probe_media', { filePath });
}

export async function extractSubtitle(
  inputPath: string,
  subtitleIndex: number,
  outputPath: string
): Promise<string> {
  if (!isTauri()) return outputPath;
  return await invoke<string>('extract_subtitle', {
    inputPath,
    subtitleIndex,
    outputPath,
  });
}

export async function extractAllSubs(
  inputPath: string,
  outputDir: string
): Promise<ExtractedTrackResult[]> {
  if (!isTauri()) return [];
  return await invoke<ExtractedTrackResult[]>('extract_all_subs', { inputPath, outputDir });
}

export async function extractFonts(
  inputPath: string,
  targetDir: string
): Promise<{ temp_dir: string; font_files: string[]; count: number }> {
  if (!isTauri()) return { temp_dir: targetDir, font_files: [], count: 0 };
  return await invoke('extract_fonts', { inputPath, targetDir });
}

export async function getPresets(): Promise<PresetProfile[]> {
  if (!isTauri()) {
    return [
      {
        id: 'anime_web_amf',
        name: '⚡ Anime Web AMF (1080p Ultra Hızlı)',
        description: 'AMD AMF donanım kodlayıcı ile 60 FPS ultra hızlı fansub kodlama',
        container: 'mp4',
        encoder: 'h264_amf',
        use_bitrate: false,
        average_bitrate_kbps: 4500,
        crf: 20,
        preset: 'quality',
        pixel_format: 'yuv420p',
        audio_codec: 'aac',
        audio_bitrate_kbps: 320,
        b_frames: 4,
        faststart: true,
      },
      {
        id: 'anime_master_hevc',
        name: '💎 Anime Stüdyo Master (HEVC 10-bit)',
        description: '10-bit renk derinliği ve yüksek sıkıştırma',
        container: 'mkv',
        encoder: 'hevc_amf',
        use_bitrate: false,
        average_bitrate_kbps: 3500,
        crf: 18,
        preset: 'quality',
        pixel_format: 'yuv420p10le',
        audio_codec: 'flac',
        audio_bitrate_kbps: 0,
        b_frames: 4,
        faststart: false,
      },
      {
        id: 'anime_web_x264',
        name: '🌐 Standart Anime Web (x264 CRF 20)',
        description: 'Maksimum cihaz uyumluluğu',
        container: 'mp4',
        encoder: 'libx264',
        use_bitrate: false,
        average_bitrate_kbps: 4000,
        crf: 20,
        preset: 'slow',
        pixel_format: 'yuv420p',
        audio_codec: 'aac',
        audio_bitrate_kbps: 256,
        b_frames: 4,
        faststart: true,
      },
    ];
  }
  return await invoke<PresetProfile[]>('get_presets');
}

export async function previewFFmpegCommand(
  config: EncodeJobConfig
): Promise<string[]> {
  if (!isTauri()) return ['ffmpeg', '-i', config.input_path, '-c:v', config.encoder, config.output_path];
  return await invoke<string[]>('preview_ffmpeg_command', { config });
}

export async function getModelsList(): Promise<AiModelInfo[]> {
  if (!isTauri()) {
    return [
      { id: '2x_AnimeJaNai_HD_V3_Compact', name: '2x AnimeJaNai HD V3 Compact', category: 'En Çok Tercih Edilen', format: 'ONNX Compact', filename: '2x_AnimeJaNai_HD_V3_Compact.onnx', download_url: '', size_mb: 18.4, is_downloaded: true },
      { id: 'Anime4K_Upscale_HD', name: 'Anime4K Upscale HD Realtime', category: 'Ultra Hızlı Gerçek Zamanlı', format: 'GLSL Shader', filename: 'Anime4K_Upscale_HD.glsl', download_url: '', size_mb: 2.1, is_downloaded: true },
      { id: '2x_Adore_renarchi_fp16_DML_onnxslim', name: '2x Adore Renarchi DML', category: 'Keskin Çizgili & Modern', format: 'ONNX FP16 DirectML', filename: '2x_Adore_renarchi_fp16_DML_onnxslim.onnx', download_url: '', size_mb: 34.2, is_downloaded: true },
    ];
  }
  return await invoke<AiModelInfo[]>('get_models_list');
}

export async function downloadModel(modelId: string): Promise<string> {
  if (!isTauri()) return 'Model downloaded';
  return await invoke<string>('download_model', { modelId });
}

export async function startEncode(config: EncodeJobConfig): Promise<void> {
  if (!isTauri()) {
    console.log('[Browser Mock] startEncode', config);
    return;
  }
  return await invoke<void>('start_encode', { config });
}

export async function pauseEncode(jobId: string): Promise<void> {
  if (!isTauri()) return;
  return await invoke<void>('pause_encode', { jobId });
}

export async function resumeEncode(jobId: string): Promise<void> {
  if (!isTauri()) return;
  return await invoke<void>('resume_encode', { jobId });
}

export async function cancelEncode(jobId: string): Promise<void> {
  if (!isTauri()) return;
  return await invoke<void>('cancel_encode', { jobId });
}

export async function cancelAllJobs(): Promise<void> {
  if (!isTauri()) return;
  return await invoke<void>('cancel_all_jobs');
}

export async function hasActiveJobs(): Promise<boolean> {
  if (!isTauri()) return false;
  return await invoke<boolean>('has_active_jobs');
}

export async function openInSystemPlayer(filePath: string): Promise<void> {
  if (!isTauri()) {
    console.log('[Browser Mock] openInSystemPlayer', filePath);
    return;
  }
  return await invoke<void>('open_in_system_player', { filePath });
}

export async function getVideoStreamUrl(filePath: string): Promise<string> {
  if (!isTauri()) return '';
  return await invoke<string>('get_video_stream_url', { filePath });
}

export async function getSubtitleStreamUrl(
  filePath: string,
  subtitleIndex: number
): Promise<string> {
  if (!isTauri()) return '';
  return await invoke<string>('get_subtitle_stream_url', {
    filePath,
    subtitleIndex,
  });
}

export async function getPreviewSubtitles(
  filePath: string,
  subtitleIndex: number,
  isExternal: boolean
): Promise<SubtitleDialogue[]> {
  if (!isTauri()) return [];
  return await invoke<SubtitleDialogue[]>('get_preview_subtitles', {
    filePath,
    subtitleIndex,
    isExternal,
  });
}

// Native Dialog Wrappers (100% Reliable RFD Native Dialogs)
export async function selectMediaFile(): Promise<string | null> {
  if (!isTauri()) return '/home/sevelebeci/İndirilenler/[Judas] Initial D - S01E04.mkv';
  return await invoke<string | null>('open_media_file_native');
}

export async function selectMultipleMediaFiles(): Promise<string[]> {
  if (!isTauri()) {
    return [
      '/home/sevelebeci/İndirilenler/[Judas] Initial D (Complete Series + Movies) [BD 1080p][HEVC x265 10bit][Dual-Audio][Eng-Subs]/[Judas] 01 - Initial D First Stage/[Judas] Initial D - S01E04.mkv',
      '/home/sevelebeci/İndirilenler/annen.mp4',
    ];
  }
  return await invoke<string[]>('open_media_files_native');
}

export async function selectSubtitleFile(): Promise<string | null> {
  if (!isTauri()) return null;
  return await invoke<string | null>('open_subtitle_file_native');
}

export async function selectOutputDirectory(): Promise<string | null> {
  if (!isTauri()) return '/home/sevelebeci/Videolar';
  return await invoke<string | null>('open_directory_native');
}

export async function saveSubtitleFile(defaultName: string): Promise<string | null> {
  if (!isTauri()) return defaultName;
  return await invoke<string | null>('save_subtitle_native', { defaultName });
}

// Event Listeners
export async function onEncodeProgress(
  callback: (progress: EncodeProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  return await listen<EncodeProgress>('encode-progress', (event) => {
    callback(event.payload);
  });
}

export async function onEncodeLog(
  callback: (log: JobLogMessage) => void
): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  return await listen<JobLogMessage>('encode-log', (event) => {
    callback(event.payload);
  });
}

export async function onModelDownloadProgress(
  callback: (progress: ModelDownloadProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  return await listen<ModelDownloadProgress>('model-download-progress', (event) => {
    callback(event.payload);
  });
}
