import { useState, useCallback, useRef, useEffect } from 'react';
import { ErmisCallSDK } from 'ermis-call-core';
import wasmUrl from 'ermis-call-core/wasm/ermis_call_node_wasm_bg.wasm?url';

type LogEntry = {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
};

function App() {
  const [sdk] = useState(() => new ErmisCallSDK());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [localAddr, setLocalAddr] = useState('');
  const [peerAddr, setPeerAddr] = useState('');
  const [state, setState] = useState(sdk.state);
  const [isInCall, setIsInCall] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, message, type }]);
  }, []);

  const updateState = useCallback(() => {
    setState(sdk.state);
  }, [sdk]);

  // ── Actions ──────────────────────────────────────────────────

  const handleInit = async () => {
    try {
      log('Initializing WASM module...');
      await sdk.init(wasmUrl);
      updateState();
      log('WASM initialized successfully!', 'success');
    } catch (err: any) {
      log(`Init failed: ${err.message}`, 'error');
    }
  };

  const handleSpawn = async () => {
    try {
      log('Spawning node...');
      await sdk.spawn();
      updateState();
      log('Node spawned!', 'success');
    } catch (err: any) {
      log(`Spawn failed: ${err.message}`, 'error');
    }
  };

  const handleGetAddress = async () => {
    try {
      const addr = await sdk.getLocalEndpointAddr();
      setLocalAddr(addr);
      log(`Local addr: ${addr}`, 'success');
    } catch (err: any) {
      log(`Get address failed: ${err.message}`, 'error');
    }
  };

  const getLocalMedia = async (): Promise<MediaStream> => {
    log('Getting camera & microphone...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    log('Local media acquired', 'success');
    return stream;
  };

  const receiverEvents = {
    onConnected: () => log('Peer connected!', 'success'),
    onTransceiverState: (s: any) => {
      log(`Transceiver: audio=${s.audio_enable}, video=${s.video_enable}`);
    },
    onRequestKeyFrame: () => {
      log('Peer requested keyframe');
      sdk.requestKeyFrame();
    },
    onEndCall: () => {
      log('Peer ended call', 'info');
      handleEndCall();
    },
  };

  // ── User B (Caller): Connect → encode → decode ──────────────
  const handleStartAsCaller = async () => {
    if (!peerAddr.trim()) {
      log('Please paste the callee address first', 'error');
      return;
    }
    try {
      const stream = await getLocalMedia();

      log('Connecting & starting call as Caller (B)...');
      const remoteStream = await sdk.startAsCaller(
        peerAddr,
        stream,
        'video',
        receiverEvents,
      );

      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      setIsInCall(true);
      updateState();
      log('Call started! Sending & receiving media.', 'success');
    } catch (err: any) {
      log(`Caller start failed: ${err.message}`, 'error');
    }
  };

  // ── User A (Callee): Accept → decode → encode ──────────────
  const handleStartAsCallee = async () => {
    try {
      const stream = await getLocalMedia();

      log('Waiting for caller to connect (Callee A)...');
      const remoteStream = await sdk.startAsCallee(
        stream,
        'video',
        receiverEvents,
      );

      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      setIsInCall(true);
      updateState();
      log('Call connected! Sending & receiving media.', 'success');
    } catch (err: any) {
      log(`Callee start failed: ${err.message}`, 'error');
    }
  };

  // ── End Call ─────────────────────────────────────────────────
  const handleEndCall = async () => {
    try {
      log('Ending call...');

      // Stop local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      await sdk.close();
      setLocalAddr('');
      setIsInCall(false);
      updateState();
      log('Call ended.', 'success');
    } catch (err: any) {
      log(`End call failed: ${err.message}`, 'error');
    }
  };

  const handleGetStats = () => {
    try {
      const stats = sdk.getStats();
      log(
        `Stats — RTT: ${stats.rttMs ?? 'N/A'}ms | Loss: ${stats.packetLoss ?? 'N/A'} | Type: ${stats.connectionType ?? 'N/A'}`,
        'info',
      );
    } catch (err: any) {
      log(`Stats failed: ${err.message}`, 'error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sdk.close().catch(() => { });
    };
  }, [sdk]);

  // ── State helpers ───────────────────────────────────────────

  const stateColor: Record<string, string> = {
    idle: 'bg-gray-500',
    initializing: 'bg-yellow-500',
    spawned: 'bg-blue-500',
    connected: 'bg-green-500',
    closed: 'bg-gray-600',
    error: 'bg-red-500',
  };

  const isReady = sdk.initialized && state === 'spawned';

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Ermis Call Core
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">SDK Demo — P2P Bidirectional Call</p>
          </div>
          <span
            className={`${stateColor[state] || 'bg-gray-500'} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider`}
          >
            {state}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Step 1 & 2: Init + Spawn */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">1. Setup</h2>
          <div className="flex gap-3">
            <button
              onClick={handleInit}
              disabled={sdk.initialized}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Init WASM
            </button>
            <button
              onClick={handleSpawn}
              disabled={!sdk.initialized || state === 'spawned' || state === 'connected'}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Spawn Node
            </button>
          </div>
        </section>

        {/* Step 2: Start Call — Two Columns */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">2. Start Call</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column A: Callee */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
              <div className="text-base font-semibold text-blue-400">📥 User A — Callee</div>
              <p className="text-xs text-gray-400">Get address → share with B → Accept → Decode & Encode</p>

              {/* Get Address button + display */}
              <button
                onClick={handleGetAddress}
                disabled={state !== 'spawned' && state !== 'connected'}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                🔗 Get Address
              </button>
              {localAddr && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 block rounded-lg bg-black/30 px-3 py-2 text-xs text-emerald-400 font-mono break-all">
                    {localAddr}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(localAddr); log('Address copied!', 'success'); }}
                    className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              )}

              {!isInCall ? (
                <button
                  onClick={handleStartAsCallee}
                  disabled={!isReady}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  📥 Wait & Accept Call
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleGetStats} className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-500 transition-colors cursor-pointer">📊 Stats</button>
                  <button onClick={handleEndCall} className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-red-600 hover:bg-red-500 transition-colors cursor-pointer">✕ End</button>
                </div>
              )}
            </div>

            {/* Column B: Caller */}
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
              <div className="text-base font-semibold text-violet-400">📤 User B — Caller</div>
              <p className="text-xs text-gray-400">Get media → Encode → Connect to A → Decode A's stream</p>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Callee's address (from A)</label>
                <input
                  type="text"
                  value={peerAddr}
                  onChange={(e) => setPeerAddr(e.target.value)}
                  placeholder="Paste A's address here..."
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>
              {!isInCall ? (
                <button
                  onClick={handleStartAsCaller}
                  disabled={!isReady || !peerAddr.trim()}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  📤 Connect & Start Call
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleGetStats} className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-500 transition-colors cursor-pointer">📊 Stats</button>
                  <button onClick={handleEndCall} className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-red-600 hover:bg-red-500 transition-colors cursor-pointer">✕ End</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Video Preview */}
        {(isInCall || state === 'connected') && (
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">3. Video</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Local Preview</label>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-video rounded-lg bg-black/50 object-cover"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Remote Stream</label>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video rounded-lg bg-black/50 object-cover"
                />
              </div>
            </div>
          </section>
        )}

        {/* Logs */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-200">Logs</h2>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="rounded-lg bg-black/40 p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 && (
              <p className="text-gray-500 italic">No logs yet. Click "Init WASM" to start.</p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500 shrink-0">[{entry.time}]</span>
                <span
                  className={
                    entry.type === 'success'
                      ? 'text-emerald-400'
                      : entry.type === 'error'
                        ? 'text-red-400'
                        : 'text-gray-300'
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Flow Diagram */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Flow</h2>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
            <div className="space-y-1">
              <div className="text-blue-400 font-semibold text-sm mb-2">User A (Callee)</div>
              <div>1. Init WASM</div>
              <div>2. Spawn Node</div>
              <div>3. Get address → share with User B</div>
              <div>4. Click "Wait for Caller & Start Call"</div>
              <div className="text-gray-500 italic pl-3">→ getUserMedia</div>
              <div className="text-gray-500 italic pl-3">→ initDecoders + acceptConnection</div>
              <div className="text-gray-500 italic pl-3">→ initEncoders + sendConfigs</div>
              <div>5. Bidirectional video/audio ✅</div>
            </div>
            <div className="space-y-1">
              <div className="text-violet-400 font-semibold text-sm mb-2">User B (Caller)</div>
              <div>1. Init WASM</div>
              <div>2. Spawn Node</div>
              <div>3. Paste User A's address</div>
              <div>4. Click "Connect & Start Call"</div>
              <div className="text-gray-500 italic pl-3">→ getUserMedia</div>
              <div className="text-gray-500 italic pl-3">→ initEncoders + connect + sendConfigs</div>
              <div className="text-gray-500 italic pl-3">→ initDecoders (receive loop)</div>
              <div>5. Bidirectional video/audio ✅</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
