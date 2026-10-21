/**
 * mobile-nav.js — 手机端「左树 / 右目录」双抽屉。
 *
 * 背景：Oink 在 <1200px 时由 docs-shell.js 的 initAsideRelocate() 把右栏内容
 * （[data-td-shell-aside]：本页目录、反链、标签云）塞进左侧抽屉的
 * [data-td-shell-aside-slot] 插槽。于是手机上只有一个抽屉，文章树和目录混在
 * 一起，顶栏也只有一个汉堡按钮 —— 这是本次改造要拆开的东西。
 *
 * 目标（仅 <768px 生效）：
 *   - 顶栏：[左菜单] [居中 logo] [搜索] [右目录]
 *   - 左按钮 → 主题的侧栏抽屉（本栏目文章树），从左侧滑出
 *   - 右按钮 → 本脚本新建的右抽屉（本页目录 / 反链 / 标签云），从右侧滑出
 *
 * 与主题的边界：
 *   - 不修改主题任何文件。aside 的 DOM 由本脚本搬运（appendChild），
 *     树折叠等交互的监听器绑在元素自身，搬运后不失效。
 *   - 主题在 1200px 断点会重新 place aside，故用 MutationObserver 兜底：
 *     只要还处于手机断点且 aside 被抢走，就立刻搬回右抽屉。
 *   - 离开手机断点时把 aside 交还主题：宽屏还给 .td-shell-toc__panel，
 *     平板还给插槽，与主题自身的 place() 目标一致。
 */
(function () {
  'use strict';

  var MOBILE = '(max-width: 767.98px)';
  var WIDE = '(min-width: 1200px)';

  function init() {
    var aside = document.querySelector('[data-td-shell-aside]');
    var util = document.querySelector('.td-nav-util-zone');
    var home = document.querySelector('.td-shell-toc__panel');
    var slot = document.querySelector('[data-td-shell-aside-slot]');
    if (!aside || !util) return; // 该页没有右栏内容，不需要右抽屉
    if (document.querySelector('[data-td-mobile-aside-panel]')) return; // 防重复初始化

    var root = document.documentElement;
    var zh = /^zh/i.test(root.lang || 'zh');

    /* ---------------------------------------------------------- 右抽屉 DOM */
    var scrim = document.createElement('div');
    scrim.className = 'td-mobile-aside__scrim';
    scrim.setAttribute('data-td-mobile-aside-close', '');

    var panel = document.createElement('div');
    panel.className = 'td-mobile-aside';
    panel.id = 'td-mobile-aside-panel';
    panel.setAttribute('data-td-mobile-aside-panel', '');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', zh ? '本页目录' : 'On this page');

    var bar = document.createElement('div');
    bar.className = 'td-mobile-aside__bar';

    var title = document.createElement('span');
    title.className = 'td-mobile-aside__title';
    title.textContent = zh ? '本页目录' : 'On this page';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'td-mobile-aside__close';
    closeBtn.setAttribute('data-td-mobile-aside-close', '');
    closeBtn.setAttribute('aria-label', zh ? '关闭目录' : 'Close');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

    bar.appendChild(title);
    bar.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'td-mobile-aside__body';
    body.setAttribute('data-td-mobile-aside-body', '');

    panel.appendChild(bar);
    panel.appendChild(body);

    document.body.appendChild(scrim);
    document.body.appendChild(panel);

    /* ------------------------------------------------------ 顶栏右按钮 */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'td-nav-util td-mobile-aside-toggle';
    trigger.setAttribute('data-td-mobile-aside-open', '');
    trigger.setAttribute('aria-controls', 'td-mobile-aside-panel');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', zh ? '打开本页目录' : 'Open table of contents');
    trigger.setAttribute('title', zh ? '本页目录' : 'On this page');
    trigger.innerHTML = '<i class="td-shell-icon fa-solid fa-list-ul" aria-hidden="true"></i>';
    util.appendChild(trigger);

    /* --------------------------------------------------------- 搬运 aside */
    var isMobile = window.matchMedia(MOBILE);
    var isWide = window.matchMedia(WIDE);

    // 主题自身 place() 的目标：宽屏回 rail 面板，否则回尾部插槽。
    function homeOf() {
      return isWide.matches ? home : slot || home;
    }

    function syncAside() {
      if (isMobile.matches) {
        if (aside.parentElement !== body) body.appendChild(aside);
      } else {
        var target = homeOf();
        if (target && aside.parentElement !== target) target.appendChild(aside);
      }
    }

    /* ------------------------------------------------------- 开关与无障碍 */
    var lastFocus = null;
    var drawerOpeners = document.querySelectorAll('[data-td-shell-drawer-open]');

    function open() {
      // 与左侧抽屉互斥。主题用 html[data-td-shell-drawer] 表示它开着，
      // 直接移除属性即可让它滑回；同步把它的按钮 aria 状态复位。
      if (root.hasAttribute('data-td-shell-drawer')) {
        root.removeAttribute('data-td-shell-drawer');
        drawerOpeners.forEach(function (el) {
          el.setAttribute('aria-expanded', 'false');
        });
      }
      lastFocus = document.activeElement;
      root.setAttribute('data-td-mobile-aside', 'open');
      panel.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(function () {
        closeBtn.focus({ preventScroll: true });
      });
    }

    function close(restore) {
      if (!root.hasAttribute('data-td-mobile-aside')) return;
      root.removeAttribute('data-td-mobile-aside');
      panel.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      if (restore !== false) {
        var back = lastFocus && document.contains(lastFocus) ? lastFocus : trigger;
        back.focus({ preventScroll: true });
      }
    }

    trigger.addEventListener('click', function () {
      if (root.hasAttribute('data-td-mobile-aside')) close();
      else open();
    });

    [scrim, closeBtn].forEach(function (el) {
      el.addEventListener('click', function () {
        close();
      });
    });

    // 点目录里的锚点后自动收起，否则会挡住刚跳到的小节。
    body.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href^="#"]');
      if (link) close(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && root.hasAttribute('data-td-mobile-aside')) {
        close();
      }
    });

    // 模态面板的焦点陷阱：Tab 只在抽屉内循环，不跑到被遮住的正文里。
    panel.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var items = panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    // 左抽屉打开时收起右抽屉（左按钮由主题绑定，这里只挂关闭动作）。
    drawerOpeners.forEach(function (el) {
      el.addEventListener('click', function () {
        close(false);
      });
    });

    /* ----------------------------------------- 断点切换与主题 relocate 兜底 */
    isMobile.addEventListener('change', function () {
      syncAside();
      if (!isMobile.matches) close(false);
    });
    isWide.addEventListener('change', syncAside);

    if (slot && window.MutationObserver) {
      // 主题在 1200px 断点会把 aside 放回插槽；手机断点下立即夺回。
      new MutationObserver(function () {
        if (isMobile.matches && aside.parentElement !== body) {
          body.appendChild(aside);
        }
      }).observe(slot, { childList: true });
    }

    // 首帧：主题的 initAsideRelocate 已在 DOMContentLoaded 阶段跑过，
    // 这里再同步一次，确保初始状态就落在正确的容器里。
    syncAside();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
