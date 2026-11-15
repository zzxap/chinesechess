import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cpus} from 'node:os';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const binaries={darwin:'Pikafish-MacOS-universal',win32:'Pikafish-Windows-x86-64-universal.exe',linux:'Pikafish-Linux-x86-64-universal'};
const intelCompatible=path.join(root,'Pikafish','Pikafish-MacOS-x86-64-compatible');
const m4Binary=path.join(root,'Pikafish','Pikafish-MacOS-arm64-M4');
const isM4=process.platform==='darwin' && process.arch==='arm64' && /\bApple M4\b/i.test(cpus()[0]?.model ?? '');
const defaultBinary=isM4 && existsSync(m4Binary) ? m4Binary
  : process.platform==='darwin' && process.arch==='x64' && existsSync(intelCompatible)
    ? intelCompatible : path.join(root,'Pikafish',binaries[process.platform] || 'pikafish');

export function normalizeFen(text) {
  if (typeof text!=='string' || text.length>200 || /[\r\n\0]/.test(text)) { throw new Error('无效的 FEN'); }
  const fields=text.trim().split(/\s+/), ranks=fields[0].split('/');
  if (ranks.length!==10 || !/^[wb]$/.test(fields[1] ?? '')) { throw new Error('无效的 FEN'); }
  for (const rank of ranks) {
    if (!/^[1-9rnbakcpRNBAKCP]+$/.test(rank) || [...rank].reduce((n,c) => n+(/[1-9]/.test(c) ? Number(c) : 1),0)!==9) { throw new Error('无效的 FEN'); }
  }
  if ((fields[0].match(/K/g) ?? []).length!==1 || (fields[0].match(/k/g) ?? []).length!==1) { throw new Error('FEN 必须包含双方将帅'); }
  // Deliberately discard game history and move counters for position-only analysis.
  return `${fields[0]} ${fields[1]} - - 0 1`;
}

