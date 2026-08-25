/*
 * 让分享链接与复制链接跟随「当前打开的域名」，而不是 hugo.yaml 里写死的 baseURL。
 *
 * 二维码 / 微博 / 微信 分享链接在 HTML 中保留 {current_url} 占位符（构建时被替换为
 * 相对路径），页面加载后再用 window.location.href 拼接成完整 URL。
 *
 * 复制链接按钮（data-td-action="copy_link"）的 data-td-url 也在这里动态填充为当前 URL，
 * 覆盖主题默认的 canonical URL。
 */
(function () {
  'use strict';

  function currentURL() {
    return window.location.href.split('#')[0];
  }

  // 1. 复制链接：把 data-td-url 设为当前 URL，让 page-actions.js 复制它。
  document.querySelectorAll('[data-td-action="copy_link"]').forEach(function (control) {
    control.dataset.tdUrl = currentURL();
  });

  // 2. 二维码 / 微博 / 微信 分享：把 href 中的相对路径替换为当前完整 URL。
  document.querySelectorAll('a[data-td-share-dynamic]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;
    // 主题或模板可能在 href 里留下相对路径（如 /columns），也可能还留着字面 {current_url}。
    // 统一用当前 URL 替换掉 query 参数中的值。
    var url = new URL(href, window.location.href);
    url.searchParams.forEach(function (value, key) {
      if (value === '{current_url}' || !value.startsWith('http')) {
        url.searchParams.set(key, currentURL());
      }
    });
    link.setAttribute('href', url.toString());
  });
})();
