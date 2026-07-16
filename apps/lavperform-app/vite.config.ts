import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

import { availableThemes } from './src/config/themes'

export default defineConfig(({ mode }) => {
  // Em produção, usa APENAS as variáveis de ambiente do sistema (Docker/Railway)
  // Em desenvolvimento, carrega do arquivo .env local
  const env = mode === 'production' ? {} : loadEnv(mode, process.cwd(), '')

  // Prioriza variáveis de ambiente do sistema (Docker/Railway) sobre o arquivo .env
  const VITE_API_URL =
    process.env.VITE_API_URL || env.VITE_API_URL || 'https://api.foodcrm.fun'
  const VITE_THEME_ID =
    process.env.VITE_THEME_ID || env.VITE_THEME_ID || 'default'
  const VITE_ENVIROMENT =
    process.env.VITE_ENVIROMENT || env.VITE_ENVIROMENT || 'production'

  const VITE_ADM_DOMAIN =
    process.env.VITE_ADM_DOMAIN || env.VITE_ADM_DOMAIN || ''
  const VITE_PRO_URL = process.env.VITE_PRO_URL || env.VITE_PRO_URL || ''

  // Carrega o tema baseado na variável de ambiente
  const themeId = VITE_THEME_ID
  const theme =
    availableThemes[themeId as keyof typeof availableThemes] ||
    availableThemes.default

  return {
    // Define as variáveis explicitamente para garantir que sejam injetadas
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(VITE_API_URL),
      'import.meta.env.VITE_THEME_ID': JSON.stringify(VITE_THEME_ID),
      'import.meta.env.VITE_ENVIROMENT': JSON.stringify(VITE_ENVIROMENT),
      'import.meta.env.VITE_ADM_DOMAIN': JSON.stringify(VITE_ADM_DOMAIN),
      'import.meta.env.VITE_PRO_URL': JSON.stringify(VITE_PRO_URL),
    },
    base: '/',
    plugins: [
      react(),
      tsconfigPaths(),
      VitePWA({
        registerType: 'autoUpdate', // Controla a atualização do Service Worker
        outDir: 'dist', // Pasta de build do Vite
        injectRegister: 'auto',
        manifest: {
          // 3. Detalhes do Manifest (descrito no Passo 2)
          name: `${theme.texts.appName} ${
            VITE_ENVIROMENT !== 'production' ? `- ${VITE_ENVIROMENT}` : ''
          }`,
          short_name: `${theme.texts.appShortName} ${
            VITE_ENVIROMENT !== 'production' ? `- ${VITE_ENVIROMENT}` : ''
          }`,
          description: theme.texts.appDescription,
          theme_color: theme.colors.primary,
          icons: [
            {
              src: theme.images.pwaIcon192 ?? theme.images.logoIcon,
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: theme.images.pwaIcon512 ?? theme.images.logoIcon,
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: theme.images.pwaIcon512 ?? theme.images.logoIcon,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable', // Ícones com fundos adaptáveis
            },
          ],
        },
        workbox: {
          // Cacheia os arquivos estáticos do seu projeto (HTML, JS, CSS, assets)
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Separa bibliotecas grandes em chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chakra-ui': ['@chakra-ui/react', '@chakra-ui/charts'],
            'form-libs': ['react-hook-form', '@hookform/resolvers', 'yup'],
            charts: ['recharts'],
            utils: ['axios', 'jwt-decode', 'papaparse'],
          },
        },
      },
      // Aumenta o limite de aviso para chunks grandes
      chunkSizeWarningLimit: 1000,
      // Otimizações adicionais
      sourcemap: false,
      minify: 'esbuild', // Usa esbuild ao invés de terser
    },
    preview: {
      port: 8080,
      strictPort: true,
    },
    server: {
      port: 8080,
      strictPort: true,
      host: true,
      origin: VITE_ENVIROMENT !== 'development' ? 'http://0.0.0.0:8080' : '',
    },
  }
})
