import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  server:{host:'127.0.0.1',port:3000,strictPort:true},
  build:{rollupOptions:{output:{manualChunks(id){
    if(!id.includes('node_modules'))return;
    if(id.includes('/node_modules/three/examples/jsm/'))return 'three-addons';
    if(id.includes('/node_modules/three/'))return 'three-vendor';
    if(id.includes('/node_modules/@react-three/drei/'))return 'drei-vendor';
    if(id.includes('/node_modules/@react-three/fiber/'))return 'fiber-vendor';
    if(id.includes('/node_modules/react-dom/')||id.includes('/node_modules/react/')||id.includes('/node_modules/scheduler/'))return 'react-vendor';
    if(id.includes('/node_modules/nbtify/')||id.includes('/node_modules/fflate/'))return 'schematic-vendor';
  }}}}
});
