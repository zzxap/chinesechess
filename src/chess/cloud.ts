import {applyMove, legalMoves, opposite} from './engine';
import type {Analysis, Board, Candidate, Move, Side} from './engine';
import {fromChessDb, toChessDb, toFen} from './fen';
import {cloudEndpoint} from './cloudEndpoint';
import {pikafishEndpoint} from './pikafishEndpoint';

const same=(a: Move,b: Move) => a.from===b.from && a.to===b.to;
const clean=(text: string) => text.replace(/\0/g,'').trim();
const number=(value: string | undefined): number | undefined => value && /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : undefined;

export async function suggestCloud(board: Board,side: Side,cancelled: () => boolean,onProgress: (a: Analysis) => void,forcePikafish=false): Promise<Analysis> {
  const controller=new AbortController();
  const timeout=setTimeout(() => controller.abort(),12000);
  const cancellation=setInterval(() => { if (cancelled()) { controller.abort(); } },80);
  const fen=toFen(board,side).split(' ').slice(0,2).join(' ');
  const legal=legalMoves(board,side);
  const metadata=new Map<string,{source: string | null; depth: number; nodes: number; mate?: number}>();
  const query=async (action: string) => {
    const params=new URLSearchParams({action,board:fen,learn:'0',showall:'1',egtbmetric:'dtm'});
    if (forcePikafish) { params.set('engine','pikafish'); }
    const response=await fetch(`${forcePikafish ? pikafishEndpoint : cloudEndpoint}?${params}`,{signal:controller.signal});
    const text=clean(await response.text());
    if (!response.ok) { throw new Error(text || `HTTP ${response.status}`); }
    const mate=response.headers.get('X-Analysis-Mate');
    metadata.set(action,{source:response.headers.get('X-Analysis-Source'),depth:Number(response.headers.get('X-Analysis-Depth') ?? 0),nodes:Number(response.headers.get('X-Analysis-Nodes') ?? 0),mate:mate===null ? undefined : Number(mate)});
    if (text.startsWith('<')) { throw new Error(forcePikafish ? 'Pikafish 后端未配置，请重启 pnpm dev' : '云库代理未配置，请重启 pnpm dev'); }
    return text;
  };
  try {
    const responses=await Promise.allSettled([query('queryall'),query('querybest'),query('querypv')]);
    if (cancelled()) { throw new Error('已取消旧局面查询'); }
    const textAt=(index: number) => { const entry=responses[index]; return entry.status==='fulfilled' ? entry.value : ''; };
    const all=textAt(0),best=textAt(1),pv=textAt(2);
    if ([all,best,pv].includes('invalid board')) { throw new Error('ChessDB 拒绝当前 FEN 局面'); }
    const candidates: Candidate[]=[];
    for (const entry of all.split('|')) {
      const fields=Object.fromEntries(entry.split(',').map(field => { const i=field.indexOf(':'); return [field.slice(0,i),field.slice(i+1)]; }));
      const move=fromChessDb(fields.move ?? '');
      if (!move || !legal.some(m => same(m,move))) { continue; }
      const score=number(fields.score);
      // Never turn unknown scores into a numeric zero or recommend them as evaluated moves.
      if (score===undefined) { continue; }
      candidates.push({move,score,line:[move],rank:number(fields.rank) ?? 0,note:fields.note});
    }
    // The official query page renders queryall rows in server order. Preserve it,
    // including special endgame ordering; rank/score are metadata, not our sort keys.
    const bestToken=/(?:^|\|)(?:move|egtb):([a-i][0-9][a-i][0-9])(?:\||$)/.exec(best)?.[1];
    const bestMove=bestToken ? fromChessDb(bestToken) : null;
    let selected=candidates[0];
    if (!selected && bestMove && legal.some(m => same(m,bestMove))) {
      selected={move:bestMove,score:0,scoreKnown:false,line:[bestMove]};
    }
    if (!selected) {
      const failed=responses.find(entry => entry.status==='rejected');
      if (!all && !best && failed?.status==='rejected') {
        throw new Error(controller.signal.aborted ? `${forcePikafish ? 'Pikafish' : '云库'}请求超时，请重试` : `${forcePikafish ? 'Pikafish 后端' : '云库'}连接失败：${String(failed.reason)}`);
      }
      throw new Error(forcePikafish ? 'Pikafish 未返回当前局面的合法着法' : 'ChessDB 暂无该局面的已知最佳着，请切换本地 WASM 计算');
    }
    let position=board,turn=side;
    const line: Move[]=[];
    const pvText=/(?:^|,)pv:(.+)$/.exec(pv)?.[1];
    for (const token of (pvText ?? '').split('|').slice(0,12)) {
      const move=fromChessDb(token);
      if (!move || !legalMoves(position,turn).some(m => same(m,move))) { break; }
      line.push(move); position=applyMove(position,move); turn=opposite(turn);
    }
    const matching=line.length>0 && same(line[0],selected.move);
    const depth=matching ? number(/(?:^|,)depth:(\d+)/.exec(pv)?.[1]) : undefined;
    const pvScore=matching ? number(/(?:^|,)score:(-?\d+)/.exec(pv)?.[1]) : undefined;
    const chosen={...selected,line:matching ? line : selected.line};
    if (chosen.scoreKnown===false && pvScore!==undefined) { chosen.score=pvScore; chosen.scoreKnown=true; }
    const alternatives=[chosen,...candidates.filter(c => !same(c.move,chosen.move))].slice(0,3);
    const meta=metadata.get(candidates.length ? 'queryall' : 'querybest');
    const pikafish=meta?.source==='pikafish';
    if (forcePikafish && !pikafish) { throw new Error('Pikafish 后端未就绪，请重启 pnpm dev'); }
    const result: Analysis={...chosen,positionFen:toFen(board,side),remoteMove:toChessDb(chosen.move),depth:pikafish ? meta.depth : depth ?? 0,depthKnown:pikafish ? meta.depth>0 : depth!==undefined,nodes:pikafish ? meta.nodes : 0,mate:meta?.mate,source:pikafish ? 'pikafish' : 'cloud',engineName:pikafish ? `Pikafish 本地${forcePikafish ? '计算' : '补算'} · 1000ms` : 'ChessDB 在线云库',candidates:alternatives,
      principles:[pikafish ? '常驻 Pikafish 通过管道分析当前 FEN，思考 1000ms' : '采用 queryall 返回的首条已知合法着法，保持官网列表顺序'],
      warnings:pikafish ? [] : ['云库返回已有分析数据；未收录局面由本地 Pikafish 补算']};
    if (!cancelled()) { onProgress(result); }
    return result;
  } finally { clearTimeout(timeout); clearInterval(cancellation); }
}
