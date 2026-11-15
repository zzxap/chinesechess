import type {Board, Kind, Move, Side} from './engine';

const codes: Record<Kind,string> = {king:'k',advisor:'a',elephant:'b',horse:'n',rook:'r',cannon:'c',pawn:'p'};
export function toFen(board: Board,turn: Side): string {
  const ranks: string[]=[];
  for (let y=0;y<10;y++) {
    let rank='',empty=0;
    for (let x=0;x<9;x++) {
      const p=board[y*9+x];
      if (!p) { empty++; continue; }
      if (empty) { rank+=empty; empty=0; }
      rank+=p.side==='red' ? codes[p.kind].toUpperCase() : codes[p.kind];
    }
    if (empty) { rank+=empty; }
    ranks.push(rank);
  }
  return `${ranks.join('/')} ${turn==='red' ? 'w' : 'b'} - - 0 1`;
}

export function fromUci(text: string): Move | null {
  const match=/^([a-i])([0-9])([a-i])([0-9])$/.exec(text);
  if (!match) { return null; }
  return {
    from:(9-Number(match[2]))*9+match[1].charCodeAt(0)-97,
    to:(9-Number(match[4]))*9+match[3].charCodeAt(0)-97,
  };
}

export function toUci(move: Move): string {
  const square=(index: number) => `${String.fromCharCode(97+index%9)}${9-Math.floor(index/9)}`;
  return square(move.from)+square(move.to);
}
