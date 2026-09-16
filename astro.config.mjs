// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://missbooker.com',
  integrations: [mdx(), sitemap(), react(), keystatic()],

  // 文章頁面仍然是靜態產生；只有寫稿後台 /keystatic 需要伺服器功能
  adapter: vercel(),

  // 舊分類網址已上線過，轉址避免外部連結失效
  redirects: {
    '/blog/investment': '/blog/money',
    '/blog/literature': '/blog/reading',
    '/blog/fitness': '/blog',
  },

  markdown: {
    shikiConfig: {
      // 淺色主題，配合紙感配色
      theme: 'github-light',
      wrap: true,
    },
  },

  fonts: [
      {
          provider: fontProviders.local(),
          name: 'Atkinson',
          cssVariable: '--font-atkinson',
          fallbacks: ['sans-serif'],
          options: {
              variants: [
                  {
                      src: ['./src/assets/fonts/atkinson-regular.woff'],
                      weight: 400,
                      style: 'normal',
                      display: 'swap',
                  },
                  {
                      src: ['./src/assets/fonts/atkinson-bold.woff'],
                      weight: 700,
                      style: 'normal',
                      display: 'swap',
                  },
              ],
          },
      },
	],

  vite: {
    plugins: [tailwindcss()],
  },
});