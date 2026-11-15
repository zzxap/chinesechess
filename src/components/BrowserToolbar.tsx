import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

type Props = {
  title: string;
  url: string;
  loading: boolean;
  onClose: () => void;
  onReload: () => void;
  onBack?: () => void;
  onForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onOpenExternal?: () => void;
};

export function BrowserToolbar(props: Props) {
  return <View style={styles.header}>
    <View style={styles.heading}>
      <View style={styles.titleArea}>
        <Text style={styles.title} numberOfLines={1}>{props.title}</Text>
        <Text style={styles.address} numberOfLines={1}>{props.url.replace(/^https?:\/\//,'')}</Text>
      </View>
      {props.loading && <ActivityIndicator color="#8d432d" accessibilityLabel="网页加载中"/>}
      <Pressable accessibilityRole="button" accessibilityLabel="关闭网页，返回棋局" onPress={props.onClose} style={styles.button}>
        <Text style={styles.buttonText}>关闭 ✕</Text>
      </Pressable>
    </View>
    <View style={styles.actions}>
      {!!props.onBack && <Pressable accessibilityRole="button" disabled={!props.canGoBack} onPress={props.onBack} style={[styles.button,!props.canGoBack && styles.disabled]}><Text style={styles.buttonText}>← 返回</Text></Pressable>}
      {!!props.onForward && <Pressable accessibilityRole="button" disabled={!props.canGoForward} onPress={props.onForward} style={[styles.button,!props.canGoForward && styles.disabled]}><Text style={styles.buttonText}>前进 →</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={props.onReload} style={styles.button}><Text style={styles.buttonText}>重新加载</Text></Pressable>
      {!!props.onOpenExternal && <Pressable accessibilityRole="button" onPress={props.onOpenExternal} style={styles.button}><Text style={styles.buttonText}>在浏览器打开 ↗</Text></Pressable>}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  header:{backgroundColor:'#f4e6cd',paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#c8a476',gap:10},
  heading:{flexDirection:'row',alignItems:'center',gap:12},titleArea:{flex:1,minWidth:0},
  title:{fontSize:18,fontWeight:'600',color:'#563d2c'},address:{fontSize:12,color:'#80684e',marginTop:3},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{minHeight:40,paddingHorizontal:12,paddingVertical:10,justifyContent:'center',borderWidth:1,borderColor:'#c8a476',borderRadius:10},
  buttonText:{fontSize:13,color:'#705137'},disabled:{opacity:.35},
});
