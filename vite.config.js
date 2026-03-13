import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 3000,
        proxy: {
            '/api': 'http://localhost:8080',
            '/socket.io': {
                target: 'http://localhost:8080',
                ws: true
            }
        }
    },
    build: {
        outDir: 'dist'
    },
    test: {
        globals: true,
        setupFiles: ['./src/test/setup.js'],
        include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js']
    }
});
