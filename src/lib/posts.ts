import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type Category = NonNullable<Post['data']['category']>;

export const CATEGORIES = ['money', 'life', 'reading', 'growth'] as const satisfies readonly Category[];

export const categoryMeta: Record<Category, {
  num: string;
  labelEn: string;
  title: string;
  short: string;
  desc: string;
  pillar: string;
}> = {
  money: {
    num: '壹',
    labelEn: 'MONEY & ABUNDANCE',
    title: '金錢',
    short: '金錢',
    desc: '關於金錢與富足。存錢、花錢、投資與財務自由，學著和錢好好相處。',
    pillar: '學著和錢好好相處，把選擇留給未來的自己。',
  },
  life: {
    num: '貳',
    labelEn: 'EVERYDAY LIFE',
    title: '生活',
    short: '生活',
    desc: '日記、婚姻、工作與旅行，那些普通卻值得記下的日子。',
    pillar: '記下普通卻閃閃發光的日子，好好生活。',
  },
  reading: {
    num: '參',
    labelEn: 'READING NOTES',
    title: '閱讀',
    short: '閱讀',
    desc: '讀過的書、畫下的句子，以及它們如何改變我看世界的方式。',
    pillar: '在書頁間與作者對話，借他人之眼看世界。',
  },
  growth: {
    num: '肆',
    labelEn: 'SELF-GROWTH',
    title: '自我成長',
    short: '自我成長',
    desc: '與自己對話、練習覺察、學習新事物。一邊前進，一邊調整，慢慢把人生過成自己喜歡的樣子。',
    pillar: '一邊生活、一邊思考，也一邊尋找答案。',
  },
};

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
