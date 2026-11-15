import {TurboModuleRegistry} from 'react-native';
import type {TurboModule} from 'react-native';

interface NativeAI extends TurboModule {analyze: (fen: string) => Promise<string>}
// Keep one native analysis active. Pending obsolete positions are skipped before
// entering the engine, and the caller still validates the returned FEN/move.
let pending: Promise<void> = Promise.resolve();
export async function requestAnalysis(fen: string, cancelled: () => boolean, signal: AbortSignal): Promise<unknown> {
  const engine=TurboModuleRegistry.get<NativeAI>('ChessAI');
  if (!engine?.analyze) { throw new Error('应用未包含 AI库，请安装包含本地 AI 的新版应用。'); }
  const previous=pending;
  let release!: () => void;
  pending=new Promise<void>(resolve => { release=resolve; });
  try {
    await previous;
    if (cancelled()) { return null; }
    if (signal.aborted) { throw new Error('AI库分析超时，请重试'); }
    return JSON.parse(await engine.analyze(fen));
  } finally { release(); }
}
