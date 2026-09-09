import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],root:'frontend',css:{postcss:{}},build:{outDir:'dist',chunkSizeWarningLimit:650},server:{host:'0.0.0.0',port:4173,allowedHosts:['terminal.local']}});
