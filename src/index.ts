/**
 * Ermis Call Core SDK
 * @module ermis-call-core
 */

// SDK class (high-level wrapper)
export { ErmisCallSDK } from './ErmisCallSDK';

// Media encoding & decoding
export { MediaStreamSender } from './MediaStreamSender';
export { MediaStreamReceiver } from './MediaStreamReceiver';
export {
  HEVCDecoderConfigurationRecord,
  NALUnitType,
} from './HEVCDecoderConfig';

// Types
export type {
  ErmisCallConfig,
  ErmisConnectionStats,
  ErmisCallState,
  INodeCall,
  VideoConfig,
  AudioConfig,
  TransceiverState,
  IMediaReceiverEvents,
} from './types';
export { FRAME_TYPE } from './types';

// Utilities
export {
  createPacketWithHeader,
  base64Encode,
  replaceCodecNumber,
} from './utils';

// Raw WASM bindings (for advanced usage)
export { ErmisCall, ConnectionStats } from './wasm/ermis_call_node_wasm.js';
export { default as initWasm } from './wasm/ermis_call_node_wasm.js';
export type {
  InitInput,
  InitOutput,
  SyncInitInput,
} from './wasm/ermis_call_node_wasm.js';
