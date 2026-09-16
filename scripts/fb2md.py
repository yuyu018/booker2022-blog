#!/usr/bin/env python3
"""FB 匯出 JSON → Astro Markdown。

用法（在專案根目錄執行）：
  python3 scripts/fb2md.py <匯出解壓後的根目錄> . [--only 標題片段1,標題片段2] [--collapse]
  --only      只輸出標題含指定片段的文章（排版預覽用）；其餘僅列在報告中
  --collapse  把 FB 的單行換行併成一般段落（預設保留短句換行）

每次執行都會清空並重建 src/content/blog/fb 與 src/assets/fb。
"""
import argparse, datetime, json, pathlib, re, shutil

ap = argparse.ArgumentParser()
ap.add_argument('export_root')
ap.add_argument('project_root')
ap.add_argument('--only', default='')
ap.add_argument('--collapse', action='store_true')
args = ap.parse_args()

EXPORT = pathlib.Path(args.export_root)
PROJ = pathlib.Path(args.project_root)
OUT_MD = PROJ / 'src/content/blog/fb'
OUT_IMG = PROJ / 'src/assets/fb'
ONLY = [s for s in args.only.split(',') if s]


def fix(o):
    """FB 匯出把 UTF-8 位元組當 latin-1 寫入，需還原。"""
    if isinstance(o, str):
        try:
            return o.encode('latin-1').decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            return o
    if isinstance(o, list):
        return [fix(x) for x in o]
    if isinstance(o, dict):
        return {k: fix(v) for k, v in o.items()}
    return o


raw = fix(json.loads((EXPORT / 'your_facebook_activity/posts/your_posts__check_ins__photos_and_videos_1.json').read_text()))

# 人工判讀後的分類（依文章主旨，不依作者 hashtag）。新文章不在表內時才用下方關鍵字規則。
CATEGORY_BY_SLUG = {
    # 金錢
    '2025-11-17-2125': 'money', '2025-11-27-1227': 'money', '2026-08-24-2103': 'money',
    '2026-09-04-1741': 'money', '2026-09-06-1454': 'money', '2026-09-06-1539': 'money',
    '2026-09-06-1546': 'money', '2026-09-06-1615': 'money', '2026-09-06-2221': 'money',
    '2026-09-07-1503': 'money', '2026-09-07-1541': 'money', '2026-09-07-1631': 'money',
    '2026-09-08-1155': 'money', '2026-09-08-1205': 'money', '2026-09-08-1733': 'money',
    '2026-09-08-1737': 'money', '2026-09-09-2038': 'money', '2026-09-09-2046': 'money',
    '2026-09-09-2058': 'money',
    # 生活
    '2025-10-28-1524': 'life', '2025-11-15-1307': 'life', '2025-11-27-1106': 'life',
    '2025-12-12-1717': 'life', '2025-12-13-1032': 'life', '2026-01-17-2119': 'life',
    '2026-01-18-0918': 'life', '2026-01-18-1416': 'life', '2026-03-21-1142': 'life',
    '2026-08-18-2224': 'life', '2026-08-22-2349': 'life', '2026-08-29-2306': 'life',
    '2026-08-31-2029': 'life', '2026-09-01-2222': 'life', '2026-09-02-1257': 'life',
    '2026-09-03-2059': 'life', '2026-09-06-2042': 'life', '2026-09-07-1525': 'life',
    '2026-09-08-1226': 'life', '2026-09-08-1310': 'life', '2026-09-09-2055': 'life',
    # 閱讀
    '2026-08-30-2129': 'reading', '2026-09-06-1603': 'reading', '2026-09-06-1629': 'reading',
    '2026-09-06-2241': 'reading',
    # 自我成長
    '2025-11-17-1940': 'growth', '2025-11-25-1637': 'growth', '2025-11-26-0958': 'growth',
    '2025-12-28-1616': 'growth', '2026-08-23-2249': 'growth', '2026-08-25-2130': 'growth',
    '2026-08-26-1923': 'growth', '2026-08-27-2129': 'growth', '2026-09-05-1602': 'growth',
    '2026-09-08-1048': 'growth',
}
PREFIX_CATEGORY = {
    '金錢觀念': 'money', '金錢觀': 'money', '夫妻的金錢觀': 'money', '負債': 'money',
    '閱讀筆記': 'reading',
    '生活日記': 'life',
}
CATEGORY_RULES = [
    ('reading', ['閱讀筆記', '讀完《', '看完《', '書裡']),
    ('growth', ['lifecoach', 'life coach', '自我成長', '人生課題', '邊界', '覺察']),
    ('money', ['金錢', '投資', '財務', '財富', '存錢', '負債', '月光', '理財', '致富', '消費', '收入']),
]

