/* 照片灯箱交互（/plog 时光相册，参考 plog.zhheo.com）
   数据：layouts/plog/list.html 输出的 #td-plog-data JSON（仅本页可见组）。
   骨架：本脚本在首次打开时惰性构建整个灯箱 DOM 并挂到 body —— 不用静态
   标记，因为 Hugo 的 HTML minify 会剥离空元素（空 span/占位节点）。
   功能：点击照片卡打开（按 data-plog-set / data-plog-photo 定位）、
   组内左右循环切换、圆点跳转、Esc 关闭、←/→ 切换、触摸滑动、
   相邻大图预加载、打开时锁定页面滚动。 */
(function () {
  "use strict";

  var dataEl = document.getElementById("td-plog-data");
  if (!dataEl) return;

  var data = [];
  try { data = JSON.parse(dataEl.textContent) || []; } catch (err) { return; }
  if (!data.length) return;

  var CARD_HTML =
    '<div class="td-plog-lightbox__backdrop" data-plog-close></div>' +
    '<div class="td-plog-lightbox__card">' +
    '<button type="button" class="td-plog-lightbox__close" data-plog-close aria-label="关闭 (Esc)">' +
    '<i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
    '<button type="button" class="td-plog-lightbox__nav td-plog-lightbox__nav--prev" data-plog-prev aria-label="上一张 (←)">' +
    '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
    '<button type="button" class="td-plog-lightbox__nav td-plog-lightbox__nav--next" data-plog-next aria-label="下一张 (→)">' +
    '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>' +
    '<div class="td-plog-lightbox__stage">' +
    '<img class="td-plog-lightbox__img" alt="" draggable="false">' +
    "</div>" +
    '<div class="td-plog-lightbox__info">' +
    '<p class="td-plog-lightbox__title" hidden></p>' +
    '<p class="td-plog-lightbox__desc" hidden></p>' +
    '<div class="td-plog-lightbox__meta">' +
    '<span class="td-plog-lightbox__loc" hidden>' +
    '<i class="fa-solid fa-location-dot" aria-hidden="true"></i><span></span></span>' +
    '<span class="td-plog-lightbox__date" hidden>' +
    '<i class="fa-solid fa-calendar-days" aria-hidden="true"></i><time></time></span>' +
    "</div>" +
    '<span class="td-plog-lightbox__tag" hidden></span>' +
    "</div>" +
    '<div class="td-plog-lightbox__dots"></div>' +
    "</div>";

  var lb = null;
  var el = {};
  var state = { s: 0, p: 0, lastFocus: null };
  var BODY_LOCK = "td-plog-lightbox-open";

  function build() {
    lb = document.createElement("div");
    lb.id = "td-plog-lightbox";
    lb.className = "td-plog-lightbox";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "照片查看器");
    lb.innerHTML = CARD_HTML;
    document.body.appendChild(lb);
    el.img = lb.querySelector(".td-plog-lightbox__img");
    el.title = lb.querySelector(".td-plog-lightbox__title");
    el.desc = lb.querySelector(".td-plog-lightbox__desc");
    el.loc = lb.querySelector(".td-plog-lightbox__loc");
    el.locText = lb.querySelector(".td-plog-lightbox__loc span");
    el.date = lb.querySelector(".td-plog-lightbox__date");
    el.dateText = lb.querySelector(".td-plog-lightbox__date time");
    el.tag = lb.querySelector(".td-plog-lightbox__tag");
    el.dots = lb.querySelector(".td-plog-lightbox__dots");
    el.close = lb.querySelector(".td-plog-lightbox__close");
  }

  function setText(node, text) {
    if (!node) return;
    if (text) { node.textContent = text; node.hidden = false; }
    else { node.textContent = ""; node.hidden = true; }
  }

  function preload(s, p) {
    var set = data[s];
    if (!set || !set.photos.length) return;
    var n = set.photos.length;
    p = ((p % n) + n) % n;
    var src = set.photos[p] && set.photos[p].large;
    if (src) { var im = new Image(); im.src = src; }
  }

  function render() {
    var set = data[state.s];
    if (!set) return;
    var ph = set.photos[state.p] || {};

    el.img.classList.remove("is-loaded");
    el.img.onload = function () { el.img.classList.add("is-loaded"); };
    el.img.src = ph.large || "";
    el.img.alt = ph.caption || set.title || "照片";
    if (ph.w) {
      el.img.setAttribute("width", ph.w);
      el.img.setAttribute("height", ph.h || "");
    } else {
      el.img.removeAttribute("width");
      el.img.removeAttribute("height");
    }

    // 标题优先用单张图注，缺省回退组标题；描述/地点/日期/标签取组级信息。
    // 注意：地点/日期的文本要写进内部的 span/time，不能直接覆盖 wrapper
    // （会把图标一起清掉）。
    setText(el.title, ph.caption || set.title || "");
    setText(el.desc, set.description || "");
    if (el.locText) el.locText.textContent = set.location || "";
    if (el.loc) el.loc.hidden = !set.location;
    if (el.dateText) el.dateText.textContent = set.date || "";
    if (el.date) el.date.hidden = !set.date;
    setText(el.tag, set.title || "");

    // 圆点指示（一组一个）
    el.dots.innerHTML = "";
    set.photos.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "td-plog-lightbox__dot" + (i === state.p ? " is-active" : "");
      d.setAttribute("aria-label", "第 " + (i + 1) + " 张，共 " + set.photos.length + " 张");
      if (i === state.p) d.setAttribute("aria-current", "true");
      d.addEventListener("click", function () { state.p = i; render(); });
      el.dots.appendChild(d);
    });

    preload(state.s, state.p + 1);
    preload(state.s, state.p - 1);
  }

  function nav(delta) {
    var set = data[state.s];
    if (!set || !set.photos.length) return;
    var n = set.photos.length;
    state.p = ((state.p + delta) % n + n) % n;
    render();
  }

  function open(s, p) {
    if (!data[s] || !data[s].photos.length) return;
    if (!lb) build();
    state.lastFocus = document.activeElement;
    state.s = s;
    state.p = p || 0;
    render();
    lb.hidden = false;
    document.body.classList.add(BODY_LOCK);
    if (el.close) el.close.focus();
  }

  function close() {
    if (!lb) return;
    lb.hidden = true;
    document.body.classList.remove(BODY_LOCK);
    el.img.src = "";
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
  }

  // 点击委托：关闭 / 箭头 / 卡片打开（圆点单独绑定）
  document.addEventListener("click", function (e) {
    if (!lb || lb.hidden) {
      var card = e.target.closest(".td-plog-card");
      if (card) {
        open(+card.getAttribute("data-plog-set") || 0, +card.getAttribute("data-plog-photo") || 0);
      }
      return;
    }
    if (e.target.closest("[data-plog-close]")) { close(); return; }
    if (e.target.closest("[data-plog-prev]")) { nav(-1); return; }
    if (e.target.closest("[data-plog-next]")) { nav(1); return; }
  });

  document.addEventListener("keydown", function (e) {
    if (!lb || lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") nav(-1);
    else if (e.key === "ArrowRight") nav(1);
  });

  // 触摸滑动（水平为主才切换，避免误伤纵向滚动）
  var touchX = null, touchY = null;
  document.addEventListener("touchstart", function (e) {
    if (!lb || lb.hidden) return;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (!lb || lb.hidden || touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) nav(dx < 0 ? 1 : -1);
    touchX = touchY = null;
  }, { passive: true });
})();
