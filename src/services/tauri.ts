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

export async function getHardwareProfile(): Promise<HardwareProfile> {
  return await invoke<HardwareProfile>('get_hardware_profile');
}

export async function probeMedia(filePath: string): Promise<MediaMetadata> {
  return await invoke<MediaMetadata>('probe_media', { filePath });
}

export async function extractSubtitle(
  inputPath: string,
  subtitleIndex: number,
  outputPath: string
): Promise<string> {
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
  return await invoke<ExtractedTrackResult[]>('extract_all_subs', { inputPath, outputDir });
}

export async function extractFonts(
  inputPath: string,
  targetDir: string
): Promise<{ temp_dir: string; font_files: string[]; count: number }> {
  return await invoke('extract_fonts', { inputPath, targetDir });
}

export async function getPresets(): Promise<PresetProfile[]> {
  return await invoke<PresetProfile[]>('get_presets');
}

export async function previewFFmpegCommand(
  config: EncodeJobConfig
): Promise<string[]> {
  return await invoke<string[]>('preview_ffmpeg_command', { config });
}

export async function getModelsList(): Promise<AiModelInfo[]> {
  return await invoke<AiModelInfo[]>('get_models_list');
}

export async function downloadModel(modelId: string): Promise<string> {
  return await invoke<string>('download_model', { modelId });
}

export async function startEncode(config: EncodeJobConfig): Promise<void> {
  return await invoke<void>('start_encode', { config });
}

export async function pauseEncode(jobId: string): Promise<void> {
  return await invoke<void>('pause_encode', { jobId });
}

export async function resumeEncode(jobId: string): Promise<void> {
  return await invoke<void>('resume_encode', { jobId });
}

export async function cancelEncode(jobId: string): Promise<void> {
  return await invoke<void>('cancel_encode', { jobId });
}

export async function hasActiveJobs(): Promise<boolean> {
  return await invoke<boolean>('has_active_jobs');
}

export async function openInSystemPlayer(filePath: string): Promise<void> {
  return await invoke<void>('open_in_system_player', { filePath });
}

export async function getVideoStreamUrl(filePath: string): Promise<string> {
  return await invoke<string>('get_video_stream_url', { filePath });
}

export async function getSubtitleStreamUrl(
  filePath: string,
  subtitleIndex: number
): Promise<string> {
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
  return await invoke<SubtitleDialogue[]>('get_preview_subtitles', {
    filePath,
    subtitleIndex,
    isExternal,
  });
}

// Native Dialog Wrappers (100% Reliable RFD Native Dialogs)
export async function selectMediaFile(): Promise<string | null> {
  const files = await invoke<string[]>('open_media_files_native');
  return files.length > 0 ? files[0] : null;
}

export async function selectMultipleMediaFiles(): Promise<string[]> {
  return await invoke<string[]>('open_media_files_native');
}

export async function selectSubtitleFile(): Promise<string | null> {
  return await invoke<string | null>('open_subtitle_file_native');
}

export async function selectOutputDirectory(): Promise<string | null> {
  return await invoke<string | null>('open_directory_native');
}

export async function saveSubtitleFile(defaultName: string): Promise<string | null> {
  return await invoke<string | null>('save_subtitle_native', { defaultName });
}

// Event Listeners
export async function onEncodeProgress(
  callback: (progress: EncodeProgress) => void
): Promise<UnlistenFn> {
  return await listen<EncodeProgress>('encode-progress', (event) => {
    callback(event.payload);
  });
}

export async function onEncodeLog(
  callback: (log: JobLogMessage) => void
): Promise<UnlistenFn> {
  return await listen<JobLogMessage>('encode-log', (event) => {
    callback(event.payload);
  });
}

export async function onModelDownloadProgress(
  callback: (progress: ModelDownloadProgress) => void
): Promise<UnlistenFn> {
  return await listen<ModelDownloadProgress>('model-download-progress', (event) => {
    callback(event.payload);
  });
}
