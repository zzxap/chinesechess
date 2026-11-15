import React from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {Board, labels, Move} from '../chess/engine';
import {boardImage, pieceImages} from '../chess/assets';

type Props = {board: Board; width: number; flipped: boolean; selected: number | null; targets: number[]; hint: Move | null; last: Move | null; onSquare: (i: number) => void};
export function ChessBoard({board,width,flipped,selected,targets,hint,last,onSquare}: Props) {
  const height=width*1052/952;
  const point=(i: number) => {
    const displayIndex=flipped ? 89-i : i;
    return {x:(76+displayIndex%9*100)/952*width,y:(76+Math.floor(displayIndex/9)*100)/1052*height};
  };
  const size=width*.102;
  const from=hint ? point(hint.from) : null, to=hint ? point(hint.to) : null;
  const angle=from && to ? Math.atan2(to.y-from.y,to.x-from.x) : 0;
  const length=from && to ? Math.hypot(to.x-from.x,to.y-from.y) : 0;
  return <View style={{width,height}}>
    <Image source={boardImage} style={StyleSheet.absoluteFill} resizeMode="stretch" />
    {board.map((p,i) => {
      const pos=point(i), active=i===selected, marked=last?.from===i || last?.to===i;
      return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${Math.floor(i/9)+1}行${i%9+1}列${p ? (p.side==='red' ? '红' : '黑')+labels[p.side][p.kind] : '空位'}`} onPress={() => onSquare(i)} style={{position:'absolute',left:pos.x-size/2,top:pos.y-size/2,width:size,height:size,alignItems:'center',justifyContent:'center'}}>
        {marked && <View style={[styles.last,{width:size*.88,height:size*.88,borderRadius:size}]} />}
        {p && <Image source={pieceImages[p.side][p.kind]} style={{width:size,height:size*1.05}} />}
        {active && <View style={[styles.selection,{width:size*.98,height:size*.98,borderRadius:size}]} />}
        {targets.includes(i) && <View style={[styles.target,p ? styles.capture : null]} />}
      </Pressable>;
    })}
    {from && to && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{position:'absolute',left:(from.x+to.x)/2-length/2,top:(from.y+to.y)/2-2,width:length,height:4,backgroundColor:'#3a8075',opacity:.9,transform:[{rotate:`${angle}rad`}]}} />
      <View style={{position:'absolute',left:to.x-7,top:to.y-7,width:14,height:14,borderTopWidth:4,borderRightWidth:4,borderColor:'#3a8075',transform:[{rotate:`${angle+Math.PI/4}rad`}]}} />
      <View style={{position:'absolute',left:from.x-7,top:from.y-7,width:14,height:14,borderRadius:7,borderWidth:3,borderColor:'#3a8075'}} />
    </View>}
  </View>;
}
const styles=StyleSheet.create({
  selection:{position:'absolute',borderColor:'#4a8d7b',borderWidth:3},
  last:{position:'absolute',backgroundColor:'#fff3b3',opacity:.75},
  target:{position:'absolute',width:13,height:13,borderRadius:7,backgroundColor:'#397a63'},
  capture:{width:'92%',height:'92%',borderRadius:100,borderWidth:3,borderColor:'#397a63',backgroundColor:'transparent'},
});
