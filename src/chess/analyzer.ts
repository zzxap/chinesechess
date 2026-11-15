import {suggest as localSuggest} from './engine';
import type {Analysis, Board, Side} from './engine';
import type {AnalysisMode} from './analysisMode';
import {suggestCloud} from './cloud';
import {classicSuggestion} from './classicOpenings';
import type {OpeningStyle} from './classicOpenings';

export function suggest(board: Board,side: Side,cancelled: () => boolean,onProgress: (a: Analysis) => void,maxDepth=6,budgetMs=3000,mode: AnalysisMode='local',openingStyle: OpeningStyle='classic'): Promise<Analysis> {
  if (mode==='pikafish') { return suggestCloud(board,side,cancelled,onProgress,true); }
  if (mode==='cloud') { return suggestCloud(board,side,cancelled,onProgress); }
  const book=cancelled() ? null : classicSuggestion(board,side,openingStyle);
  if (book && !cancelled()) { onProgress(book); return Promise.resolve(book); }
  return localSuggest(board,side,cancelled,onProgress,maxDepth,budgetMs);
}
