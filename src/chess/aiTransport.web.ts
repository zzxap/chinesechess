import {aiEndpoint} from './aiEndpoint';

export async function requestAnalysis(fen: string, cancelled: () => boolean, signal: AbortSignal): Promise<unknown> {
  if (cancelled()) { return null; }
  const response=await fetch(aiEndpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fen}),signal,
  });
  let data;
  try { data=await response.json(); }
  catch { throw new Error('AI库返回格式错误，请检查本地服务是否已启动'); }
  if (!response.ok) { throw new Error(typeof data?.error==='string' ? data.error : `AI库请求失败（${response.status}）`); }
  return data;
}
