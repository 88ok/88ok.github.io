/**
 * 让右栏的「分类」「标签」两组在任何断点下都默认展开。
 *
 * 背景（Oink v1.3.2）：
 *   主题的 assets/js/docs-shell.js → initAsideRelocate() 在 <1200px 时把
 *   [data-td-shell-aside] 整个搬进侧栏抽屉的 [data-td-shell-aside-slot]，并调用
 *   setGroups(isWide)：
 *     · ≥1200px（右栏轨道有空间）：全部分组展开；
 *     · <1200px（抽屉里）：除下列两种外一律折叠——
 *         data-td-shell-aside-keep-open        完全跳过主题的展开/折叠控制
 *         data-td-shell-aside-default-collapsed 宽屏下也保持收起
 *   主题注释写明这是刻意设计（抽屉里先让导航树占位），不是缺陷。
 *
 * 做法：给 aside 内分类法分组（[data-td-taxonomy]）的折叠按钮打上
 * data-td-shell-aside-keep-open，setGroups() 就会跳过它们，从而保留
 * taxonomy-terms-clouds.html 模板里 aria-expanded="true" + td-is-open 的初值。
 *
 * 时机：本文件由 layouts/_partials/hooks/body-end.html 引入，位置在主题脚本之后。
 * 若主题已完成初始化（分组已被折叠），这里再补一次 OinkSidebar.setExpanded()
 * 把已折叠的组重新打开；两处都做，脚本先后顺序变化时也不会失效。
 *
 * 耦合提示：data-td-shell-aside-keep-open 是主题私有属性，升级 Oink 时需复核
 * 该属性是否仍被 setGroups() 识别（v1.3.2 核对无误）。
 */
(function () {
  'use strict';

  var GROUPS = '[data-td-shell-aside] [data-td-taxonomy]';

  function apply() {
    document.querySelectorAll(GROUPS).forEach(function (group) {
      var button = group.querySelector('[data-td-shell-tree-toggle]');
      if (!button) return;

      // 让主题的 setGroups() 从此跳过这一组，之后的断点切换也不再折叠它。
      button.setAttribute('data-td-shell-aside-keep-open', '');

      // 已经处于折叠态（脚本晚于主题初始化）时补开一次。
      var id = button.getAttribute('aria-controls');
      if (!id || button.getAttribute('aria-expanded') === 'true') return;
      if (window.OinkSidebar && window.OinkSidebar.setExpanded) {
        window.OinkSidebar.setExpanded(id, true, { source: 'api' });
      }
    });
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', apply);
})();
