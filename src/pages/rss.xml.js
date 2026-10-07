import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPosts, postUrl } from '../lib/posts';

/** 訂閱器只需要最近的文章，全部 553 篇會讓 feed 過大 */
const LIMIT = 50;

export async function GET(context) {
	const posts = (await getPosts()).slice(0, LIMIT);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: postUrl(post),
		})),
	});
}
