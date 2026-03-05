/// <reference types="vite/client" />

declare module '*.wasm?url' {
  const url: string;
  export default url;
}

declare module 'ermis-call-core' {
  export { ErmisCallSDK } from '../../src/ErmisCallSDK';
  export type {
    ErmisCallConfig,
    ErmisConnectionStats,
    ErmisCallState,
  } from '../../src/ErmisCallSDK';
  export {
    ErmisCall,
    ConnectionStats,
  } from '../../src/wasm/ermis_call_node_wasm.js';
  export { default as initWasm } from '../../src/wasm/ermis_call_node_wasm.js';
}

declare module 'ermis-call-core/wasm/ermis_call_node_wasm_bg.wasm?url' {
  const url: string;
  export default url;
}
