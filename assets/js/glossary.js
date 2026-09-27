/* 关键词词典：把正文里出现的词条自动链到 /glossary/<slug>/，并附悬浮释义卡。
 *
 * 设计取舍（为什么是运行时 JS 而不是 Hugo 构建期替换）：
 *  1. Hugo 的正则引擎是 Go RE2，不支持 lookahead / lookbehind，中文又没有空格
 *     分词边界，构建期对已渲染 HTML 做替换极易误伤（「数据」命中「数据库」）。
 *  2. 浏览器端可以对 ASCII 词做「相邻字符是否为单词字符」的边界判断，
 *     对中文词做长词优先匹配，两件事都比模板正则可靠。
 *  3. 词库增删不需要改动任何一篇文章，重新构建即生效。
 *
 * 代价：Markdown 源码里没有真实链接，所以主题自带的 backlinks 索引扫不到。
 * 「哪些文章提及本词」改由服务端的 glossary/mention-index.html 扫原文生成。
 */
(() => {
  'use strict';

  const cfgEl = document.getElementById('td-glossary-config');
  if (!cfgEl) return;

  let cfg;
  try {
    cfg = JSON.parse(cfgEl.textContent);
  } catch (err) {
    return;
  }
  if (!cfg || !cfg.index) return;

  const SELF = cfg.self || '';
  const SKIP_TAGS = new Set([
    'A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'SUP', 'SUB',
    'ABBR', 'KBD', 'BUTTON', 'SVG', 'MATH', 'OPTION'
  ]);
  const WORD = /[A-Za-z0-9_]/;
  const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  const HOVER_DELAY = 120;
  const HIDE_DELAY = 180;

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function loadIndex() {
    const key = 'td-glossary:' + cfg.index;
    try {
      const cached = window.sessionStorage.getItem(key);
      if (cached) return Promise.resolve(JSON.parse(cached));
    } catch (err) { /* sessionStorage 不可用（隐私模式）时直接走网络 */ }

    return fetch(cfg.index, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          try { window.sessionStorage.setItem(key, JSON.stringify(data)); } catch (err) { /* 忽略 */ }
        }
        return data;
      })
      .catch(() => null);
  }

  function buildEntries(data) {
    const list = [];
    (data.terms || []).forEach((t) => {
      if (!t || !t.url) return;
      const forms = (t.forms && t.forms.length) ? t.forms : [t.title];
      forms.forEach((f) => {
        const form = String(f || '').trim();
        if (!form) return;
        // 单个汉字/字母不做自动链接，否则正文会被刷满下划线
        if (form.length < 2) return;
        list.push({ form, url: t.url, title: t.title, summary: t.summary || '' });
      });
    });
    // 长词优先：正则在相同起始位置会取先出现的分支，「单元化部署」因此胜过「单元化」
    list.sort((a, b) => b.form.length - a.form.length);
    return list;
  }

  function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        let p = node.parentElement;
        while (p && p !== root) {
          if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
          if (p.dataset && p.dataset.tdNoGlossary !== undefined) return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function linkify(root, entries, byForm, re) {
    const linked = new Set();
    let count = 0;
    collectTextNodes(root).forEach((node) => {
      const text = node.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) return;
      re.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      let changed = false;
      let m;
      while ((m = re.exec(text)) !== null) {
        const hit = m[0];
        const at = m.index;
        if (hit.length === 0) { re.lastIndex += 1; continue; }

        const entry = byForm.get(hit);
        if (!entry) continue;

        // 英文/数字词要求两侧不是单词字符，避免 ECIF 命中 ECIFX、Java 命中 JavaScript
        const prev = at > 0 ? text.charAt(at - 1) : '';
        const next = text.charAt(at + hit.length);
        const isAscii = !CJK.test(hit);
        if (isAscii && ((prev && WORD.test(prev)) || (next && WORD.test(next)))) continue;

        // 每个词条每页只链一次；词条页不链自己
        if (linked.has(entry.url)) continue;
        if (SELF && entry.url === SELF) { linked.add(entry.url); continue; }

        frag.appendChild(document.createTextNode(text.slice(last, at)));
        const a = document.createElement('a');
        a.className = 'td-glossary-term';
        a.href = entry.url;
        a.textContent = hit;
        a.dataset.tdTerm = entry.title;
        if (entry.summary) a.dataset.tdSummary = entry.summary;
        frag.appendChild(a);

        last = at + hit.length;
        linked.add(entry.url);
        changed = true;
        count += 1;
      }

      if (changed) {
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
    return count;
  }

  function initTooltip() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    const card = document.createElement('div');
    card.className = 'td-glossary-card';
    card.setAttribute('role', 'tooltip');
    card.hidden = true;
    document.body.appendChild(card);

    let showTimer = null;
    let hideTimer = null;

    function place(target) {
      const r = target.getBoundingClientRect();
      card.hidden = false;
      card.style.visibility = 'hidden';
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      let left = r.left + r.width / 2 - w / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      let top = r.bottom + 8;
      if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      card.style.visibility = 'visible';
    }

    function show(target) {
      clearTimeout(hideTimer);
      const title = target.dataset.tdTerm || target.textContent;
      const summary = target.dataset.tdSummary || '';
      card.innerHTML = '';
      const h = document.createElement('strong');
      h.textContent = title;
      card.appendChild(h);
      if (summary) {
        const p = document.createElement('span');
        p.textContent = summary;
        card.appendChild(p);
      }
      const tip = document.createElement('em');
      tip.textContent = target.getAttribute('href');
      card.appendChild(tip);
      place(target);
    }

    function hide() {
      clearTimeout(showTimer);
      hideTimer = setTimeout(() => { card.hidden = true; }, HIDE_DELAY);
    }

    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest && e.target.closest('.td-glossary-term');
      if (!t || t === card) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => show(t), HOVER_DELAY);
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest && e.target.closest('.td-glossary-term');
      if (t) hide();
    });
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', hide);
    window.addEventListener('scroll', () => { if (!card.hidden) card.hidden = true; }, { passive: true });
  }

  function run() {
    const root = document.querySelector('.td-content');
    if (!root) return;
    loadIndex().then((data) => {
      if (!data || !data.terms || !data.terms.length) return;
      const entries = buildEntries(data);
      if (!entries.length) return;
      const byForm = new Map();
      entries.forEach((e) => { if (!byForm.has(e.form)) byForm.set(e.form, e); });
      const re = new RegExp(entries.map((e) => escRe(e.form)).join('|'), 'g');
      if (linkify(root, entries, byForm, re) > 0) initTooltip();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
