import type { MiddlewareHandler } from 'astro';

/**
 * 只在寫稿後台 /keystatic 的頁面插入中文化腳本。
 * 後台頁面是套件產生的，我們碰不到它的原始碼，所以用中介層加進去。
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();

  if (!context.url.pathname.startsWith('/keystatic')) return response;
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;

  const html = await response.text();
  /* 後台頁面沒有宣告 <meta charset>，傳統 script 會被當成 Latin-1 讀成亂碼；
     module script 規範保證以 UTF-8 解讀，所以用 type="module" */
  const tag = '<script type="module" src="/keystatic-zh.js"></script>';
  /* 後台頁面不是套我們的版型，不一定有 </body>，沒有就直接接在最後面 */
  const patched = html.includes('</body>') ? html.replace('</body>', tag + '</body>') : html + tag;

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(patched, { status: response.status, statusText: response.statusText, headers });
};
