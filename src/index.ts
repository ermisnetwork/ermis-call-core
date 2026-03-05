/**
 * Ermis Call Core SDK
 * @module ermis-call-core
 */

// SDK class (high-level wrapper)
export { ErmisCallSDK } from './ErmisCallSDK';
export type {
  ErmisCallConfig,
  ErmisConnectionStats,
  ErmisCallState,
} from './ErmisCallSDK';

// Raw WASM bindings (for advanced usage)
export { ErmisCall, ConnectionStats } from './wasm/ermis_call_node_wasm.js';
export { default as initWasm } from './wasm/ermis_call_node_wasm.js';
export type {
  InitInput,
  InitOutput,
  SyncInitInput,
} from './wasm/ermis_call_node_wasm.js';
