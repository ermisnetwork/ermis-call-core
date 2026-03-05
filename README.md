# ermis-call-core

WebAssembly-based peer-to-peer communication SDK for Ermis Call.

## Installation

```bash
npm install ermis-call-core
```

## Quick Start

```typescript
import { ErmisCallSDK } from 'ermis-call-core';

const sdk = new ErmisCallSDK({
  relayUrl: 'https://test-iroh.ermis.network.:8443',
});

// 1. Initialize WASM module
await sdk.init(wasmUrl);

// 2. Spawn node
await sdk.spawn();

// 3. Get local address to share with peer
const addr = await sdk.getLocalEndpointAddr();

// 4. Connect to peer
await sdk.connect(peerAddr);

// 5. Send / Receive data
sdk.sendFrame(videoData);
sdk.sendAudioFrame(audioData);
sdk.sendControlFrame(controlData);
const data = await sdk.asyncRecv();

// 6. Check connection stats
const stats = sdk.getStats();
console.log('RTT:', stats.rttMs, 'Loss:', stats.packetLoss);

// 7. Cleanup
await sdk.close();
```

## Raw API

For advanced usage, you can access the WASM bindings directly:

```typescript
import { initWasm, ErmisCall } from 'ermis-call-core';

await initWasm(wasmUrl);

const node = new ErmisCall();
await node.spawn(['https://test-iroh.ermis.network.:8443']);
```

## Development

```bash
npm install
npm run build    # Compile TypeScript
npm run watch    # Watch mode
```

## License

MIT
