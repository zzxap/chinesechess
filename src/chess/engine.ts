export type Side = 'red' | 'black';
export type Kind = 'king' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'pawn';
export type Piece = {side: Side; kind: Kind};
export type Board = (Piece | null)[];
export type Move = {from: number; to: number};
export const opposite = (side: Side): Side => side === 'red' ? 'black' : 'red';
export const labels: Record<Side, Record<Kind, string>> = {
  red: {king: '帥', advisor: '仕', elephant: '相', horse: '馬', rook: '車', cannon: '炮', pawn: '兵'},
  black: {king: '將', advisor: '士', elephant: '象', horse: '馬', rook: '車', cannon: '砲', pawn: '卒'},
};
const values: Record<Kind, number> = {king: 20000, rook: 900, cannon: 450, horse: 400, elephant: 200, advisor: 200, pawn: 100};
export function initialBoard(): Board {
  const b: Board = Array(90).fill(null);
  const back: Kind[] = ['rook','horse','elephant','advisor','king','advisor','elephant','horse','rook'];
  for (const side of ['red','black'] as Side[]) {
    const row = side === 'red' ? 9 : 0;
    back.forEach((kind, x) => { b[row * 9 + x] = {side,kind}; });
    for (const x of [1,7]) { b[(side === 'red' ? 7 : 2)*9+x] = {side,kind:'cannon'}; }
    for (const x of [0,2,4,6,8]) { b[(side === 'red' ? 6 : 3)*9+x] = {side,kind:'pawn'}; }
  }
  return b;
}
export function applyMove(b: Board, m: Move): Board {
  const next = b.slice(); next[m.to] = next[m.from]; next[m.from] = null; return next;
}
function pseudo(b: Board, from: number, includeFriendly=false): number[] {
  const p = b[from]; if (!p) { return []; }
  const x = from % 9, y = Math.floor(from / 9), out: number[] = [];
  const inside = (a: number,c: number) => a>=0 && a<9 && c>=0 && c<10;
  const add = (a: number,c: number) => { if (inside(a,c) && (includeFriendly || b[c*9+a]?.side !== p.side)) { out.push(c*9+a); } };
  const palace = (a: number,c: number) => a>=3 && a<=5 && (p.side==='red' ? c>=7 && c<=9 : c>=0 && c<=2);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  if (p.kind==='rook' || p.kind==='cannon') {
    for (const [dx,dy] of dirs) {
      let screen=false;
      for (let a=x+dx,c=y+dy;inside(a,c);a+=dx,c+=dy) {
        const target=b[c*9+a];
        if (!screen) {
          if (!target) { add(a,c); }
          else if (p.kind==='rook') { add(a,c); break; }
          else { screen=true; }
        } else if (target) { add(a,c); break; }
      }
    }
  } else if (p.kind==='horse') {
    for (const [dx,dy] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]]) {
      const leg = Math.abs(dx)===2 ? y*9+x+dx/2 : (y+dy/2)*9+x;
      if (!b[leg]) { add(x+dx,y+dy); }
    }
  } else if (p.kind==='elephant') {
    for (const dx of [-2,2]) { for (const dy of [-2,2]) {
      const c=y+dy;
      if ((p.side==='red' ? c>=5 : c<=4) && !b[(y+dy/2)*9+x+dx/2]) { add(x+dx,c); }
    } }
  } else if (p.kind==='advisor') {
    for (const dx of [-1,1]) { for (const dy of [-1,1]) { if (palace(x+dx,y+dy)) { add(x+dx,y+dy); } } }
  } else if (p.kind==='king') {
    for (const [dx,dy] of dirs) { if (palace(x+dx,y+dy)) { add(x+dx,y+dy); } }
    for (const dy of [-1,1]) {
      for (let c=y+dy;inside(x,c);c+=dy) {
        const target=b[c*9+x];
        if (target) { if (target.kind==='king' && target.side!==p.side) { add(x,c); } break; }
      }
    }
  } else {
    add(x,y+(p.side==='red' ? -1 : 1));
    if (p.side==='red' ? y<=4 : y>=5) { add(x-1,y); add(x+1,y); }
  }
  return out;
}
export function inCheck(b: Board, side: Side): boolean {
  const king = b.findIndex(p => p?.kind==='king' && p.side===side);
  return king<0 || b.some((p,i) => p && p.side!==side && pseudo(b,i).includes(king));
}
export function legalMoves(b: Board, side: Side): Move[] {
  const moves: Move[] = [];
  b.forEach((p,from) => {
    if (p?.side===side) { for (const to of pseudo(b,from)) {
      const m={from,to}; if (!inCheck(applyMove(b,m),side)) { moves.push(m); }
    } }
  });
  return moves;
}
function legalCaptures(b: Board,side: Side,target?: number): Move[] {
  const captures: Move[]=[];
  b.forEach((p,from) => {
    if (p?.side!==side) { return; }
    for (const to of pseudo(b,from)) {
      if (!b[to] || (target!==undefined && to!==target)) { continue; }
      const m={from,to};
      if (!inCheck(applyMove(b,m),side)) { captures.push(m); }
    }
  });
  return captures;
}
/** Material-only exchange estimate. Each side may decline a recapture. */
function exchangeGain(b: Board,side: Side,m: Move,remaining=4): number {
  const gain=b[m.to] ? values[b[m.to]!.kind] : 0;
  if (remaining===0 || b[m.to]?.kind==='king') { return gain; }
  const next=applyMove(b,m);
  let replyGain=0;
  for (const reply of legalCaptures(next,opposite(side),m.to)) {
    replyGain=Math.max(replyGain,exchangeGain(next,opposite(side),reply,remaining-1));
  }
  return gain-replyGain;
}
function materialSafety(b: Board,side: Side,m: Move): number {
  const captured=b[m.to] ? values[b[m.to]!.kind] : 0;
  const next=applyMove(b,m);
  let worst=exchangeGain(b,side,m);
  for (const reply of legalCaptures(next,opposite(side))) {
    worst=Math.min(worst,captured-exchangeGain(next,opposite(side),reply));
  }
  return worst;
}
export function bookMoveSafe(board: Board,side: Side,move: Move): boolean {
  const moves=legalMoves(board,side);
  if (!moves.some(m => m.from===move.from && m.to===move.to)) { return false; }
  const safety=materialSafety(board,side,move);
  return safety>=-100 && !moves.some(m => materialSafety(board,side,m)-safety>=200);
}
function controlMaps(b: Board): Record<Side,number[]> {
  const maps={red:Array<number>(90).fill(0),black:Array<number>(90).fill(0)};
  b.forEach((p,i) => {
    if (!p) { return; }
    if (p.kind!=='cannon') {
      for (const target of pseudo(b,i,true)) { maps[p.side][target]++; }
      return;
    }
    // Cannon control starts beyond exactly one screen, including a friendly protected piece.
    const x=i%9,y=Math.floor(i/9);
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let screen=false;
      for (let a=x+dx,c=y+dy;a>=0 && a<9 && c>=0 && c<10;a+=dx,c+=dy) {
        const target=c*9+a;
        if (screen) { maps[p.side][target]++; if (b[target]) { break; } }
        else if (b[target]) { screen=true; }
      }
    }
  });
  return maps;
}
function evaluate(b: Board, side: Side): number {
  const controls=controlMaps(b);
  return b.reduce((sum,p,i) => {
    if (!p) { return sum; }
    const advancement=p.side==='red' ? 9-Math.floor(i/9) : Math.floor(i/9);
    const friendly=controls[p.side][i], enemy=controls[opposite(p.side)][i];
    const centrality=4-Math.abs(i%9-4);
    let bonus=p.kind==='pawn' ? advancement*9+(advancement>=5 ? 45 : 0) : 0;
    if (p.kind==='horse' || p.kind==='rook' || p.kind==='cannon') {
      const mobility=pseudo(b,i).filter(to => !b[to]).length;
      bonus+=Math.min(mobility,14)*(p.kind==='rook' ? 2 : 3);
      if (p.kind==='horse') {
        bonus+=centrality*6;
      }
      if (p.kind==='cannon' && advancement>=5 && !friendly) { bonus-=25; }
      if (friendly) { bonus+=10; }
    }
    // Hanging pieces and loosely defended attacks matter even before a capture is searched.
    if (enemy && p.kind!=='king') { bonus-=values[p.kind]*(friendly ? .04 : .26); }
    if (p.kind==='advisor' || p.kind==='elephant') { bonus+=advancement<=2 ? 12 : 0; }
    if (p.kind==='king') {
      if (enemy) { bonus-=65; }
      const x=i%9,y=Math.floor(i/9);
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const a=x+dx,c=y+dy;
        if (a>=0 && a<9 && c>=0 && c<10) { bonus-=Math.min(controls[opposite(p.side)][c*9+a],2)*14; }
      }
    }
    return sum+(p.side===side ? 1 : -1)*(values[p.kind]+bonus);
  },0);
}
export type Candidate = {move: Move; score: number; line: Move[]; scoreKnown?: boolean; rank?: number; note?: string};
export type Analysis = {move: Move | null; score: number; depth: number; nodes: number; line: Move[]; source: 'search' | 'fairy' | 'cloud' | 'book' | 'pikafish'; engineName?: string; positionFen?: string; remoteMove?: string; scoreKnown?: boolean; depthKnown?: boolean; mate?: number; principles?: string[]; candidates?: Candidate[]; warnings?: string[]};
function principleNotes(b: Board,m: Move): string[] {
  const p=b[m.from]!, next=applyMove(b,m), controls=controlMaps(next), notes: string[]=[];
  if (inCheck(b,p.side)) { notes.push('优先解除当前将军'); }
  if (b[m.to]) { notes.push('比较吃子收益与对方回吃'); }
  if (controls[p.side][m.to]) { notes.push('落点有己方子力照应'); }
  if (inCheck(next,opposite(p.side))) { notes.push('当前走法向对方将帅施压'); }
  return notes.length ? notes.slice(0,2) : ['根据当前子力、活动空间和将帅安全比较后续应对'];
}
function moveWarnings(b: Board,side: Side,m: Move): string[] {
  const next=applyMove(b,m), warnings: string[]=[];
  if (inCheck(b,side)) { warnings.push('当前被将军，候选仅包含合法解将着法'); }
  const threats=legalCaptures(next,opposite(side))
    .map(reply => ({reply,gain:exchangeGain(next,opposite(side),reply)}))
    .filter(entry => entry.gain>=150)
    .sort((a,c) => c.gain-a.gain);
  for (const {reply} of threats.slice(0,2)) {
    const attacker=next[reply.from]!, victim=next[reply.to]!;
    warnings.push(`走后仍有风险：对方${labels[attacker.side][attacker.kind]}可吃${labels[victim.side][victim.kind]}（${reply.to%9+1}列${Math.floor(reply.to/9)+1}行），存在净失子风险`);
  }
  return warnings;
}
const positionKey=(b: Board,side: Side) => side+':'+b.map(p => p ? `${p.side[0]}${p.kind};` : '.').join('');
/** Cooperative iterative deepening. Only completed iterations replace the result. */
export async function suggest(b: Board, side: Side, cancelled: () => boolean, onProgress: (a: Analysis) => void, maxDepth=6, budgetMs=3000): Promise<Analysis> {
  const pause = () => new Promise<void>(resolve => setTimeout(resolve,0));
  const rootMoves=legalMoves(b,side);
  const safety=new Map<Move,number>();
  // Cover every root move before deeper search, so timeout never falls back to array order.
  for (let index=0;index<rootMoves.length;index++) {
    if (cancelled()) { return {move:null,score:0,depth:0,nodes:0,line:[],source:'search'}; }
    const m=rootMoves[index]; safety.set(m,materialSafety(b,side,m));
    if (index%4===3) { await pause(); }
  }
  rootMoves.sort((a,c) => safety.get(c)!-safety.get(a)!);
  const safest=rootMoves[0] ?? null;
  const deadline=Date.now()+budgetMs;
  let nodes=0;
  const abort=Symbol('search interrupted');
  let slice=Date.now();
  type SearchResult = {score: number; line: Move[]};
  // Reuse transpositions only inside this analysis, never earlier game positions or move counts.
  const transpositions=new Map<string,{result: SearchResult; bound: 'exact' | 'lower' | 'upper'}>();
  const ordered=(board: Board, turn: Side) => legalMoves(board,turn).sort((a,c) => {
    const priority=(m: Move) => board[m.to] ? values[board[m.to]!.kind]*10-values[board[m.from]!.kind] : 0;
    return priority(c)-priority(a);
  });
  async function search(board: Board, turn: Side, depth: number, alpha: number, beta: number, ply: number): Promise<{score:number;line:Move[]}> {
    nodes++;
    if (cancelled() || Date.now()>deadline) { throw abort; }
    if (Date.now()-slice>=12) { await pause(); slice=Date.now(); }
    const key=`${depth}:${ply}:${positionKey(board,turn)}`;
    const cached=transpositions.get(key);
    if (cached && (cached.bound==='exact' || (cached.bound==='lower' && cached.result.score>=beta) || (cached.bound==='upper' && cached.result.score<=alpha))) {
      return cached.result;
    }
    const originalAlpha=alpha;
    let moves=ordered(board,turn);
    if (!moves.length) { return {score:-100000+ply,line:[]}; }
    const checked=inCheck(board,turn);
    let best=-Infinity, line: Move[]=[];
    if (depth<=0) {
      const standPat=evaluate(board,turn);
      // Extend exchanges beyond the nominal horizon; in check, search all evasions.
      // Never treat being in check as a legal pass at the ordinary exchange horizon.
      if (depth<=-4 && !checked) { return {score:standPat,line:[]}; }
      if (depth<=-8) { return {score:standPat-(checked ? 150 : 0),line:[]}; }
      if (!checked) {
        if (standPat>=beta) { return {score:standPat,line:[]}; }
        best=standPat; alpha=Math.max(alpha,standPat);
        moves=moves.filter(m => board[m.to]);
      }
    }
    for (const m of moves) {
      const child=await search(applyMove(board,m),opposite(turn),depth-1,-beta,-alpha,ply+1);
      const score=-child.score;
      if (score>best) { best=score; line=[m,...child.line]; }
      alpha=Math.max(alpha,score); if (alpha>=beta) { break; }
    }
    const result={score:best,line};
    if (transpositions.size<20000) {
      transpositions.set(key,{result,bound:best<=originalAlpha ? 'upper' : best>=beta ? 'lower' : 'exact'});
    }
    return result;
  }
  const fallback=safest;
  let result: Analysis={move:fallback,score:fallback ? safety.get(fallback)! : 0,depth:0,nodes:0,line:fallback ? [fallback] : [],source:'search',principles:['先检查得失子与对方回吃，再比较不同候选'],warnings:fallback ? moveWarnings(b,side,fallback) : []};
  if (!cancelled()) { onProgress(result); }
  for (let depth=1;depth<=maxDepth;depth++) {
    try {
      const candidates: Candidate[]=[];
      // Full windows give comparable scores for EVERY root move at the same depth.
      // An interrupted iteration is discarded, including its partly searched candidates.
      for (const m of rootMoves) {
        const child=await search(applyMove(b,m),opposite(side),depth-1,-Infinity,Infinity,1);
        candidates.push({move:m,score:-child.score,line:[m,...child.line]});
      }
      candidates.sort((a,c) => c.score-a.score);
      const best=candidates[0], move=best?.move ?? null;
      result={move,score:best?.score ?? -100000,depth,nodes,line:best?.line ?? [],source:'search',candidates:candidates.slice(0,3),principles:move ? principleNotes(b,move) : [],warnings:move ? moveWarnings(b,side,move) : []};
      rootMoves.sort((a,c) => candidates.findIndex(v => v.move===a)-candidates.findIndex(v => v.move===c));
      if (!cancelled()) { onProgress(result); }
      await pause();
    } catch (e) { if (e!==abort) { throw e; } break; }
  }
  return {...result,nodes};
}
export function describeMove(b: Board,m: Move): string {
  const p=b[m.from];
  return `${p ? labels[p.side][p.kind] : ''} ${m.from%9+1}列${Math.floor(m.from/9)+1}行 → ${m.to%9+1}列${Math.floor(m.to/9)+1}行`;
}
export function describeLine(b: Board,line: Move[]): string {
  let position=b;
  return line.slice(0,4).map(m => {
    const p=position[m.from];
    const text=`${p?.side==='red' ? '红' : '黑'}${describeMove(position,m)}`;
    position=applyMove(position,m);
    return text;
  }).join('；');
}