TITLE_PIPE = re.compile(r'^#?\s*(.{1,20}?)｜(.+)$')
DIARY = re.compile(r'^\d{4}[/.]\d{1,2}[/.]\d{1,2}')
HASHTAG_LINE = re.compile(r'^(#[^\s#]+\s*)+$')


def entry_text(p):
    t = ''.join(x.get('post', '') for x in p.get('data', []))
    if not t.strip():
        t = next((m['media'].get('description', '') for a in p.get('attachments', [])
                  for m in a.get('data', []) if 'media' in m and m['media'].get('description', '').strip()), '')
    return t.replace('\r\n', '\n')


def entry_images(p):
    return [m['media']['uri'] for a in p.get('attachments', []) for m in a.get('data', []) if 'media' in m]


def has_place(p):
    return any('place' in m for a in p.get('attachments', []) for m in a.get('data', []))


def split_title(lines):
    """回傳 (標題, 移除標題後的行)。"""
    nonempty = [i for i, l in enumerate(lines) if l.strip()]
    if not nonempty:
        return '（無標題）', lines
    first_i = nonempty[0]
    first = lines[first_i].strip()

    # 日記：日期行後若緊接「分類｜標題」，以後者為標題
    if DIARY.match(first):
        if len(nonempty) > 1:
            second_i = nonempty[1]
            m = TITLE_PIPE.match(lines[second_i].strip())
            if m:
                return f'{m.group(1).strip()}｜{m.group(2).strip()}', lines[second_i + 1:]
        return f'生活日記｜{first}', lines[first_i + 1:]

    m = TITLE_PIPE.match(first)
    if m:
        return f'{m.group(1).strip()}｜{m.group(2).strip()}', lines[first_i + 1:]

    if first.startswith('#') and len(first) <= 40:
        return first.lstrip('#').strip(), lines[first_i + 1:]

    # 以冒號結尾的首行是引言（例：「最近看到一句話：」），取作標題但內文保留
    if first.endswith(('：', ':')):
        return first.rstrip('：:'), lines[first_i:]

    if len(first) <= 30:
        return first, lines[first_i + 1:]

    short = re.split(r'[，。！？!?]', first)[0]
    if short.count('《') > short.count('》') and '》' in first:
        short = first[:first.index('》') + 1]
    # 首句太長：標題取首句前段，但內文保留整句
    return (short[:28] + ('…' if len(short) > 28 else '')), lines[first_i:]


def strip_trailing_tags(lines):
    tags = []
    while lines and (not lines[-1].strip() or HASHTAG_LINE.match(lines[-1].strip())):
        tags = re.findall(r'#([^\s#]+)', lines[-1]) + tags
        lines = lines[:-1]
    return lines, list(dict.fromkeys(tags))


def md_inline(line):
    line = line.replace('<', '&lt;')
    # FB 的 **粗體** 常與中文標點、表情相鄰，Markdown 解析不穩，直接轉 HTML
    line = re.sub(r'\*\*\s*(.+?)\s*\*\*', r'<strong>\1</strong>', line)
    line = re.sub(r'^(\s*)#', r'\1\\#', line)
    return line


def to_markdown(lines, collapse):
    text = '\n'.join(lines).strip('\n')
    text = re.sub(r'^[ \t]*[⸻—─]{1,}[ \t]*$', '\n<<HR>>\n', text, flags=re.M)
    blocks = [b for b in re.split(r'\n\s*\n', text) if b.strip()]
    out = []
    for b in blocks:
        if b.strip() == '<<HR>>':
            out.append('---')
            continue
        ls = [md_inline(l.rstrip()) for l in b.split('\n') if l.strip()]
        out.append(''.join(ls) if collapse else '\\\n'.join(ls))
    return '\n\n'.join(out)


def plain_excerpt(md, n=90):
    s = re.sub(r'<[^>]+>|\\\n|\\#|^---$', '', md, flags=re.M)
    s = re.sub(r'\s+', '', s)
    return s[:n] + ('…' if len(s) > n else '')


def classify(slug, title, body):
    if slug in CATEGORY_BY_SLUG:
        return CATEGORY_BY_SLUG[slug]
    prefix = title.split('｜')[0] if '｜' in title else ''
    if prefix in PREFIX_CATEGORY:
        return PREFIX_CATEGORY[prefix]
    for hay in (title, body[:400]):
        for cat, kws in CATEGORY_RULES:
            if any(k in hay for k in kws):
                return cat
    return 'life'


