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
import { MediaStreamSender } from './MediaStreamSender';
import { MediaStreamReceiver } from './MediaStreamReceiver';
import type {
  ErmisCallConfig,
  ErmisConnectionStats,
  ErmisCallState,
  INodeCall,
  IMediaReceiverEvents,
} from './types';

// ── SDK Class ────────────────────────────────────────────────────

export class ErmisCallSDK implements INodeCall {
  private node: ErmisCall | null = null;
  private _state: ErmisCallState = 'idle';
  private _initialized = false;
  private relayUrl: string;
  private secretKey?: Uint8Array;

  /** MediaStreamSender for encoding and sending media tracks */
  public sender: MediaStreamSender;

  /** MediaStreamReceiver for receiving and decoding media tracks */
  public receiver: MediaStreamReceiver;

  constructor(config?: ErmisCallConfig) {
    this.relayUrl = config?.relayUrl ?? 'https://test-iroh.ermis.network.:8443';
    this.secretKey = config?.secretKey;
    this.sender = new MediaStreamSender(this);
    this.receiver = new MediaStreamReceiver(this);
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
    // Stop encoders and decoders first
    this.sender.stop();
    this.receiver.stop();

    if (!this.node) return;
    try {
      await this.node.closeEndpoint();
    } finally {
      this.node.free();
      this.node = null;
      this._state = 'closed';
    }
  }

  // ── Connection Management (INodeCall) ────────────────────────

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
   * Get this node's endpoint address (to share with the peer).
   */
  async getLocalEndpointAddr(): Promise<string> {
    return this.getNode().getLocalEndpointAddr();
  }

  /**
   * Close the current connection (keeps the endpoint alive).
   */
  closeConnection(): void {
    this.getNode().closeConnection();
    this._state = 'spawned';
  }

  // ── Data Transfer (INodeCall) ────────────────────────────────

  /**
   * Send a video frame.
   */
  async sendFrame(data: Uint8Array): Promise<void> {
    this.getNode().sendFrame(data);
  }

  /**
   * Send an audio frame.
   */
  async sendAudioFrame(data: Uint8Array): Promise<void> {
    this.getNode().sendAudioFrame(data);
  }

