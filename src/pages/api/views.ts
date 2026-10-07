import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * 全站瀏覽次數。
 *
 * 數字存在自己的 Upstash Redis（在 Vercel 後台連接後會自動注入環境變數）。
 * 還沒接上資料庫時回傳 configured: false，前端就不顯示，網站不會壞。
 */
const KEY = 'site:views';

function credentials(env: Record<string, string | undefined>) {
  /* Vercel 的 Upstash 整合在不同時期用過兩組變數名稱，兩種都支援 */
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(path: string, env: Record<string, string | undefined>) {
  const cred = credentials(env);
  if (!cred) return null;
  const res = await fetch(`${cred.url}/${path}`, {
    headers: { Authorization: `Bearer ${cred.token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result: number | string | null };
  return Number(data.result ?? 0);
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** 讀取目前次數（不加一） */
export const GET: APIRoute = async ({ locals }) => {
  const env = { ...process.env, ...((locals as any)?.runtime?.env ?? {}) };
  try {
    const count = await redis(`get/${KEY}`, env);
    return count === null ? json({ configured: false }) : json({ configured: true, count });
  } catch {
    return json({ configured: false });
  }
};

/** 瀏覽一次加一，回傳加完的數字 */
export const POST: APIRoute = async ({ locals }) => {
  const env = { ...process.env, ...((locals as any)?.runtime?.env ?? {}) };
  try {
    const count = await redis(`incr/${KEY}`, env);
    return count === null ? json({ configured: false }) : json({ configured: true, count });
  } catch {
    return json({ configured: false });
  }
};
