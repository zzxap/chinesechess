import {applyMove, initialBoard, legalMoves, opposite, bookMoveSafe} from './engine';
import type {Analysis, Board, Kind, Move, Side} from './engine';
import {toFen} from './fen';

export type OpeningStyle='classic' | 'juzhongmi' | 'meihua' | 'off';
export const openingStyles: OpeningStyle[]=['classic','juzhongmi','meihua','off'];
export const openingStyleNames: Record<OpeningStyle,string>={classic:'经典橘梅',juzhongmi:'橘中秘',meihua:'梅花谱',off:'自由计算'};

// Only sourced introductory moves, ending BEFORE later sacrifices and annotated mistakes.
const lines: {book: 'juzhongmi' | 'meihua'; name: string; source: string; moves: string[]}[]=[
  {book:'juzhongmi',name:'橘中秘 · 顺炮横车',source:'https://hi8.com/qipu/xiangqi/juzhongmi-01-shunpao-hengche-po-zhiche',
    moves:'炮二平五 炮8平5 马二进三 马8进7 车一进一 车9平8'.split(' ')},
  {book:'meihua',name:'梅花谱 · 屏风马对中炮直车',source:'https://zh.wikisource.org/zh-hans/梅花譜',
    moves:'炮二平五 马8进7 马二进三 马2进3 车一平二 车9平8 车二进六 卒7进1'.split(' ')},
  {book:'meihua',name:'梅花谱 · 屏风马对巡河车',source:'https://zh.wikisource.org/zh-hans/梅花譜',
    moves:'炮八平五 马2进3 马八进七 卒7进1 车九平八 车1平2 车八进四 马8进7'.split(' ')},
];
const digits='一二三四五六七八九';
const value=(c: string) => digits.includes(c) ? digits.indexOf(c)+1 : Number(c);
const kinds: Record<string,Kind>={炮:'cannon',车:'rook',马:'horse',兵:'pawn',卒:'pawn'};
function parse(board: Board,turn: Side,text: string): Move | undefined {
  const [piece,file,action,dest]=Array.from(text);
  const fileOf=(i: number) => turn==='red' ? 9-i%9 : i%9+1;
  const matches=legalMoves(board,turn).filter(m => {
    if (board[m.from]?.kind!==kinds[piece] || fileOf(m.from)!==value(file)) { return false; }
    const dy=Math.floor(m.to/9)-Math.floor(m.from/9);
    if (action==='平') { return dy===0 && fileOf(m.to)===value(dest); }
    if (Math.sign(dy)!==(turn==='red' ? -1 : 1)*(action==='进' ? 1 : -1)) { return false; }
    return kinds[piece]==='horse' ? fileOf(m.to)===value(dest) : Math.abs(dy)===value(dest);
  });
  return matches.length===1 ? matches[0] : undefined;
}
type Entry={book: 'juzhongmi' | 'meihua'; name: string; move: Move};
let entries: Map<string,Entry[]> | undefined;
const key=(board: Board,turn: Side) => toFen(board,turn);
const mirror=(i: number) => Math.floor(i/9)*9+8-i%9;
function build(): Map<string,Entry[]> {
  const table=new Map<string,Entry[]>();
  for (const line of lines) {
    let board=initialBoard(),turn: Side='red';
    const staged: {board: Board; turn: Side; move: Move}[]=[];
    for (const text of line.moves) {
      const move=parse(board,turn,text);
      if (!move) { break; }
      staged.push({board,turn,move}); board=applyMove(board,move); turn=opposite(turn);
    }
    if (staged.length!==line.moves.length) { continue; }
    for (const item of staged) {
      for (const mirrored of [false,true]) {
        const position=mirrored ? item.board.map((_,i) => item.board[mirror(i)]) : item.board;
        const move=mirrored ? {from:mirror(item.move.from),to:mirror(item.move.to)} : item.move;
        const id=key(position,item.turn), list=table.get(id) ?? [];
        list.push({book:line.book,name:line.name,move}); table.set(id,list);
      }
    }
  }
  return table;
}
export function classicSuggestion(board: Board,turn: Side,style: OpeningStyle): Analysis | null {
  if (style==='off') { return null; }
  entries=entries ?? build();
  const entry=entries.get(key(board,turn))?.find(item => style==='classic' || item.book===style);
  if (!entry || !bookMoveSafe(board,turn,entry.move)) { return null; }
  return {move:entry.move,score:0,scoreKnown:false,depth:0,nodes:0,line:[entry.move],source:'book',engineName:entry.name,positionFen:toFen(board,turn)};
}
