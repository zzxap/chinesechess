/* Application bridge to the unmodified GPL-3.0 Fairy-Stockfish runtime. */
let engine;
let initialized = false;
let xiangqi = false;
let request;

self.onmessage = async ({data}) => {
  if (data.type !== 'analyze' || initialized) { return; }
  initialized = true;
  request = data;
  try {
    if (!self.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
      throw new Error('需要 COOP/COEP 跨源隔离，请重启 pnpm dev 后刷新页面');
    }
    importScripts('./stockfish.js');
    const base = new URL('./', self.location.href).href;
    engine = await Stockfish({
      locateFile: name => base + name,
      mainScriptUrlOrBlob: base + 'stockfish.js',
    });
    engine.addMessageListener(line => {
      line = String(line);
      if (line.startsWith('option name UCI_Variant ')) {
        xiangqi = /(?:^|\s)var xiangqi(?:\s|$)/.test(line);
      }
      if (line === 'uciok') {
        if (!xiangqi) {
          self.postMessage({type:'error', message:'当前 WASM 未包含 xiangqi 规则'});
          engine.terminate(); return;
        }
        for (const command of [
          'setoption name UCI_Variant value xiangqi',
          'setoption name Use NNUE value false',
          'setoption name Threads value 1',
          'setoption name Hash value 32',
          'setoption name MultiPV value 3',
          'ucinewgame',
          'isready',
        ]) { engine.postMessage(command); }
      } else if (line === 'readyok') {
        self.postMessage({type:'ready'});
        engine.postMessage('position fen ' + request.fen);
        engine.postMessage('go movetime ' + request.budgetMs);
      } else if (line.startsWith('info ') || line.startsWith('bestmove ')) {
        self.postMessage({type:'line', line});
      }
    });
    engine.postMessage('uci');
  } catch (error) {
    self.postMessage({type:'error',message:error instanceof Error ? error.message : String(error)});
    if (engine) { engine.terminate(); }
  }
};