# ── 第一輪：整理條目 ──
entries, skipped = [], []
for p in raw:
    ts = p['timestamp']
    when = datetime.datetime.fromtimestamp(ts)
    txt = entry_text(p)
    imgs = entry_images(p)
    label = (txt.strip().split('\n')[0] if txt.strip() else p.get('title', ''))[:40]
    if has_place(p):
        skipped.append((when, label, '含打卡地點與他人資訊，需人工確認'))
        continue
    if len(txt.strip()) < 60:
        why = '短文案＋圖文卡片（全文在圖上）' if imgs else '內容過短（純分享／連結／社團轉貼）'
        skipped.append((when, label, why))
        continue
    entries.append({'ts': ts, 'when': when, 'txt': txt, 'imgs': imgs})

# 去重：同一篇轉貼多次，保留字數最多者
by_first = {}
for e in entries:
    key = re.sub(r'\s+', '', e['txt'])[:60]
    if key not in by_first or len(e['txt']) > len(by_first[key]['txt']):
        by_first[key] = e
dups = len(entries) - len(by_first)
entries = sorted(by_first.values(), key=lambda e: e['ts'])

# ── 第二輪：轉換 ──
plan, used_slugs = [], set()
for e in entries:
    lines = e['txt'].split('\n')
    title, body_lines = split_title(lines)
    body_lines, tags = strip_trailing_tags(body_lines)
    body = to_markdown(body_lines, args.collapse)
    slug = e['when'].strftime('%Y-%m-%d-%H%M')
    while slug in used_slugs:
        slug += 'b'
    used_slugs.add(slug)
    plan.append({
        'slug': slug, 'title': title, 'date': e['when'], 'tags': tags,
        'category': classify(slug, title, e['txt']), 'body': body,
        'desc': plain_excerpt(body), 'imgs': e['imgs'], 'chars': len(e['txt']),
    })

selected = [x for x in plan if not ONLY or any(o in x['title'] for o in ONLY)]

# ── 輸出（每次重跑都先清空產生目錄，確保結果可重現）──
shutil.rmtree(OUT_MD, ignore_errors=True)
shutil.rmtree(OUT_IMG, ignore_errors=True)
OUT_MD.mkdir(parents=True)
OUT_IMG.mkdir(parents=True)

for x in selected:
    # 圖片放進以文章代號命名的子資料夾——Keystatic 後台只認得這種結構
    img_names = []
    img_dir = OUT_IMG / x['slug']
    for i, uri in enumerate(x['imgs'], 1):
        name = f"{x['slug']}-{i}.jpg"
        img_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(EXPORT / uri, img_dir / name)
        img_names.append(f"{x['slug']}/{name}")
    fm = [
        '---',
        f"title: {json.dumps(x['title'], ensure_ascii=False)}",
        f"description: {json.dumps(x['desc'], ensure_ascii=False)}",
        f"pubDate: {x['date'].isoformat()}",
        f"category: {x['category']}",
        f"tags: {json.dumps(x['tags'], ensure_ascii=False)}",
    ]
    if img_names:
        fm.append(f"heroImage: '../../../assets/fb/{img_names[0]}'")
    fm.append('---')
    extra = ''.join(f"\n\n![](../../../assets/fb/{n})" for n in img_names[1:])
    (OUT_MD / f"{x['slug']}.md").write_text('\n'.join(fm) + '\n\n' + x['body'] + extra + '\n')

# ── 報告 ──
cat_zh = {'money': '金錢', 'life': '生活', 'reading': '閱讀', 'growth': '成長'}
unmapped = [x for x in plan if x['slug'] not in CATEGORY_BY_SLUG]
print(f"原始條目 {len(raw)}｜略過 {len(skipped)}｜重複 {dups}｜可匯入 {len(plan)}｜本次輸出 {len(selected)}")
print('分類統計：', {cat_zh[k]: sum(1 for x in plan if x['category'] == k) for k in cat_zh})
if unmapped:
    print(f'⚠️ {len(unmapped)} 篇不在人工分類表內，改用關鍵字規則：', [x['slug'] for x in unmapped])
print('\n── 可匯入文章 ──')
for x in plan:
    mark = '★' if x in selected else ' '
    print(f"{mark} {x['date']:%Y-%m-%d} [{cat_zh[x['category']]}] {len(x['imgs'])}圖 {x['chars']:>5}字 /blog/fb/{x['slug']}  {x['title']}")
print('\n── 略過 ──')
for when, lbl, why in sorted(skipped):
    print(f"  {when:%Y-%m-%d} {why}：{lbl}")
