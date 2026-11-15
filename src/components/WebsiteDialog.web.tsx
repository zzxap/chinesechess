import React, {useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import type {WebsiteDialogProps, WebsiteLink} from '../websiteLinks';
import {BrowserToolbar} from './BrowserToolbar';

export function WebsiteDialog({site,onClose}: WebsiteDialogProps) {
  return site ? <WebBrowser key={site.id} site={site} onClose={onClose}/> : null;
}

function WebBrowser({site,onClose}: {site: WebsiteLink; onClose: () => void}) {
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  return <Modal visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.root}>
      <BrowserToolbar title={site.title} url={site.url} loading={loading} onClose={onClose}
        onReload={() => { setLoading(true); setRevision(v => v+1); }}
        onOpenExternal={() => window.open(site.url,'_blank','noopener,noreferrer')}/>
      <iframe key={revision} title={site.title} src={site.url} onLoad={() => setLoading(false)} onError={() => setLoading(false)}
        allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        style={{flex:1,width:'100%',minHeight:0,border:0,background:'#fff'}}/>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#f4e6cd'}});
