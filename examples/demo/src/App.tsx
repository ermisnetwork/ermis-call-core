import { useState, useCallback } from 'react';
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
      const addr = await sdk.getLocalEndpointAddr();
      setLocalAddr(addr);
      updateState();
      log(`Node spawned! Local addr: ${addr}`, 'success');
    } catch (err: any) {
      log(`Spawn failed: ${err.message}`, 'error');
    }
  };

  const handleConnect = async () => {
    if (!peerAddr.trim()) {
      log('Please enter a peer address', 'error');
      return;
    }
    try {
      log(`Connecting to ${peerAddr}...`);
      await sdk.connect(peerAddr);
      updateState();
      log('Connected!', 'success');
    } catch (err: any) {
      log(`Connect failed: ${err.message}`, 'error');
    }
  };

  const handleAccept = async () => {
    try {
      log('Waiting for incoming connection...');
      await sdk.acceptConnection();
      updateState();
      log('Connection accepted!', 'success');
    } catch (err: any) {
      log(`Accept failed: ${err.message}`, 'error');
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

  const handleClose = async () => {
    try {
      log('Closing...');
      await sdk.close();
      setLocalAddr('');
      updateState();
      log('Closed.', 'success');
    } catch (err: any) {
      log(`Close failed: ${err.message}`, 'error');
    }
  };

  const handleClearLogs = () => setLogs([]);

  // ── State badge color ────────────────────────────────────────

  const stateColor: Record<string, string> = {
    idle: 'bg-gray-500',
    initializing: 'bg-yellow-500',
    spawned: 'bg-blue-500',
    connected: 'bg-green-500',
    closed: 'bg-gray-600',
    error: 'bg-red-500',
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Ermis Call Core
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">SDK Demo</p>
          </div>
          <span
            className={`${stateColor[state] || 'bg-gray-500'} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider`}
          >
            {state}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Action Buttons */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Controls</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={handleInit}
              disabled={sdk.initialized}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              1. Init WASM
            </button>
            <button
              onClick={handleSpawn}
              disabled={!sdk.initialized || state === 'spawned' || state === 'connected'}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              2. Spawn Node
            </button>
            <button
              onClick={handleConnect}
              disabled={state !== 'spawned'}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              3. Connect
            </button>
            <button
              onClick={handleAccept}
              disabled={state !== 'spawned'}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Accept Connection
            </button>
            <button
              onClick={handleGetStats}
              disabled={state !== 'connected'}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Get Stats
            </button>
            <button
              onClick={handleClose}
              disabled={state === 'idle' || state === 'closed'}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </section>

        {/* Connection Info */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">Connection</h2>

          {/* Local address */}
          {localAddr && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Your endpoint address
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 block rounded-lg bg-black/30 px-3 py-2 text-sm text-emerald-400 font-mono break-all">
                  {localAddr}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(localAddr);
                    log('Address copied!', 'success');
                  }}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Peer address input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Peer address
            </label>
            <input
              type="text"
              value={peerAddr}
              onChange={(e) => setPeerAddr(e.target.value)}
              placeholder="Paste peer endpoint address here..."
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </section>

        {/* Logs */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-200">Logs</h2>
            <button
              onClick={handleClearLogs}
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
      </main>
    </div>
  );
}

export default App;
