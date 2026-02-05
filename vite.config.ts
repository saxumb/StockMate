
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sostituisci 'NOME-REPO' con il nome del tuo repository GitHub per il deploy corretto
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  base: './'
});
