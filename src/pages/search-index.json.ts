import type { APIRoute } from 'astro';
import { categoryMeta, getPosts, postUrl } from '../lib/posts';

export const prerender = true;

/**
 * 給前端搜尋用的索引檔。
 * 只放標題、摘要、分類與網址——夠搜尋，又不會讓檔案太大。
 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const index = posts.map((p) => ({
    t: p.data.title,
    d: p.data.description ?? '',
    c: p.data.category ? categoryMeta[p.data.category].title : '',
    u: postUrl(p),
    y: `${p.data.pubDate.getFullYear()}・${p.data.pubDate.getMonth() + 1}月`,
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
