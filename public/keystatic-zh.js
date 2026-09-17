/*
 * 寫稿後台中文化。
 *
 * Keystatic 內建的 zh-TW 是機器翻譯（Save→「節省」、New branch→「新分行」），
 * 所以這裡自己覆蓋，並且把 Git 術語換成寫稿人聽得懂的說法：
 *   branch → 草稿、pull request → 審稿、default branch → 正式版。
 *
 * 由 src/middleware.ts 只在 /keystatic 底下的頁面載入。
 */
(function () {
  /** 整段文字完全相同時才替換 */
  var DICT = {
    // ── 基本動作 ──
    'Add': '新增',
    'Save': '儲存',
    'Cancel': '取消',
    'Create': '建立',
    'Edit': '編輯',
    'Delete': '刪除',
    'Remove': '移除',
    'Reset': '還原',
    'Clear': '清除',
    'Search': '搜尋',
    'Loading': '載入中',
    'Loading…': '載入中…',
    'Unsaved': '尚未儲存',
    'Choose file': '選擇檔案',
    'Log in with GitHub': '用 GitHub 帳號登入',
    'Log out': '登出',
    'Sign out': '登出',

    // ── 導覽 ──
    'Dashboard': '總覽',
    'Collection': '內容',
    'Collections': '內容',
    'Singleton': '頁面',
    'Singletons': '頁面',

    // ── 內文編輯器 ──
    'Text formatting': '文字格式',
    'Formatting options': '格式選項',
    'Clear formatting': '清除格式',
    'Text block': '段落樣式',
    'Blocks': '插入區塊',
    'Lists': '清單',
    'Paragraph': '內文',
    'Heading 1': '大標題',
    'Heading 2': '中標題',
    'Heading 3': '小標題',
    'Heading 4': '標題 4',
    'Heading 5': '標題 5',
    'Heading 6': '標題 6',
    'Bold': '粗體',
    'Italic': '斜體',
    'Strikethrough': '刪除線',
    'Code': '程式碼',
    'Code block': '程式碼區塊',
    'Quote': '引言',
    'Divider': '分隔線',
    'Image': '圖片',
    'Table': '表格',
    'Link': '連結',
    'Insert': '插入',
    'Bullet list': '項目清單',
    'Numbered list': '編號清單',
    'Undo': '復原',
    'Redo': '重做',
    'Resize': '調整大小',
    'Click to start dragging.': '按住可拖曳調整。',

    // ── 其他介面 ──
    'Regenerate': '重新產生',
    'regenerate': '重新產生',
    'Slug': '網址名稱',
    'Dismiss': '關閉',
    'Breadcrumbs': '目前位置',
    'Open app navigation': '開啟選單',
    'theme': '佈景主題',
    'show search': '顯示搜尋',
    'sortable column': '可排序的欄位',

    // ── 清單 ──
    'Empty list': '目前沒有項目',
    'Add the first item to see it here.': '按上面的「新增」加入第一項。',
    'Delete entry': '刪除這一篇',
    'Duplicate entry': '複製這一篇',

    // ── 草稿（branch）與審稿（pull request）──
    'New branch…': '另開草稿',
    'New branch...': '另開草稿',
    'Branches': '草稿',
    'Branch name': '草稿名稱',
    'Current branch': '目前的草稿',
    'Other branches': '其他草稿',
    'Default branch': '正式版',
    'Delete branch': '刪除草稿',
    'Create branch': '建立草稿',
    'Based on': '從哪個版本開始',
    'Create pull request': '送出審稿',
    'Commit': '儲存這次修改',
    'Merge': '合併',
    'Discard': '捨棄修改',
    'Discard changes': '捨棄修改',
    'Search branches': '搜尋草稿',
    'Pull requests': '審稿中',
    'View pull requests': '查看審稿',
    'View pull request': '查看審稿',
    'The currently checked out branch. Choose this if you need to build on existing work from the current branch.':
      '目前正在編輯的草稿。想接續先前還沒完成的修改，就選這個。',
    'The default branch in your repository. Choose this to start something new that’s not dependent on your current branch.':
      '網站正式上線中的版本。要開始一件全新的修改，就選這個。',
  };

  /** 需要套用正規式的（含數字等變數） */
  var RULES = [
    [/^(\d+)\s+(?:entry|entries)$/, '$1 篇'],
    [/^Showing (\d+) of (\d+)$/, '顯示 $1 / $2 筆'],
    /* 「Pull request #1」這種帶編號的，編號要留著 */
    [/^Pull requests?\s*#(\d+)$/, '審稿 #$1'],
    [/^View pull requests?\s*#(\d+)$/, '查看審稿 #$1'],
  ];

  function translate(text) {
    var key = text.trim();
    if (!key) return null;
    if (DICT[key]) return text.replace(key, DICT[key]);
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(key)) return key.replace(RULES[i][0], RULES[i][1]);
    }
    return null;
  }

  /* 文章內文絕對不能動，所以跳過可編輯區與程式碼區 */
  function isProtected(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return !el || !!el.closest('[contenteditable="true"], textarea, code, pre');
  }

  function walkText(root) {
    if (root.nodeType === 3) {
      if (isProtected(root)) return;
      var out = translate(root.nodeValue);
      if (out !== null) root.nodeValue = out;
      return;
    }
    if (root.nodeType !== 1) return;
    if (isProtected(root)) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      if (isProtected(node)) return;
      var out = translate(node.nodeValue);
      if (out !== null) node.nodeValue = out;
    });

    var ATTRS = ['aria-label', 'title', 'placeholder'];
    var els = root.querySelectorAll('[aria-label], [title], [placeholder]');
    [].forEach.call(els, function (el) {
      ATTRS.forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v) return;
        var out = translate(v);
        if (out !== null) el.setAttribute(a, out);
      });
    });
  }

  function run() {
    walkText(document.body);
  }

  /* Keystatic 是 React 畫面，內容會一直重繪，所以持續監看 */
  var scheduled = false;
  var observer = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      run();
    });
  });

  function start() {
    run();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
