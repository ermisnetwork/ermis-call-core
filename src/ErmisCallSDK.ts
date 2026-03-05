/**
 * Ermis Call Core SDK
 *
 * High-level TypeScript wrapper around the ErmisCall WASM module.
 * Usage:
 *   const sdk = new ErmisCallSDK();
 *   await sdk.init(wasmUrl);
 *   await sdk.spawn();
 */

import initWasm, { ErmisCall } from './wasm/ermis_call_node_wasm.js';
import type { InitInput } from './wasm/ermis_call_node_wasm.js';

// ── Types ────────────────────────────────────────────────────────

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

// ── SDK Class ────────────────────────────────────────────────────

export class ErmisCallSDK {
  private node: ErmisCall | null = null;
  private _state: ErmisCallState = 'idle';
  private _initialized = false;
  private relayUrl: string;
  private secretKey?: Uint8Array;

  constructor(config?: ErmisCallConfig) {
    this.relayUrl = config?.relayUrl ?? 'https://test-iroh.ermis.network.:8443';
    this.secretKey = config?.secretKey;
  }

  // ── Getters ──────────────────────────────────────────────────

  get state(): ErmisCallState {
    return this._state;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Step 1: Load the WASM module.
   * @param wasmSource - URL, fetch Response, BufferSource, or WebAssembly.Module
   */
  async init(wasmSource?: InitInput): Promise<void> {
    if (this._initialized) return;
    this._state = 'initializing';
    try {
      await initWasm(wasmSource);
      this._initialized = true;
    } catch (err) {
      this._state = 'error';
      throw err;
    }
  }

  /**
   * Step 2: Create an ErmisCall node and spawn it with the relay URL.
   * Equivalent to:
   *   const node = new ErmisCall();
   *   await node.spawn([relayUrl], secretKey);
   */
  async spawn(): Promise<void> {
    this.ensureInitialized();
    this.node = new ErmisCall();
    await this.node.spawn([this.relayUrl], this.secretKey);
    this._state = 'spawned';
  }

  /**
   * Close the endpoint and free WASM resources.
   */
  async close(): Promise<void> {
    if (!this.node) return;
    try {
      await this.node.closeEndpoint();
    } finally {
      this.node.free();
      this.node = null;
      this._state = 'closed';
    }
  }

  // ── Connection Management ────────────────────────────────────

  /**
   * Get this node's endpoint address (to share with the peer).
   */
  async getLocalEndpointAddr(): Promise<string> {
    return this.getNode().getLocalEndpointAddr();
  }

  /**
   * Connect to a remote peer by address.
   */
  async connect(addr: string): Promise<void> {
    await this.getNode().connect(addr);
    this._state = 'connected';
  }

  /**
   * Accept an incoming connection.
   */
  async acceptConnection(): Promise<void> {
    await this.getNode().acceptConnection();
    this._state = 'connected';
  }

  /**
   * Close the current connection (keeps the endpoint alive).
   */
  closeConnection(): void {
    this.getNode().closeConnection();
    this._state = 'spawned';
  }

  // ── Data Transfer ────────────────────────────────────────────

  /**
   * Send a video frame.
   */
  sendFrame(data: Uint8Array): void {
    this.getNode().sendFrame(data);
  }

  /**
   * Send an audio frame.
   */
  sendAudioFrame(data: Uint8Array): void {
    this.getNode().sendAudioFrame(data);
  }

  /**
   * Send a control frame.
   */
  sendControlFrame(data: Uint8Array): void {
    this.getNode().sendControlFrame(data);
  }

  /**
   * Notify the start of a new Group of Pictures.
   */
  notifyNewGop(): void {
    this.getNode().notifyNewGop();
  }

  /**
   * Begin with a Group of Pictures data.
   */
  beginWithGop(data: Uint8Array): void {
    this.getNode().beginWithGop(data);
  }

  /**
   * Synchronously receive data.
   */
  recv(): Uint8Array {
    return this.getNode().recv();
  }

  /**
   * Asynchronously receive data.
   */
  async asyncRecv(): Promise<Uint8Array> {
    return this.getNode().asyncRecv();
  }

  // ── Network Stats ────────────────────────────────────────────

  /**
   * Get connection statistics.
   */
  getStats(): ErmisConnectionStats {
    const node = this.getNode();
    return {
      rttMs: node.roundTripTime(),
      packetLoss: node.currentPacketLoss(),
      connectionType: node.connectionType(),
    };
  }

  /**
   * Get the raw stats object from WASM.
   */
  getRawStats(): any {
    return this.getNode().getStats();
  }

  /**
   * Get connection type (e.g. 'relay', 'direct').
   */
  connectionType(): string | undefined {
    return this.getNode().connectionType();
  }

  /**
   * Get round-trip time in milliseconds.
   */
  roundTripTime(): number | undefined {
    return this.getNode().roundTripTime();
  }

  /**
   * Get current packet loss ratio.
   */
  currentPacketLoss(): number | undefined {
    return this.getNode().currentPacketLoss();
  }

  /**
   * Notify the node of a network change (e.g. WiFi → cellular).
   */
  networkChange(): void {
    this.getNode().networkChange();
  }

  // ── Internal Helpers ─────────────────────────────────────────

  private ensureInitialized(): void {
    if (!this._initialized) {
      throw new Error('ErmisCallSDK: Must call init() before using the SDK.');
    }
  }

  private getNode(): ErmisCall {
    this.ensureInitialized();
    if (!this.node) {
      throw new Error('ErmisCallSDK: Node not spawned. Call spawn() first.');
    }
    return this.node;
  }
}
