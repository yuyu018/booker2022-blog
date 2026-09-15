import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type Category = NonNullable<Post['data']['category']>;

export const CATEGORIES = ['investment', 'fitness', 'literature', 'life'] as const satisfies readonly Category[];

export const categoryMeta: Record<Category, {
  num: string;
  labelEn: string;
  title: string;
  short: string;
  desc: string;
  pillar: string;
}> = {
  investment: {
    num: '壹',
    labelEn: 'INVESTMENT STRATEGY',
    title: '投資策略分析',
    short: '投資策略',
    desc: '以價值投資為底色，用十年為單位思考財富。這裡沒有明牌與熱點，只有可以反覆驗證的思考框架。',
    pillar: '以十年為單位思考財富，在複利中安放焦慮。',
  },
  fitness: {
    num: '貳',
    labelEn: 'SCIENTIFIC FITNESS',
    title: '科學健身指導',
    short: '科學健身',
    desc: '讓身體成為最誠實的作品。從訓練原理到恢復科學，一次訓練，一次累積。',
    pillar: '讓身體成為最誠實的作品，一次訓練，一次累積。',
  },
  literature: {
    num: '參',
    labelEn: 'LITERATURE & READING',
    title: '知識文學分享',
    short: '知識文學',
    desc: '在書頁間與偉大靈魂相遇，借他人之眼重看世界。閱讀是最低成本的自我投資。',
    pillar: '在書頁間與偉大靈魂相遇，借他人之眼看世界。',
  },
  life: {
    num: '肆',
    labelEn: 'LIFE ESSAYS',
    title: '生活隨筆',
    short: '生活隨筆',
    desc: '日記、婚姻、工作，以及那些普通卻值得記下的日子。生活本身，就是最好的素材。',
    pillar: '記下普通卻閃閃發光的日子，好好生活。',
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
