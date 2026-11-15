/** Short opening lines, not complete games. Red uses Chinese file numbers. */
export type OpeningLine = {name: string; moves: string[]; source: string};
const C = 'https://www.xqbase.com/ecco/ecco_c.htm';
const D = 'https://www.xqbase.com/ecco/ecco_d.htm';
const A = 'https://zh.wikibooks.org/wiki/中國象棋/開局';

export const openingLines: OpeningLine[] = [
  {
    name: '中炮对屏风马 · 过河车', source: C,
    // Stop at the critical rook confrontation; let tactical search choose the continuation.
    moves: '炮二平五 马8进7 马二进三 车9平8 车一平二 卒7进1 车二进六 马2进3 兵七进一 炮8平9'.split(' '),
  },
  {
    name: '中炮对屏风马 · 巡河车', source: C,
    moves: '炮二平五 马8进7 马二进三 马2进3 车一平二 车9平8 车二进四 卒7进1 马八进七'.split(' '),
  },
  {
    name: '顺炮直车对横车', source: D,
    moves: '炮二平五 炮8平5 马二进三 马8进7 车一平二 车9进1 马八进七 马2进3 兵三进一 车9平4'.split(' '),
  },
  {
    name: '中炮对列炮', source: D,
    moves: '炮二平五 炮2平5 马二进三 马8进7 车一平二 车9平8'.split(' '),
  },
  {
    name: '中炮对左炮封车转列炮', source: D,
    moves: '炮二平五 马8进7 马二进三 车9平8 车一平二 炮8进4 兵三进一 炮2平5 马八进七'.split(' '),
  },
  {
    name: '仙人指路对卒底炮', source: A,
    moves: '兵七进一 炮2平3 炮二平五 象3进5 马二进三 马8进7'.split(' '),
  },
  {
    name: '飞相局', source: A,
    moves: '相三进五 马8进7 马二进三 车9平8'.split(' '),
  },
  {
    name: '起马局', source: A,
    moves: '马二进三 卒7进1 兵七进一 马2进3'.split(' '),
  },
];
