/**
 * 頁面文字集中在 src/data/*，由寫稿後台（/keystatic）編輯。
 * 程式碼只負責排版，不再寫死文案。
 */
import siteJson from '../data/site/index.json';
import homeJson from '../data/home/index.json';
import aboutJson from '../data/about/index.json';
import servicesJson from '../data/services/index.json';
import contactJson from '../data/contact/index.json';
import blogJson from '../data/blog/index.json';
import categoriesJson from '../data/categories/index.json';

export const site = siteJson;
export const homeText = homeJson;
export const aboutText = aboutJson;
export const servicesText = servicesJson;
export const contactText = contactJson;
export const blogText = blogJson;
export const categoriesText = categoriesJson;

/** 壹貳參肆——編號由程式產生，後台不用填 */
export const NUMERALS = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌'];
export const numeral = (i: number) => NUMERALS[i] ?? String(i + 1);

/**
 * 依中文標點切成短語，每段包在 <span class="ph"> 裡，
 * 換行時才不會在詞中間斷掉。
 */
export const phrases = (text: string): string[] =>
  text.split(/(?<=[，。、；：！？｜])/).filter(Boolean);
