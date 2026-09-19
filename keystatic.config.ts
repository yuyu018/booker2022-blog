import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * 寫稿後台（網址 /keystatic）。
 *
 * ・在自己電腦跑 npm run dev 時＝本機模式，改完直接存成檔案。
 * ・上線後＝GitHub 模式，寫稿人用 GitHub 帳號登入，
 *   存檔會寫進 GitHub，由網站主人合併後才會真正上線。
 */

const isDev = import.meta.env.DEV;

/** 一段可以換行的長文字 */
const para = (label: string, description?: string) =>
  fields.text({ label, description, multiline: true });

/** 四大分類的文字設定 */
const categoryFields = (label: string) =>
  fields.object(
    {
      title: fields.text({ label: '分類名稱', description: '顯示在導覽列、頁尾與文章標籤上' }),
      labelEn: fields.text({ label: '英文小標', description: '分類頁標題上方的英文字，例如 MONEY & ABUNDANCE' }),
      desc: para('分類說明', '分類頁最上方的介紹文字'),
      pillar: para('首頁一句話', '首頁「內容支柱」區塊顯示的短句'),
    },
    { label },
  );

/*
 * 不使用 Keystatic 內建的 locale：它的 zh-TW 是機器翻譯
 * （Save→「節省」、New branch→「新分行」），比英文還難懂。
 * 改用 public/keystatic-zh.js 覆蓋成符合我們流程的用語。
 */
