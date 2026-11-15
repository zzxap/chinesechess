import {applyMove, legalMoves, opposite} from './engine';
import type {Analysis, Board, Candidate, Move, Side} from './engine';
import {fromUci, toFen} from './fen';
import {suggestCloud} from './cloud';
import type {AnalysisMode} from './analysisMode';
import {classicSuggestion} from './classicOpenings';
import type {OpeningStyle} from './classicOpenings';

type Variation = Candidate & {depth: number; nodes: number; mate?: number};
const engineName='Fairy-Stockfish WASM 1.1.12 · 经典评估';
const sameMove=(a: Move,b: Move) => a.from===b.from && a.to===b.to;

function parseLine(board: Board,side: Side,text: string): Variation | null {
  const depth=/\bdepth (\d+)/.exec(text), score=/\bscore (cp|mate) (-?\d+)/.exec(text);
  const pv=/\bpv (.+)$/.exec(text);
  if (!depth || !score || !pv || /\b(lowerbound|upperbound)\b/.test(text)) { return null; }
  let position=board,turn=side;
  const line: Move[]=[];
  for (const token of pv[1].trim().split(/\s+/).slice(0,12)) {
    const move=fromUci(token);
    if (!move || !legalMoves(position,turn).some(m => sameMove(m,move))) { break; }
    line.push(move); position=applyMove(position,move); turn=opposite(turn);
  }
  if (!line.length) { return null; }
  const mate=score[1]==='mate' ? Number(score[2]) : undefined;
  return {move:line[0],line,depth:Number(depth[1]),nodes:Number(/\bnodes (\d+)/.exec(text)?.[1] ?? 0),
    score:mate===undefined ? Number(score[2]) : Math.sign(mate)*(100000-Math.abs(mate)),mate};
}

export async function suggest(board: Board,side: Side,cancelled: () => boolean,onProgress: (a: Analysis) => void,_maxDepth=6,budgetMs=3000,mode: AnalysisMode='local',openingStyle: OpeningStyle='classic'): Promise<Analysis> {
  if (mode==='pikafish') { return suggestCloud(board,side,cancelled,onProgress,true); }
  if (mode==='cloud') { return suggestCloud(board,side,cancelled,onProgress); }
  const book=cancelled() ? null : classicSuggestion(board,side,openingStyle);
  if (book && !cancelled()) { onProgress(book); return book; }
  if (!window.crossOriginIsolated || typeof SharedArrayBuffer==='undefined') {
    throw new Error('WASM 需要跨源隔离，请停止并重启 pnpm dev，再刷新页面');
  }
  const legal=legalMoves(board,side);
  if (!legal.length || cancelled()) { return {move:null,score:0,depth:0,nodes:0,line:[],source:'fairy',engineName}; }
  return new Promise<Analysis>((resolve,reject) => {
    const worker=new Worker('/engines/fairy-stockfish/fairy-bridge.js');
    const depths=new Map<number,Map<number,Variation>>();
    const count=Math.min(3,legal.length);
    let latest: Analysis | null=null,settled=false;
    let timeout: ReturnType<typeof setTimeout>;
    let cancelTimer: ReturnType<typeof setInterval>;
    const cleanup=() => { worker.terminate(); clearTimeout(timeout); clearInterval(cancelTimer); };
    const fail=(message: string) => {
      if (settled) { return; } settled=true; cleanup(); reject(new Error(message));
    };
    const finish=(a: Analysis) => {
      if (settled) { return; } settled=true; cleanup(); resolve(a);
    };
    const analysisFrom=(variation: Variation,variations: Variation[]): Analysis => ({
      ...variation,source:'fairy',engineName,candidates:variations,
      principles:['根据当前 FEN 局面，由本地 WASM 引擎比较对手应对'],
    });
    timeout=setTimeout(() => fail('Fairy-Stockfish 初始化超时，请检查浏览器 WASM 支持'),30000);
    cancelTimer=setInterval(() => {
      if (cancelled()) { finish({move:null,score:0,depth:0,nodes:0,line:[],source:'fairy',engineName}); }
    },80);
    worker.onerror=event => { event.preventDefault(); fail(`Fairy-Stockfish 启动失败：${event.message}`); };
    worker.onmessage=({data}) => {
      if (settled || cancelled()) { return; }
      if (data.type==='error') { fail(data.message); return; }
      if (data.type==='ready') {
        clearTimeout(timeout);
        timeout=setTimeout(() => fail('Fairy-Stockfish 未按时返回 bestmove'),budgetMs+10000);
        onProgress({move:null,score:0,depth:0,nodes:0,line:[],source:'fairy',engineName});
        return;
      }
      if (data.type!=='line') { return; }
      const text=String(data.line);
      if (text.startsWith('info ')) {
        const variation=parseLine(board,side,text);
        if (!variation) { return; }
        const index=Number(/\bmultipv (\d+)/.exec(text)?.[1] ?? 1);
        const group=depths.get(variation.depth) ?? new Map<number,Variation>();
        group.set(index,variation); depths.set(variation.depth,group);
        if (Array.from({length:count},(_,i) => group.has(i+1)).every(Boolean)) {
          const variants=Array.from({length:count},(_,i) => group.get(i+1)!);
          if (!latest || variation.depth>=latest.depth) { latest=analysisFrom(variants[0],variants); onProgress(latest); }
        }
      } else if (text.startsWith('bestmove ')) {
        const move=fromUci(text.split(/\s+/)[1]);
        if (!move || !legal.some(m => sameMove(m,move))) { fail('引擎返回了无法映射到当前棋盘的着法'); return; }
        // The engine's final bestmove is authoritative; never replace it with a stale partial PV.
        const groups=[...depths.entries()].sort((a,b) => b[0]-a[0]);
        for (const [,group] of groups) {
          const matching=[...group.values()].find(v => sameMove(v.move,move));
          if (matching) {
            const variants=latest?.depth===matching.depth && latest.move && sameMove(latest.move,move)
              ? latest.candidates as Variation[] : [matching];
            finish(analysisFrom(matching,variants)); return;
          }
        }
        finish({move,score:0,depth:0,nodes:0,line:[move],source:'fairy',engineName,
          warnings:['引擎已返回最佳着，暂未收到对应的完整评分变化']});
      }
    };
    worker.postMessage({type:'analyze',fen:toFen(board,side),budgetMs:Math.max(200,Math.min(budgetMs,60000))});
  });
}
