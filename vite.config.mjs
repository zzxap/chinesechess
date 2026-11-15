import {defineConfig} from 'vite';
import {chessBackendPlugin} from './server/chess-backend.mjs';

export default defineConfig({
  plugins: [chessBackendPlugin()],
  resolve: {
    alias: [{find: /^react-native$/, replacement: 'react-native-web'}],
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.mjs', '.js', '.ts', '.tsx', '.json'],
    dedupe: ['react', 'react-dom'],
  },
  esbuild: {jsx: 'automatic'},
  define: {__DEV__: JSON.stringify(true)},
  server: {host: '127.0.0.1', port: 16001, strictPort: true},
});