  /**
   * Send a control frame.
   */
  async sendControlFrame(data: Uint8Array): Promise<void> {
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
  async beginWithGop(data: Uint8Array): Promise<void> {
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

  // ── Media Encoding (via MediaStreamSender) ───────────────────

  /**
   * Initialize encoders for a MediaStream (audio + video tracks).
   * This sets up WebCodecs VideoEncoder & AudioEncoder.
   */
  initEncoders(stream: MediaStream): void {
    this.sender.initEncoders(stream);
  }

  /**
   * Initialize only the video encoder for a specific track.
   */
  initVideoEncoder(videoTrack: MediaStreamTrack): void {
    this.sender.initVideoEncoder(videoTrack);
  }

  /**
   * Initialize only the audio encoder for a specific track.
   */
  initAudioEncoder(audioTrack: MediaStreamTrack): void {
    this.sender.initAudioEncoder(audioTrack);
  }

  /**
   * Replace the current video track (e.g. camera switch).
   */
  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    await this.sender.replaceVideoTrack(track);
  }

  /**
   * Replace the current audio track.
   */
  async replaceAudioTrack(track: MediaStreamTrack): Promise<void> {
    await this.sender.replaceAudioTrack(track);
  }

  /**
   * Request a keyframe to be sent immediately.
   */
  requestKeyFrame(): void {
    this.sender.requestKeyFrame();
  }

  /**
   * Connect to peer and start sending encoded media.
   */
  async connectAndSend(address: string): Promise<void> {
    await this.sender.connect(address);
  }

  // ── Media Decoding (via MediaStreamReceiver) ─────────────────

  /**
   * Initialize decoders and start receiving loop.
   * @param callType - 'video' or 'audio'
   */
  initDecoders(callType: string): void {
    this.receiver.initDecoders(callType);
  }

  /**
   * Get the remote MediaStream (decoded audio + video tracks).
   */
  getRemoteStream(): MediaStream | null {
    return this.receiver.getRemoteStream();
  }

  /**
   * Accept incoming connection and start receive.
   */
  async acceptAndReceive(): Promise<void> {
    await this.receiver.acceptConnection();
  }

  /**
   * Set event callbacks for receiver (onConnected, onEndCall, etc.).
   */
  setReceiverEvents(events: IMediaReceiverEvents): void {
    this.receiver = new MediaStreamReceiver(this, events);
  }

  // ── High-Level Bidirectional Call Methods ──────────────────────

  /**
   * User B (Caller) flow: Connect → encode local stream → decode remote stream.
   *
   * Steps:
   *   1. Init encoders from local MediaStream (video + audio)
   *   2. Connect to callee's address
   *   3. Send 'connected' signal, transceiver state, and codec configs
   *   4. Set up receiver events and init decoders (receive loop)
   *   5. Return the remote MediaStream for rendering
   *
   * @param peerAddr - The callee's endpoint address
   * @param stream - Local MediaStream from getUserMedia
   * @param callType - 'video' or 'audio' (default: 'video')
   * @param events - Optional receiver event callbacks
   * @returns The remote MediaStream to attach to a <video>/<audio> element
   */
  async startAsCaller(
    peerAddr: string,
    stream: MediaStream,
    callType: string = 'video',
    events?: IMediaReceiverEvents,
  ): Promise<MediaStream | null> {
    this.ensureInitialized();
    if (!this.node) throw new Error('ErmisCallSDK: Call spawn() first.');

    // 1. Init encoders (set up WebCodecs VideoEncoder & AudioEncoder)
    this.sender.initEncoders(stream);

    // 2. Connect to callee
    await this.connect(peerAddr);

    // 3. Send 'connected' signal + transceiver state + codec configs
    await this.sender.sendConnected();
    await this.sender.sendConfigs();

    // 4. Set up receiver events and init decoders
    if (events) {
      this.receiver = new MediaStreamReceiver(this, events);
    }
    this.receiver.initDecoders(callType);

    this._state = 'connected';

    // 5. Return remote stream
    return this.receiver.getRemoteStream();
  }

  /**
   * User A (Callee) flow: Accept connection → decode remote stream → encode local stream.
   *
   * Steps:
   *   1. Set up receiver events and init decoders (receive loop)
   *   2. Accept incoming connection from caller
   *   3. Init encoders from local MediaStream (video + audio)
   *   4. Send 'connected' signal, transceiver state, and codec configs
   *   5. Return the remote MediaStream for rendering
   *
   * @param stream - Local MediaStream from getUserMedia
   * @param callType - 'video' or 'audio' (default: 'video')
   * @param events - Optional receiver event callbacks
   * @returns The remote MediaStream to attach to a <video>/<audio> element
   */
  async startAsCallee(
    stream: MediaStream,
    callType: string = 'video',
    events?: IMediaReceiverEvents,
  ): Promise<MediaStream | null> {
    this.ensureInitialized();
    if (!this.node) throw new Error('ErmisCallSDK: Call spawn() first.');

    // 1. Set up receiver events and init decoders
    if (events) {
      this.receiver = new MediaStreamReceiver(this, events);
    }
    this.receiver.initDecoders(callType);

    // 2. Accept incoming connection
    await this.acceptConnection();

    // 3. Init encoders (set up WebCodecs VideoEncoder & AudioEncoder)
    this.sender.initEncoders(stream);

    // 4. Send 'connected' signal + transceiver state + codec configs
    await this.sender.sendConnected();
    await this.sender.sendConfigs();

    this._state = 'connected';

    // 5. Return remote stream
    return this.receiver.getRemoteStream();
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