export class Pikafish {
  constructor() {
    this.binary=path.resolve(process.env.PIKAFISH_PATH || defaultBinary);
    this.model=path.resolve(process.env.PIKAFISH_NNUE || path.join(path.dirname(this.binary),'pikafish.nnue'));
    this.child=null; this.readyPromise=null; this.waiters=new Set();
    this.tail=Promise.resolve(); this.queued=0; this.closed=false; this.stderr=''; this.stdoutDiagnostics=[];
  }
  write(command) {
    if (!this.child?.stdin.writable) { throw new Error('Pikafish 进程不可写'); }
    this.child.stdin.write(command+'\n');
  }
  waitFor(predicate,ms=10000) {
    const promise=new Promise((resolve,reject) => {
      const waiter={predicate,resolve:value => { clearTimeout(timer); this.waiters.delete(waiter); resolve(value); },reject:error => { clearTimeout(timer); this.waiters.delete(waiter); reject(error); }};
      const timer=setTimeout(() => waiter.reject(new Error('Pikafish 响应超时')),ms);
      this.waiters.add(waiter);
    });
    // A synchronous pipe failure can happen between registering and awaiting a response.
    promise.catch(() => {});
    return promise;
  }
  breakProcess(error,child=this.child) {
    if (child!==this.child) { return; }
    this.child=null; this.readyPromise=null;
    for (const waiter of [...this.waiters]) { waiter.reject(error); }
    if (child && !child.killed) { child.kill(); }
  }
  ready() {
    if (this.closed) { return Promise.reject(new Error('Pikafish 服务已关闭')); }
    if (this.readyPromise) { return this.readyPromise; }
    this.readyPromise=this.start().catch(error => { this.breakProcess(error); throw error; });
    return this.readyPromise;
  }
  async start() {
    if (!existsSync(this.binary)) { throw new Error(`找不到 Pikafish 程序：${this.binary}`); }
    if (!existsSync(this.model)) { throw new Error(`找不到 NNUE 模型：${this.model}`); }
    this.stderr=''; this.stdoutDiagnostics=[];
    const child=spawn(this.binary,[],{cwd:path.dirname(this.binary),stdio:['pipe','pipe','pipe'],windowsHide:true,shell:false});
    this.child=child;
    child.on('error',error => this.breakProcess(new Error(`无法启动 Pikafish：${error.message}`),child));
    child.stdin.on('error',error => this.breakProcess(error,child));
    child.stderr.on('data',data => { this.stderr=(this.stderr+data.toString()).slice(-2000); });
    child.on('exit',(code,signal) => {
      const details=[this.stderr,...this.stdoutDiagnostics].filter(Boolean).join('\n').slice(-5000);
      this.breakProcess(new Error(`Pikafish 已退出（${code ?? signal}）${signal==='SIGILL' ? '：当前程序含不兼容的 CPU 指令，请使用本机编译的兼容版本；程序：'+this.binary : details ? '：'+details : ''}`),child);
    });
    const reader=createInterface({input:child.stdout});
    reader.on('line',line => {
      if (child!==this.child) { return; }
      // UCI engines report network-load errors to stdout, not necessarily stderr.
      if (/\bERROR:|not loaded|Unsupported position/i.test(line)) {
        this.stdoutDiagnostics.push(line.trim());
        this.stdoutDiagnostics=this.stdoutDiagnostics.slice(-12);
        console.error('[Pikafish] '+line.trim());
      }
      for (const waiter of [...this.waiters]) { if (waiter.predicate(line.trim())) { waiter.resolve(line.trim()); } }
    });
    let response=this.waitFor(line => line==='uciok');
    this.write('uci'); await response;
    this.write('setoption name Threads value 2');
    this.write('setoption name Hash value 128');
    this.write('setoption name MultiPV value 1');
    this.write(`setoption name EvalFile value ${this.model}`);
    response=this.waitFor(line => line==='readyok');
    this.write('isready'); await response;
    console.info('[Pikafish] 常驻进程就绪，PID '+child.pid+'，程序 '+this.binary);
  }
  analyze(fen) {
    const position=normalizeFen(fen);
    if (this.queued>=12) { return Promise.reject(new Error('Pikafish 正忙，请稍后重试')); }
    this.queued++;
    // One process, one search at a time: never interleave position/go from concurrent HTTP calls.
    const job=this.tail.then(async () => {
      await this.ready();
      try {
        let response=this.waitFor(line => line==='readyok');
        this.write('ucinewgame'); this.write('isready'); await response;
        let info={score:null,depth:0,nodes:0,pv:[],mate:null};
        const result=this.waitFor(line => {
          if (line.startsWith('info ') && /\bscore (cp|mate) -?\d+/.test(line) && !/\b(lowerbound|upperbound)\b/.test(line)) {
            const score=/\bscore (cp|mate) (-?\d+)/.exec(line);
            const mate=score[1]==='mate' ? Number(score[2]) : null;
            info={score:mate===null ? Number(score[2]) : Math.sign(mate)*(100000-Math.abs(mate)),mate,
              depth:Number(/\bdepth (\d+)/.exec(line)?.[1] ?? 0),nodes:Number(/\bnodes (\d+)/.exec(line)?.[1] ?? 0),
              pv:(/\bpv (.+)$/.exec(line)?.[1] ?? '').split(/\s+/).filter(m => /^[a-i][0-9][a-i][0-9]$/.test(m))};
          }
          return line.startsWith('bestmove ');
        },10000);
        this.write('position fen '+position);
        this.write('go movetime 1000');
        response=await result;
        const move=response.split(/\s+/)[1];
        if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) { throw new Error('Pikafish 没有返回可用的最佳着法'); }
        // Do not pair bestmove with an unrelated intermediate PV.
        if (info.pv[0]!==move) { info={score:null,depth:0,nodes:info.nodes,pv:[move],mate:null}; }
        return {...info,move,fen:position,source:'pikafish'};
      } catch (error) { this.breakProcess(error); throw error; }
    });
    this.tail=job.catch(() => {});
    return job.finally(() => { this.queued--; });
  }
  dispose() { this.closed=true; this.breakProcess(new Error('Pikafish 服务关闭')); }
}