export default config({
  ui: {
    brand: { name: '布克小姐｜再富養一次' },
    navigation: {
      文章: ['posts'],
      頁面文字: ['home', 'about', 'services', 'contact', 'blog'],
      全站設定: ['site', 'categories'],
    },
  },

  storage: isDev
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: { owner: 'yuyu018', name: 'booker2022-blog' },
        /* 寫稿人新開的分支都會叫 draft-xxx，方便辨認 */
        branchPrefix: 'draft-',
      },

  collections: {
    posts: collection({
      label: '文章',
      path: 'src/content/blog/fb/*',
      slugField: 'title',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'pubDate'],
      schema: {
        title: fields.slug({
          name: { label: '標題', description: '顯示在文章頁與列表的標題' },
          slug: {
            label: '網址名稱',
            description: '這篇文章的網址，建議用英文或數字，例如 my-first-post。存檔後不要再改，以免舊連結失效。',
          },
        }),
        description: para('摘要', '顯示在文章列表，大約 60–90 字'),
        /* 用 datetime 才不會把舊文章的時間抹掉（同一天的文章靠時間排序） */
        pubDate: fields.datetime({ label: '發布時間', description: '文章在網站上的日期，也決定排序' }),
        category: fields.select({
          label: '分類',
          options: [
            { label: '金錢', value: 'money' },
            { label: '生活', value: 'life' },
            { label: '閱讀', value: 'reading' },
            { label: '自我成長', value: 'growth' },
          ],
          defaultValue: 'life',
        }),
        tags: fields.array(fields.text({ label: '標籤' }), {
          label: '標籤',
          description: '可留空。每個標籤按一次「新增」加一項',
          itemLabel: (props) => props.value,
        }),
        /* 圖片會放進 src/assets/fb/<文章代號>/，這是 Keystatic 的固定規則 */
        heroImage: fields.image({
          label: '主視覺圖',
          description: '文章開頭的大圖，可留空',
          directory: 'src/assets/fb',
          publicPath: '../../../assets/fb/',
        }),
        /* 專案的文章是 .md，預設是 .mdoc，要指定副檔名才讀得到 */
        content: fields.markdoc({
          label: '內文',
          extension: 'md',
          options: {
            image: { directory: 'src/assets/fb', publicPath: '../../../assets/fb/' },
          },
        }),
      },
    }),
  },

  singletons: {
    /* ───────── 首頁 ───────── */
    home: singleton({
      label: '首頁',
      path: 'src/data/home/',
      format: { data: 'json' },
      schema: {
        seoTitle: fields.text({ label: '瀏覽器分頁標題', description: '也會顯示在 Google 搜尋結果' }),
        seoDescription: para('搜尋結果說明文字', '大約 60–90 字'),

        heroSide: fields.text({ label: '首屏｜左側直排小字' }),
        heroTitleLine1: fields.text({ label: '首屏｜大標第一行' }),
        heroTitleLine2: fields.text({ label: '首屏｜大標第二行' }),
        heroLabelEn: fields.text({ label: '首屏｜英文小標' }),
        heroName: fields.text({ label: '首屏｜網站名稱' }),
        heroDescLines: fields.array(fields.text({ label: '一行' }), {
          label: '首屏｜介紹文字',
          description: '一項就是畫面上的一行，可自由增減',
          itemLabel: (props) => props.value,
        }),
        heroBtnPrimary: fields.text({ label: '首屏｜主要按鈕文字', description: '點了會到文章列表' }),
        heroBtnSecondary: fields.text({ label: '首屏｜次要按鈕文字', description: '點了會到關於頁' }),
        stats: fields.array(
          fields.object({
            num: fields.text({ label: '數字', description: '想自動顯示網站文章總數，就填 auto' }),
            label: fields.text({ label: '說明文字' }),
          }),
          {
            label: '首屏｜三個數字',
            itemLabel: (props) => `${props.fields.num.value} ${props.fields.label.value}`,
          },
        ),

        pillarsLabelEn: fields.text({ label: '內容支柱｜英文小標' }),
        pillarsTitle: fields.text({ label: '內容支柱｜標題' }),

        writingsLabelEn: fields.text({ label: '精選文章｜英文小標' }),
        writingsTitle: fields.text({ label: '精選文章｜標題' }),
        writingsAllLabel: fields.text({ label: '精選文章｜右上角連結文字' }),

        quoteLabel: fields.text({ label: '摘句｜小標' }),
        quoteText: para('摘句｜句子'),
        quoteAuthor: fields.text({ label: '摘句｜署名' }),

        aboutLabelEn: fields.text({ label: '關於區塊｜英文小標' }),
        aboutTitleLine1: fields.text({ label: '關於區塊｜標題第一行' }),
        aboutTitleLine2: fields.text({ label: '關於區塊｜標題第二行' }),
        aboutIntro: para('關於區塊｜介紹文字'),
        aboutTags: fields.array(fields.text({ label: '標籤' }), {
          label: '關於區塊｜標籤',
          itemLabel: (props) => props.value,
        }),
        aboutBtn: fields.text({ label: '關於區塊｜按鈕文字' }),
        portraitCaption: fields.text({ label: '關於區塊｜照片下方文字' }),

        newsletterTitle: fields.text({ label: '電子報｜標題' }),
        newsletterDesc: para('電子報｜說明文字'),
        newsletterPlaceholder: fields.text({ label: '電子報｜輸入框提示文字' }),
        newsletterButton: fields.text({ label: '電子報｜按鈕文字' }),
      },
    }),

    /* ───────── 關於頁 ───────── */
    about: singleton({
      label: '關於頁',
      path: 'src/data/about/',
      format: { data: 'json' },
      schema: {
        seoTitle: fields.text({ label: '瀏覽器分頁標題' }),
        seoDescription: para('搜尋結果說明文字'),

        heroLabelEn: fields.text({ label: '最上方｜英文小標' }),
        heroTitleLine1: fields.text({ label: '最上方｜標題第一行' }),
        heroTitleLine2: fields.text({ label: '最上方｜標題第二行' }),
        heroDesc: para('最上方｜自我介紹'),
        heroTags: fields.array(fields.text({ label: '標籤' }), {
          label: '最上方｜標籤',
          itemLabel: (props) => props.value,
        }),
        portraitCaption: fields.text({ label: '照片下方文字' }),

        storyLabelEn: fields.text({ label: '故事區｜英文小標' }),
        storyTitle: fields.text({ label: '故事區｜標題' }),
        stories: fields.array(
          fields.object({
            title: fields.text({ label: '小標題' }),
            paras: fields.array(para('段落'), {
              label: '內文段落',
              description: '一項是一段，段落之間會自動空行',
              itemLabel: (props) => props.value.slice(0, 20),
            }),
          }),
          {
            label: '故事區｜每段故事',
            description: '順序就是畫面上的順序，壹貳參的編號會自動產生',
            itemLabel: (props) => props.fields.title.value,
          },
        ),

        beliefsLabelEn: fields.text({ label: '信念區｜英文小標' }),
        beliefsTitle: fields.text({ label: '信念區｜標題' }),
        beliefs: fields.array(
          fields.object({
            title: fields.text({ label: '信念標題' }),
            desc: para('信念說明'),
          }),
          { label: '信念區｜每個信念', itemLabel: (props) => props.fields.title.value },
        ),

        ctaTitle: fields.text({ label: '頁尾邀請｜標題' }),
        ctaDesc: para('頁尾邀請｜說明文字'),
        ctaBtnPrimary: fields.text({ label: '頁尾邀請｜主要按鈕文字' }),
        ctaBtnSecondary: fields.text({ label: '頁尾邀請｜次要按鈕文字' }),
      },
    }),

    /* ───────── 服務項目頁 ───────── */
    services: singleton({
      label: '服務項目頁',
      path: 'src/data/services/',
      format: { data: 'json' },
      schema: {
        seoTitle: fields.text({ label: '瀏覽器分頁標題' }),
        seoDescription: para('搜尋結果說明文字'),

        heroLabelEn: fields.text({ label: '最上方｜英文小標' }),
        heroLabelZh: fields.text({ label: '最上方｜中文小標' }),
        heroTitle: fields.text({ label: '最上方｜標題前半', description: '例如「我能為你」' }),
        heroTitleAccent: fields.text({ label: '最上方｜標題後半（會變色）', description: '例如「做什麼」' }),
        heroDesc: para('最上方｜說明文字'),

        services: fields.array(
          fields.object({
            en: fields.text({ label: '英文小標', description: '例如 WRITING' }),
            title: fields.text({ label: '服務名稱' }),
            desc: para('服務說明'),
            items: fields.array(fields.text({ label: '項目' }), {
              label: '細項清單',
              itemLabel: (props) => props.value,
            }),
          }),
          {
            label: '服務項目',
            description: '編號會依順序自動產生，不用自己填',
            itemLabel: (props) => props.fields.title.value,
          },
        ),
        itemCtaLabel: fields.text({ label: '每項服務下方的連結文字' }),
        note: para('頁面下方的提醒文字'),

        ctaTitle: fields.text({ label: '頁尾邀請｜標題' }),
        ctaDesc: para('頁尾邀請｜說明文字'),
        ctaButton: fields.text({ label: '頁尾邀請｜按鈕文字' }),
      },
    }),

    /* ───────── 聯絡頁 ───────── */
    contact: singleton({
      label: '聯絡資訊頁',
      path: 'src/data/contact/',
      format: { data: 'json' },
      schema: {
        seoTitle: fields.text({ label: '瀏覽器分頁標題' }),
        seoDescription: para('搜尋結果說明文字'),

        heroLabelEn: fields.text({ label: '最上方｜英文小標' }),
        heroLabelZh: fields.text({ label: '最上方｜中文小標' }),
        heroTitle: fields.text({ label: '最上方｜標題前半' }),
        heroTitleAccent: fields.text({ label: '最上方｜標題後半（會變色）' }),
        heroDesc: para('最上方｜說明文字'),

        channels: fields.array(
          fields.object({
            title: fields.text({ label: '聯絡方式名稱', description: '例如 電子郵件' }),
            desc: para('說明文字'),
            linkText: fields.text({ label: '顯示的文字', description: '例如 hello@missbooker.com' }),
            linkHref: fields.text({
              label: '點下去會去哪裡',
              description: '電子信箱請寫 mailto:信箱位址；社群請貼完整網址 https://…',
            }),
          }),
          { label: '聯絡方式', itemLabel: (props) => props.fields.title.value },
        ),
        note: para('聯絡方式下方的補充文字'),

        formLabelEn: fields.text({ label: '表單｜英文小標' }),
        formTitle: fields.text({ label: '表單｜標題' }),
        formAction: fields.text({
          label: '表單｜收信網址',
          description: '技術設定，不確定請不要更動（目前使用 Formspree）',
        }),
        labelName: fields.text({ label: '表單｜姓名欄位文字' }),
        placeholderName: fields.text({ label: '表單｜姓名欄位提示' }),
        labelEmail: fields.text({ label: '表單｜信箱欄位文字' }),
        placeholderEmail: fields.text({ label: '表單｜信箱欄位提示' }),
        labelSubject: fields.text({ label: '表單｜主旨欄位文字' }),
        subjectOptions: fields.array(fields.text({ label: '選項' }), {
          label: '表單｜主旨下拉選單',
          description: '第一項是提示文字（例如「請選擇聯絡類型」），其餘才是真正的選項',
          itemLabel: (props) => props.value,
        }),
        labelMessage: fields.text({ label: '表單｜訊息欄位文字' }),
        placeholderMessage: fields.text({ label: '表單｜訊息欄位提示' }),
        submitLabel: fields.text({ label: '表單｜送出按鈕文字' }),
      },
    }),

    /* ───────── 文章列表與分類頁 ───────── */
    blog: singleton({
      label: '文章列表頁',
      path: 'src/data/blog/',
      format: { data: 'json' },
      schema: {
        seoTitle: fields.text({ label: '瀏覽器分頁標題' }),
        seoDescription: para('搜尋結果說明文字'),

        heroLabelEn: fields.text({ label: '最上方｜英文小標' }),
        heroLabelZh: fields.text({ label: '最上方｜中文小標' }),
        heroTitle: fields.text({ label: '最上方｜標題' }),
        heroDescBefore: fields.text({ label: '說明文字｜數字前面那段', description: '完整句子是「這段 + 文章總數 + 後面那段」' }),
        heroDescAfter: fields.text({ label: '說明文字｜數字後面那段' }),
        groupLinkBefore: fields.text({ label: '各分類連結｜數字前面', description: '例如「全部」' }),
        groupLinkAfter: fields.text({ label: '各分類連結｜數字後面', description: '例如「篇 →」' }),

        searchLabel: fields.text({ label: '搜尋｜欄位標題' }),
        searchPlaceholder: fields.text({ label: '搜尋｜輸入框提示文字' }),
        searchClear: fields.text({ label: '搜尋｜清除按鈕說明' }),
        pagerPrev: fields.text({ label: '分頁｜上一頁' }),
        pagerNext: fields.text({ label: '分頁｜下一頁' }),

        categoryLabelZh: fields.text({ label: '分類頁｜中文小標' }),
        categoryCountBefore: fields.text({ label: '分類頁｜篇數前面', description: '例如「共」' }),
        categoryCountAfter: fields.text({ label: '分類頁｜篇數後面', description: '例如「篇文章」' }),
        categoryEmpty: fields.text({ label: '分類頁｜沒有文章時顯示' }),
        categoryMoreText: para('分類頁｜最下方邀請文字'),
        categoryMoreBtnPrimary: fields.text({ label: '分類頁｜主要按鈕文字' }),
        categoryMoreBtnSecondary: fields.text({ label: '分類頁｜次要按鈕文字' }),
      },
    }),

    /* ───────── 全站共用 ───────── */
    site: singleton({
      label: '網站共用文字',
      path: 'src/data/site/',
      format: { data: 'json' },
      schema: {
        siteTitle: fields.text({ label: '網站名稱', description: '會用在頁尾、RSS 與分享預覽' }),
        siteDescription: para('網站簡介'),

        navTagMain: fields.text({ label: '導覽列｜第一行標語' }),
        navTagSub: fields.text({ label: '導覽列｜第二行標語' }),
        navTagSlogan: fields.text({ label: '導覽列｜第三行標語' }),

        navHome: fields.text({ label: '選單｜首頁' }),
        navServices: fields.text({ label: '選單｜服務項目' }),
        navBlog: fields.text({ label: '選單｜文章' }),
        navAbout: fields.text({ label: '選單｜關於' }),
        navContact: fields.text({ label: '選單｜聯絡' }),
        navAllPosts: fields.text({ label: '選單｜所有文章' }),

        footerTagline: para('頁尾｜標語'),
        footerNavTitle: fields.text({ label: '頁尾｜第一欄標題' }),
        footerBlogTitle: fields.text({ label: '頁尾｜第二欄標題' }),
        footerCopyright: fields.text({ label: '頁尾｜版權文字', description: '年份會自動加在前面' }),
      },
    }),

    /* ───────── 四大分類 ───────── */
    categories: singleton({
      label: '四大分類文字',
      path: 'src/data/categories/',
      format: { data: 'json' },
      schema: {
        money: categoryFields('第一類（網址 /blog/money）'),
        life: categoryFields('第二類（網址 /blog/life）'),
        reading: categoryFields('第三類（網址 /blog/reading）'),
        growth: categoryFields('第四類（網址 /blog/growth）'),
      },
    }),
  },
});
