import {applyMove, legalMoves, opposite} from './engine';
import type {Analysis, Board, Move, Side} from './engine';
import {fromUci, toFen, toUci} from './fen';
import {requestAnalysis} from './aiTransport';

const same=(a: Move,b: Move) => a.from===b.from && a.to===b.to;
const empty=(): Analysis => ({move:null,score:0,depth:0,nodes:0,line:[],source:'ai',engineName:'AI库'});
const finite=(value: unknown): value is number => typeof value==='number' && Number.isFinite(value);

export async function suggest(board: Board,side: Side,cancelled: () => boolean,onProgress: (a: Analysis) => void): Promise<Analysis> {
  const legal=legalMoves(board,side);
  if (!legal.length || cancelled()) { return empty(); }
  const fen=toFen(board,side);
  const controller=new AbortController();
  const timeout=setTimeout(() => controller.abort(),20000);
  const cancellation=setInterval(() => { if (cancelled()) { controller.abort(); } },80);
  try {
    const payload=await requestAnalysis(fen,cancelled,controller.signal);
    if (cancelled()) { return empty(); }
    if (!payload || typeof payload!=='object') { throw new Error('AI库返回了无效结果'); }
    const data=payload as Record<string, unknown>;
    if (data.fen!==fen) { throw new Error('AI库结果与当前局面不一致，请重新分析'); }
    const move=typeof data.move==='string' ? fromUci(data.move) : null;
    if (!move || !legal.some(m => same(m,move))) { throw new Error('AI库未返回当前局面的合法着法'); }
    let position=board,turn=side;
    const line: Move[]=[];
    for (const token of (Array.isArray(data.pv) ? data.pv : []).slice(0,12)) {
      const next=typeof token==='string' ? fromUci(token) : null;
      if (!next || !legalMoves(position,turn).some(m => same(m,next))) { break; }
      line.push(next); position=applyMove(position,next); turn=opposite(turn);
    }
    const scoreKnown=finite(data.score);
    const result: Analysis={move,score:finite(data.score) ? data.score : 0,scoreKnown,
      depth:finite(data.depth) ? data.depth : 0,depthKnown:finite(data.depth) && data.depth>0,
      nodes:finite(data.nodes) ? data.nodes : 0,mate:finite(data.mate) ? data.mate : undefined,
      line:line.length && same(line[0],move) ? line : [move],source:'ai',engineName:'AI库',
      positionFen:fen,remoteMove:toUci(move)};
    if (!cancelled()) { onProgress(result); }
    return result;
  } catch (error) {
    if (cancelled()) { return empty(); }
    if (controller.signal.aborted) { throw new Error('AI库分析超时，请重试'); }
    throw error instanceof Error ? error : new Error('AI库连接失败，请检查本地服务');
  } finally { clearTimeout(timeout); clearInterval(cancellation); }
}
