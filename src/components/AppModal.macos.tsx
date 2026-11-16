import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {ModalProps} from 'react-native';

// RN macOS 0.81 excludes the Fabric ModalHostView implementation on macOS.
// Keep modal content inside the current window instead of mounting ModalHostView.
export function AppModal({visible=true,children}: ModalProps) {
  if (!visible) { return null; }
  return <View accessibilityViewIsModal style={styles.overlay}>{children}</View>;
}

const styles=StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,zIndex:1000,backgroundColor:'transparent'},
});
