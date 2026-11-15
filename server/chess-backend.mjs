import {AIEngine,normalizeFen} from './ai-engine.mjs';

export function createChessBackend() {
  const engine=new AIEngine();
  const jobs=new Map();
  engine.ready().catch(error => console.warn('[AI库] '+error.message));
  const analyze=fen => {
    const now=Date.now(),cached=jobs.get(fen);
    if (cached && now-cached.time<5000) { return cached.promise; }
    for (const [id,job] of jobs) { if (now-job.time>=5000) { jobs.delete(id); } }
    const promise=engine.analyze(fen);
    jobs.set(fen,{time:now,promise});
    promise.catch(() => { if (jobs.get(fen)?.promise===promise) { jobs.delete(fen); } });
    return promise;
  };
  const handler=async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    const send=(status,body) => { if (!res.destroyed) { res.statusCode=status; res.end(JSON.stringify(body)); } };
    let fen;
    try {
      const route=new URL(req.url,'http://localhost').pathname;
      if (!['/analyze','/api/ai/analyze'].includes(route)) { send(404,{error:'Not found'}); return; }
      if (req.method!=='POST') { res.setHeader('Allow','POST'); send(405,{error:'Only POST is supported'}); return; }
      const chunks=[];
      let size=0;
      for await (const chunk of req) {
        size+=chunk.length;
        if (size>4096) { throw new Error('请求内容过长'); }
        chunks.push(chunk);
      }
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      fen=normalizeFen(body?.fen);
    } catch (error) { send(400,{error:error instanceof SyntaxError ? '请求必须为 JSON' : error.message}); return; }
    try { send(200,await analyze(fen)); }
    catch (error) { send(502,{error:String(error.message).replace(/pikafish/gi,'AI库')}); }
  };
  return {handler,dispose:() => engine.dispose()};
}

export function chessBackendPlugin() {
  return {name:'local-ai-backend',configureServer(server) {
    const backend=createChessBackend();
    server.middlewares.use('/api/ai',backend.handler);
    server.httpServer?.once('close',backend.dispose);
  }};
}
