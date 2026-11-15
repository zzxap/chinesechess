import {createServer} from 'node:http';
import {createChessBackend} from './chess-backend.mjs';

const backend=createChessBackend();
const port=Number(process.env.CHESS_BACKEND_PORT || 16002);
const server=createServer((req,res) => {
  if (new URL(req.url,'http://localhost').pathname!=='/api/ai/analyze') { res.writeHead(404); res.end('Not found'); return; }
  backend.handler(req,res);
});
server.listen(port,'127.0.0.1',() => console.log(`Chess backend: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT','SIGTERM']) {
  process.once(signal,() => { backend.dispose(); server.close(); });
}
server.once('close',backend.dispose);
