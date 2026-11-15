import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ImageBackground, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {Analysis, applyMove, Board, describeMove, inCheck, initialBoard, legalMoves, Move, opposite, Side} from './src/chess/engine';
import {suggest} from './src/chess/analyzer';
import type {AnalysisMode} from './src/chess/analysisMode';
import {openingStyleNames, openingStyles} from './src/chess/classicOpenings';
import type {OpeningStyle} from './src/chess/classicOpenings';
import {toFen} from './src/chess/fen';
import {tableImage} from './src/chess/assets';
import {ChessBoard} from './src/components/ChessBoard';

type Position = {board: Board; turn: Side; last: Move | null};
const fresh=(): Position => ({board:initialBoard(),turn:'red',last:null});
export default function App() {
  const {width}=useWindowDimensions();
  const [history,setHistory]=useState<Position[]>([fresh()]);
  const {board,turn,last}=history[history.length-1];
  const [selected,setSelected]=useState<number | null>(null);
  const [analysis,setAnalysis]=useState<Analysis | null>(null);
  const [thinking,setThinking]=useState(false);
  const [rules,setRules]=useState(true);
  const [computer,setComputer]=useState(false);
  const [flipped,setFlipped]=useState(false);
  const [message,setMessage]=useState('');
  const [analysisMode,setAnalysisMode]=useState<AnalysisMode>('local');
  const [openingStyle,setOpeningStyle]=useState<OpeningStyle>('classic');
  const [analysisRevision,setAnalysisRevision]=useState(0);
  const [showPosition,setShowPosition]=useState(false);
  const requestVersion=useRef(0);
  const invalidateAnalysis=() => { requestVersion.current++; setAnalysis(null); };
  const moves=useMemo(() => legalMoves(board,turn),[board,turn]);
  const targets=moves.filter(m => m.from===selected).map(m => m.to);
  const ended=moves.length===0;
  const wide=width>=1000;
  const boardWidth=Math.max(220,Math.min(wide ? width-440 : width-32,660));
  const move=(m: Move) => {
    invalidateAnalysis();
    setHistory(h => [...h,{board:applyMove(h[h.length-1].board,m),turn:opposite(h[h.length-1].turn),last:m}]);
    setSelected(null); setMessage('');
  };
  useEffect(() => {
    let cancelled=false;
    const version=++requestVersion.current;
    const stale=() => cancelled || requestVersion.current!==version;
    setAnalysis(null);
    if (rules || ended) { setThinking(false); return; }
    setThinking(true);
    const timer=setTimeout(() => {
      suggest(board,turn,stale,a => { if (!stale()) { setAnalysis(a); } },6,3000,analysisMode,openingStyle)
        .then(a => {
          if (stale()) { return; }
          setAnalysis(a); setThinking(false);
          if (computer && turn==='black' && a.move) {
            requestVersion.current++;
            setHistory(h => [...h,{board:applyMove(board,a.move!),turn:'red',last:a.move}]);
            setSelected(null);
          }
        })
        .catch(error => { if (!stale()) { setThinking(false); setAnalysis(null); setMessage(error instanceof Error ? error.message : '引擎分析未完成'); } });
    },100);
    return () => { cancelled=true; clearTimeout(timer); };
  },[board,turn,rules,ended,computer,analysisMode,analysisRevision,openingStyle]);
  const square=(i: number) => {
    if (ended || (computer && turn==='black')) { return; }
    if (board[i]?.side===turn) { setSelected(i===selected ? null : i); setMessage(''); return; }
    const m=moves.find(v => v.from===selected && v.to===i);
    if (m) { move(m); } else if (selected!==null) { setMessage('此处不可落子，请留意蹩马腿、塞象眼或送将。'); }
  };
  const undo=() => { invalidateAnalysis(); setHistory(h => h.slice(0,Math.max(1,h.length-(computer && h.length>2 && turn==='red' ? 2 : 1)))); setSelected(null); setMessage(''); };
  const name=turn==='red' ? '红方' : '黑方';
  const topSide: Side=flipped ? 'red' : 'black';
  const bottomSide=opposite(topSide);
  const playerName=(side: Side) => side==='red' ? '红方' : '黑方';
  const playerMeta=(side: Side) => side==='red' ? '执红先行' : computer ? '电脑棋手' : '对弈棋手';
  const panel=<View style={[styles.panel,wide ? {width:320} : null]}>
    <Text style={styles.eyebrow}>局 势 洞 察</Text>
    <Text style={styles.panelTitle}>{ended ? `${opposite(turn)==='red' ? '红方' : '黑方'}胜出` : `${name}${inCheck(board,turn) ? '被将军' : '行棋'}`}</Text>
    <Text style={styles.muted}>{ended ? '当前一方无合法走法。' : computer ? '人机对弈 · 你执红先行' : '双人对弈 · 红先黑后'}</Text>
    <View style={styles.divider}/>
    <View style={styles.buttons}>
      {(['local','cloud','pikafish'] as AnalysisMode[]).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{selected:analysisMode===mode}} style={[styles.secondary,analysisMode===mode && styles.activeEngine]} onPress={() => { if (mode===analysisMode) { return; } invalidateAnalysis(); setMessage(''); setAnalysisMode(mode); }}>
        <Text style={styles.buttonText}>{mode==='pikafish' ? 'Pikafish' : mode==='cloud' ? '在线云库' : Platform.OS==='web' ? 'WASM' : '内置本地'}</Text>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`切换开局，当前${openingStyleNames[openingStyle]}`} style={styles.mode} onPress={() => { if (analysisMode!=='local') { return; } invalidateAnalysis(); setMessage(''); setOpeningStyle(openingStyles[(openingStyles.indexOf(openingStyle)+1)%openingStyles.length]); }}><Text style={styles.buttonText}>开局：{analysisMode==='pikafish' ? 'Pikafish 计算' : analysisMode==='cloud' ? '跟随云库' : `${openingStyleNames[openingStyle]} ⇄`}</Text></Pressable>
    <Text style={styles.label}>{thinking ? '正在推演下一步…' : '建议走法'}</Text>
    <Text style={styles.suggestion}>{analysis?.move ? describeMove(board,analysis.move) : ended ? '本局结束' : '准备分析'}</Text>
    {analysis?.source==='book' && <Text style={styles.muted}>{analysis.engineName}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.warning}>{message}</Text>}
    <Pressable accessibilityRole="button" style={styles.mode} onPress={() => { invalidateAnalysis(); setMessage(''); setAnalysisRevision(v => v+1); }}><Text style={styles.buttonText}>重新分析当前局面</Text></Pressable>
    <Pressable accessibilityRole="button" style={styles.mode} onPress={() => setShowPosition(true)}><Text style={styles.buttonText}>局面代码</Text></Pressable>
    <Pressable disabled={thinking || !analysis?.move || ended || (computer && turn==='black')} style={[styles.primary,(thinking || !analysis?.move || ended || (computer && turn==='black')) && styles.disabled]} onPress={() => { if (!thinking && analysis?.move) { move(analysis.move); } }}><Text style={styles.primaryText}>{thinking ? '思考中…' : '走建议一步'}</Text></Pressable>
    <View style={styles.buttons}>
      <Pressable disabled={history.length<2} style={styles.secondary} onPress={undo}><Text style={styles.buttonText}>悔棋</Text></Pressable>
      <Pressable style={styles.secondary} onPress={() => { invalidateAnalysis(); setHistory([fresh()]); setSelected(null); setMessage(''); }}><Text style={styles.buttonText}>重新开局</Text></Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`翻转棋盘，当前${flipped ? '黑方' : '红方'}在下`} style={styles.mode} onPress={() => setFlipped(v => !v)}><Text style={styles.buttonText}>翻转棋盘 ⇅ · {flipped ? '黑方' : '红方'}在下</Text></Pressable>
    <Pressable style={styles.mode} onPress={() => { invalidateAnalysis(); setComputer(v => !v); setSelected(null); }}><Text style={styles.buttonText}>模式：{computer ? '人机对弈' : '双人对弈'} ⇄</Text></Pressable>
    <Text style={styles.note}>第 {history.length-1} 手 · 点选棋子后，绿点显示合法落点。</Text>
  </View>;
  return <ImageBackground source={tableImage} resizeMode="cover" style={styles.root}>
    <StatusBar barStyle="light-content" backgroundColor="#634329"/>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.header,{maxWidth:wide ? 1030 : 660}]}>
        <View><Text style={styles.brand}>弈 · 中国象棋</Text><Text style={styles.tagline}>一枰山河，落子有道</Text></View>
        <Pressable accessibilityLabel="查看本场说明" onPress={() => setRules(true)} style={styles.help}><Text style={styles.helpText}>本场说明</Text></Pressable>
      </View>
      <View style={[styles.layout,wide ? styles.horizontal : null]}>
        <View><View style={styles.player}><Text style={[styles.playerText,topSide==='red' && styles.redPlayer]}>● {playerName(topSide)}</Text><Text style={styles.playerMeta}>{playerMeta(topSide)}</Text></View>
          <ChessBoard board={board} width={boardWidth} flipped={flipped} selected={selected} targets={targets} hint={analysis?.move ?? null} last={last} onSquare={square}/>
          <View style={styles.player}><Text style={[styles.playerText,bottomSide==='red' && styles.redPlayer]}>● {playerName(bottomSide)}</Text><Text style={styles.playerMeta}>{playerMeta(bottomSide)}</Text></View>
        </View>{panel}
      </View>
    </ScrollView>
    <Modal transparent visible={showPosition} animationType="fade" onRequestClose={() => setShowPosition(false)}>
      <View style={styles.scrim}><View style={styles.dialog}>
        <Text style={styles.dialogTitle}>当前局面代码</Text>
        {!!analysis?.engineName && <Text style={styles.note}>来源：{analysis.engineName}</Text>}
        <Text selectable style={styles.ruleText}>{toFen(board,turn)}</Text>
        {!!analysis?.remoteMove && <Text selectable style={styles.note}>返回着法：{analysis.remoteMove}</Text>}
        <Text style={styles.note}>可选中复制这段 FEN，用于核对同一局面的 API 结果。</Text>
        <Pressable style={styles.primary} onPress={() => setShowPosition(false)}><Text style={styles.primaryText}>关闭</Text></Pressable>
      </View></View>
    </Modal>
    <Modal transparent visible={rules} animationType="fade" onRequestClose={() => setRules(false)}>
      <View style={styles.scrim}><View style={styles.dialog}>
        <Text style={styles.dialogTitle}>本场说明</Text><View style={styles.divider}/>
        <Text style={styles.ruleText}>红先黑后，轮流行棋。</Text>
        <Text style={styles.ruleText}>落子后自动提示对方的建议走法。</Text>
        <Text style={styles.ruleText}>可切换本地分析与在线云库。</Text>
        <Text style={styles.note}>当前为本地双人 / 人机原型。暂未实现长将长捉裁定、联网和对局计时。</Text>
        <Pressable style={styles.primary} onPress={() => setRules(false)}><Text style={styles.primaryText}>开始对弈</Text></Pressable>
      </View></View>
    </Modal>
  </ImageBackground>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#634329'},scroll:{padding:16,paddingTop:52,alignItems:'center',paddingBottom:40},
  header:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24},
  brand:{fontSize:27,fontWeight:'700',color:'#ffe2ad'},tagline:{fontSize:12,color:'#d4b58d',marginTop:6,letterSpacing:3},
  help:{borderWidth:1,borderColor:'#ab8657',borderRadius:18,paddingHorizontal:14,paddingVertical:9},helpText:{color:'#f3dbb6',fontSize:12},
  layout:{gap:22},horizontal:{flexDirection:'row',alignItems:'center'},player:{flexDirection:'row',justifyContent:'space-between',padding:12},
  playerText:{color:'#f3e3ce',fontSize:16,fontWeight:'600'},playerMeta:{color:'#d6ba97',fontSize:12},
  redPlayer:{color:'#f4bf8d'},
  panel:{backgroundColor:'#f4e6cd',borderRadius:16,borderWidth:2,borderColor:'#c8a476',padding:22,maxWidth:660},
  eyebrow:{fontSize:12,letterSpacing:4,color:'#8b6848'},panelTitle:{fontSize:28,color:'#563d2c',fontWeight:'700',marginTop:12,marginBottom:8},
  muted:{fontSize:13,color:'#80684e',lineHeight:22},divider:{height:1,backgroundColor:'#d7be98',marginVertical:18},
  label:{fontSize:14,color:'#796044'},suggestion:{fontSize:20,color:'#8e3e2c',fontWeight:'600',marginVertical:12},
  note:{fontSize:12,lineHeight:21,color:'#8a735a',marginTop:12},warning:{fontSize:13,color:'#9a3c2c',marginTop:12},
  activeEngine:{backgroundColor:'#dfcbab',borderColor:'#8d432d',borderWidth:2},
  primary:{backgroundColor:'#8d432d',borderRadius:24,borderWidth:2,borderColor:'#bb7d4b',alignItems:'center',padding:13,marginTop:22},primaryText:{fontSize:18,color:'#ffdf9c',fontWeight:'600',letterSpacing:3},
  disabled:{opacity:.4},buttons:{flexDirection:'row',gap:12,marginTop:14},secondary:{flex:1,padding:12,borderWidth:1,borderColor:'#cbb38e',borderRadius:10,alignItems:'center'},
  buttonText:{color:'#705137',fontSize:14},mode:{alignItems:'center',padding:14,marginTop:8},scrim:{flex:1,backgroundColor:'#1f140da6',justifyContent:'center',alignItems:'center',padding:24},
  dialog:{width:'100%',maxWidth:440,padding:28,backgroundColor:'#f5e8cf',borderWidth:4,borderColor:'#c5ad87',borderRadius:18},dialogTitle:{textAlign:'center',fontSize:28,color:'#5a4030'},ruleText:{fontSize:15,lineHeight:30,color:'#69513b'},
});
