import React, {useRef, useState} from 'react';
import {ActivityIndicator, Linking, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {WebsiteDialogProps, WebsiteLink} from '../websiteLinks';
import {BrowserToolbar} from './BrowserToolbar';

export function WebsiteDialog({site,onClose}: WebsiteDialogProps) {
  return site ? <NativeBrowser key={site.id} site={site} onClose={onClose}/> : null;
}

function NativeBrowser({site,onClose}: {site: WebsiteLink; onClose: () => void}) {
  const browser=useRef<WebView>(null);
  const [sourceUrl,setSourceUrl]=useState(site.url);
  const [currentUrl,setCurrentUrl]=useState(site.url);
  const [canGoBack,setCanGoBack]=useState(false);
  const [canGoForward,setCanGoForward]=useState(false);
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  const [message,setMessage]=useState('');
  const retry=() => { setMessage(''); setLoading(true); setRevision(v => v+1); };
  const external=() => {
    Linking.openURL(currentUrl).catch(() => setMessage('无法打开浏览器，请稍后再试。'));
  };
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {
    if (canGoBack) { browser.current?.goBack(); } else { onClose(); }
  }}>
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4e6cd"/>
      <BrowserToolbar title={site.title} url={currentUrl} loading={loading} onClose={onClose}
        canGoBack={canGoBack} canGoForward={canGoForward}
        onBack={() => browser.current?.goBack()} onForward={() => browser.current?.goForward()}
        onReload={() => browser.current?.reload()} onOpenExternal={external}/>
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      <WebView key={revision} ref={browser} source={{uri:sourceUrl}} style={styles.browser}
        originWhitelist={['http://*','https://*','about:blank']} startInLoadingState
        javaScriptEnabled domStorageEnabled allowFileAccess={false}
        onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        onNavigationStateChange={navigation => {
          setCanGoBack(navigation.canGoBack); setCanGoForward(navigation.canGoForward);
          if (/^https?:\/\//i.test(navigation.url)) { setCurrentUrl(navigation.url); }
        }}
        onOpenWindow={({nativeEvent}) => {
          if (/^https?:\/\//i.test(nativeEvent.targetUrl)) { setSourceUrl(nativeEvent.targetUrl); }
        }}
        renderLoading={() => <View style={styles.loading}><ActivityIndicator color="#8d432d" accessibilityLabel="网页加载中"/></View>}
        renderError={() => <View style={styles.error}>
          <Text style={styles.errorTitle}>网页暂时无法打开</Text>
          <Text style={styles.errorHint}>请检查网络连接后重试，也可在浏览器中打开。</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>重新加载</Text></Pressable>
        </View>}/>
    </SafeAreaView>
  </Modal>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#f4e6cd'},browser:{flex:1,backgroundColor:'#fff'},
  loading:{position:'absolute',top:0,bottom:0,left:0,right:0,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  error:{flex:1,padding:28,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  errorTitle:{fontSize:20,color:'#563d2c',marginBottom:12},errorHint:{fontSize:14,color:'#80684e',lineHeight:23,textAlign:'center'},
  retry:{marginTop:20,paddingVertical:12,paddingHorizontal:24,borderRadius:12,backgroundColor:'#8d432d'},retryText:{color:'#ffe2ad',fontSize:15},
  message:{color:'#9a3c2c',padding:12,fontSize:13},
});
