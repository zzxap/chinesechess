import {Pikafish,normalizeFen} from './pikafish.mjs';

export function createChessBackend() {
  const engine=new Pikafish();
  const fallbackJobs=new Map();
  // Start once with the server and retain the process / NNUE in memory across moves.
  engine.ready().catch(error => console.warn('[Pikafish] '+error.message));
  const fallback=fen => {
    const key=normalizeFen(fen), now=Date.now(), cached=fallbackJobs.get(key);
    if (cached && now-cached.time<5000) { return cached.promise; }
    for (const [id,job] of fallbackJobs) { if (now-job.time>=5000) { fallbackJobs.delete(id); } }
    const promise=engine.analyze(key);
    fallbackJobs.set(key,{time:now,promise});
    promise.catch(() => { if (fallbackJobs.get(key)?.promise===promise) { fallbackJobs.delete(key); } });
    return promise;
  };
  const handler=async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    try {
      if (req.method!=='GET') { res.statusCode=405; res.end('Only GET is supported'); return; }
      const url=new URL(req.url,'http://localhost');
      const action=url.searchParams.get('action');
      if (!['queryall','querybest','querypv'].includes(action)) { res.statusCode=400; res.end('Unsupported action'); return; }
      const fen=normalizeFen(url.searchParams.get('board'));
      const respondEngine=result => {
        if (res.destroyed) { return; }
        res.setHeader('X-Analysis-Source','pikafish');
        res.setHeader('X-Analysis-Depth',String(result.depth));
        res.setHeader('X-Analysis-Nodes',String(result.nodes));
        if (result.mate!==null) { res.setHeader('X-Analysis-Mate',String(result.mate)); }
        const score=result.score===null ? '??' : String(result.score);
        if (action==='querybest') { res.end('move:'+result.move); }
        else if (action==='queryall') { res.end(`move:${result.move},score:${score},rank:2,note:Pikafish (1000ms)`); }
        else { res.end(`score:${score},depth:${result.depth},pv:${result.pv.join('|')}`); }
      };
      if (url.searchParams.get('engine')==='pikafish') {
        respondEngine(await fallback(fen)); return;
      }
      const params=new URLSearchParams({action,board:fen.split(' ').slice(0,2).join(' '),learn:'0',showall:'1',egtbmetric:'dtm'});
      const upstream=await fetch('https://www.chessdb.cn/chessdb.php?'+params,{signal:AbortSignal.timeout(8000)});
      if (!upstream.ok) { throw new Error('ChessDB HTTP '+upstream.status); }
      const text=(await upstream.text()).replace(/\0/g,'').trim();
      const missing=text==='unknown' || text==='nobestmove';
      // Missing PV alone does not mean a known cloud best move needs another search.
      if (missing && (action!=='querypv' || fallbackJobs.has(fen))) {
        respondEngine(await fallback(fen));
        return;
      }
      if (res.destroyed) { return; }
      res.setHeader('X-Analysis-Source','chessdb'); res.end(text);
    } catch (error) {
      if (!res.destroyed) { res.statusCode=/FEN/.test(error.message) ? 400 : 502; res.end(error.message); }
    }
  };
  return {handler,dispose:() => engine.dispose()};
}

export function chessBackendPlugin() {
  return {name:'chessdb-pikafish-backend',configureServer(server) {
    const backend=createChessBackend();
    server.middlewares.use('/api/chessdb',backend.handler);
    server.httpServer?.once('close',backend.dispose);
  }};
}
