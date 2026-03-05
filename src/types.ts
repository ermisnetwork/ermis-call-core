/**
 * Ermis Call Core — Type Definitions
 */

// ── Node Call Interface ──────────────────────────────────────────

export type INodeCall = {
  connect: (address: string) => Promise<void>;
  acceptConnection: () => Promise<void>;
  sendControlFrame: (packet: Uint8Array) => Promise<void>;
  sendAudioFrame: (packet: Uint8Array) => Promise<void>;
  sendFrame: (packet: Uint8Array) => Promise<void>;
  beginWithGop: (packet: Uint8Array) => Promise<void>;
  asyncRecv: () => Promise<Uint8Array>;
};

// ── Media Configs ────────────────────────────────────────────────

export type VideoConfig = {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  frameRate?: number;
  orientation?: number;
  rotation?: number;
  description?: any;
};

export type AudioConfig = {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  description?: string;
};

export type TransceiverState = {
  audio_enable: boolean;
  video_enable: boolean;
};

// ── Receiver Events ──────────────────────────────────────────────

export interface IMediaReceiverEvents {
  onConnected?: () => void;
  onTransceiverState?: (state: any) => void;
  onRequestConfig?: () => void;
  onRequestKeyFrame?: () => void;
  onEndCall?: () => void;
}

// ── Frame Type Enum ──────────────────────────────────────────────

export enum FRAME_TYPE {
  VIDEO_CONFIG = 0,
  AUDIO_CONFIG = 1,
  VIDEO_KEY = 2,
  VIDEO_DELTA = 3,
  AUDIO = 4,
  ORIENTATION = 5,
  CONNECTED = 6,
  TRANSCEIVER_STATE = 7,
  REQUEST_CONFIG = 8,
  REQUEST_KEY_FRAME = 9,
  END_CALL = 10,
}

// ── SDK Config ───────────────────────────────────────────────────

export interface ErmisCallConfig {
  /** Relay server URL. Default: 'https://test-iroh.ermis.network.:8443' */
  relayUrl?: string;
  /** Optional secret key for spawning */
  secretKey?: Uint8Array;
}

export interface ErmisConnectionStats {
  rttMs?: number;
  packetLoss?: number;
  connectionType?: string;
}

export type ErmisCallState =
  | 'idle'
  | 'initializing'
  | 'spawned'
  | 'connected'
  | 'closed'
  | 'error';
