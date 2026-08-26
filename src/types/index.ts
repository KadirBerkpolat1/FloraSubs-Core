export interface GpuDevice {
  name: string;
  vendor: 'nvidia' | 'amd' | 'intel' | 'apple' | 'generic';
}

export interface EncoderOption {
  id: string;
  name: string;
  family: 'h264' | 'hevc' | 'av1' | 'vp9';
  hardware_type: 'cpu' | 'nvidia' | 'amd' | 'intel' | 'apple' | 'vaapi';
  is_available: boolean;
  description: string;
}

export interface HardwareProfile {
  gpus: GpuDevice[];
  cpu_name: string;
  cpu_threads: number;
  supported_encoders: EncoderOption[];
  recommended_encoder: string;
  ffmpeg_path: string | null;
  ffmpeg_version: string | null;
}

export interface VideoStreamInfo {
  index: number;
  codec: string;
  width: number;
  height: number;
  fps: number;
  pix_fmt: string;
  bitrate: number | null;
}

export interface AudioStreamInfo {
  index: number;
  audio_index: number;
  codec: string;
  language: string;
  title: string;
  channels: number;
  sample_rate: number;
  bitrate: number | null;
  is_default: boolean;
}

export interface SubtitleStreamInfo {
  index: number;
  subtitle_index: number;
  codec: string;
  language: string;
  title: string;
  is_default: boolean;
  is_forced: boolean;
}

export interface AttachmentInfo {
  index: number;
  filename: string;
  mime_type: string;
  is_font: boolean;
}

export interface ExtractedTrackResult {
  stream_index: number;
  subtitle_index: number;
  language: string;
  title: string;
  output_path: string;
  format: string;
}

export interface SubtitleDialogue {
  start: number;
  end: number;
  text: string;
  raw_text: string;
  style: string;
}

export interface MediaMetadata {
  file_path: string;
  file_name: string;
  file_size: number;
  duration_secs: number;
  duration_formatted: string;
  video_stream: VideoStreamInfo | null;
  audio_streams: AudioStreamInfo[];
  subtitle_streams: SubtitleStreamInfo[];
  attachments: AttachmentInfo[];
  font_count: number;
}

export interface ModelSettings {
  upscale_enabled: boolean;
  upscale_model: string;
  backend: string;
  frame_gen_enabled: boolean;
  frame_gen_model: string;
  target_fps: number;
  target_height: number | null;
}

export interface FilterSettings {
  line_darkening_enabled: boolean;
  line_darkening_value: number;
  sharpness_enabled: boolean;
  sharpness_value: number;
  grain_enabled: boolean;
  grain_value: number;
}

export interface EncodeJobConfig {
  id: string;
  input_path: string;
  output_path: string;
  container: string;
  encoder: string;
  threads: number; // 0 = auto, 1-32
  use_bitrate: boolean;
  average_bitrate_kbps: number;
  crf: number;
  preset: string;
  pixel_format: string;
  b_frames: number;
  custom_video_args: string | null;
  audio_track_index: number;
  audio_codec: string;
  audio_bitrate_kbps: number;
  hardsub_enabled: boolean;
  subtitle_source: 'embedded' | 'external' | 'none';
  subtitle_track_index: number | null;
  external_subtitle_path: string | null;
  resolved_subtitle_path: string | null;
  fonts_dir: string | null;
  intro_enabled: boolean;
  intro_video_path: string | null;
  model_settings: ModelSettings;
  filter_settings: FilterSettings;
  faststart: boolean;
}

export interface PresetProfile {
  id: string;
  name: string;
  description: string;
  container: string;
  encoder: string;
  use_bitrate: boolean;
  average_bitrate_kbps: number;
  crf: number;
  preset: string;
  pixel_format: string;
  audio_codec: string;
  audio_bitrate_kbps: number;
  b_frames: number;
  faststart: boolean;
}

export interface AiModelInfo {
  id: string;
  name: string;
  category: string;
  format: string;
  filename: string;
  download_url: string;
  size_mb: number;
  is_downloaded: boolean;
}

export interface ModelDownloadProgress {
  model_id: string;
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  status: 'downloading' | 'completed' | 'error';
  error: string | null;
}

export interface EncodeProgress {
  job_id: string;
  frame: number;
  fps: number;
  q: number;
  size_bytes: number;
  time_secs: number;
  time_formatted: string;
  bitrate_kbps: number;
  speed: number;
  percentage: number;
  eta_secs: number;
  eta_formatted: string;
  elapsed_secs: number;
  elapsed_formatted: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';
  error_message: string | null;
}

export interface JobLogMessage {
  job_id: string;
  line: string;
  stream: 'stdout' | 'stderr' | 'system';
  timestamp: string;
}

export interface QueueItem {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  metadata: MediaMetadata | null;
  status: 'waiting' | 'encoding' | 'paused' | 'completed' | 'error';
  progress: EncodeProgress;
  config: EncodeJobConfig;
}
