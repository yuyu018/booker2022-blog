import { getCollection, type CollectionEntry } from 'astro:content';
import { categoriesText, numeral } from './site';

export type Post = CollectionEntry<'blog'>;
export type Category = NonNullable<Post['data']['category']>;

export const CATEGORIES = ['money', 'life', 'reading', 'growth'] as const satisfies readonly Category[];

/* 分類名稱與說明由後台編輯（src/data/categories），編號依順序自動產生 */
export const categoryMeta = Object.fromEntries(
  CATEGORIES.map((slug, i) => {
    const c = categoriesText[slug];
    return [slug, { ...c, num: numeral(i), short: c.title }];
  }),
) as Record<Category, {
  num: string;
  labelEn: string;
  title: string;
  short: string;
  desc: string;
  pillar: string;
}>;

export async function getPosts(): Promise<Post[]> {
  return (await getCollection('blog')).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPostsByCategory(category: Category): Promise<Post[]> {
  return (await getPosts()).filter((p) => p.data.category === category);
}

export const postUrl = (post: Post) => `/blog/${post.id}/`;

/* 中文閱讀速度以每分鐘約 400 字估算 */
export const readTime = (post: Post) => `${Math.max(1, Math.round((post.body ?? '').length / 400))} 分鐘`;

export const monthLabel = (date: Date) => `${date.getFullYear()}・${date.getMonth() + 1}月`;
