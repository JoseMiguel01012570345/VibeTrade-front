export type VoiceMicroPalette = {
  played: string;
  unplayed: string;
  thumb: string;
  thumbStroke: string;
};

export type ChatVoiceRecorderSession = {
  start: () => Promise<void>;
  stop: () => void;
  /** Abort without emitting a blob (ej. cleanup del efecto). */
  destroy: () => void;
};

export type ChatVoiceRecorderHandlers = {
  onProgressSec: (sec: number) => void;
  onEnd: (blob: Blob, seconds: number) => void;
  onStartFailed: () => void;
};
