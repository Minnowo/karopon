import {defineConfig} from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [preact(), tailwindcss()],
    build: {
        rollupOptions: {
            input: {
                main: 'src/index.tsx',
            },
            output: {
                entryFileNames: 'static/[name].js', // main entry point
                chunkFileNames: 'static/[name].js', // code-split chunks
                assetFileNames: 'static/[name][extname]', // static assets (e.g., CSS, images)
            },
        },
    },
});
