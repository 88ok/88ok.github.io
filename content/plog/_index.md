---
title: 图片博客
description: 用照片记录走过的路：山川、城市、街角与日常。一张照片一张卡，所有照片按时间汇成这一页。
search_keywords: [追风笔记, 图片博客, 摄影, plog, 照片]
type: plog
icon: fa-solid fa-camera
# 不进菜单：本栏目不出现在导航与侧边树中，只能通过链接直接访问。
# 照片需要宽度：关闭侧栏与 TOC，页面走宽布局（与 /projects 一致）。
sidebar_enabled: false
page_width: wide
body_class: td-plog
notoc: true
# 右侧栏也关掉：照片页不需要目录/标签云/反向引用，整页只留照片
toc_taxonomies: false
# 照片墙点击放大：主题要求页面级 image_zoom 显式开启（站点默认关），
# 且模板需置 Page.Store "hasImageZoom"（见 layouts/plog/list.html）
image_zoom: true
comments: false
share: [copy]
feedback: false
reading_time: false
navbar_autohide: false
footer_style: slim
# 单页照片流：所有图片集的内容直接汇在 /plog 一页，各组不生成独立页面。
# 本页（section）显式 always——级联下发给子页的 render:never 会波及自身，
# 不显式声明的话整页都不会渲染；outputs 去掉 RSS（组页不存在，RSS 会空链）。
outputs: [html]
build:
  render: always
cascade:
  type: plog
  image_zoom: true
  theme_color: '#0f766e'
  theme_color_dark: '#5eead4'
  sidebar_enabled: false
  page_width: wide
  body_class: td-plog
  notoc: true
  toc_taxonomies: false
  comments: false
  share: [copy]
  feedback: false
  reading_time: false
  navbar_autohide: false
  footer_style: slim
  # 各组只作为本页的一段内容存在：不渲染独立 URL，
  # 但 list:local 保证它们仍留在本栏目的 .RegularPages 里供上方聚合。
  build:
    list: local
    render: never
---
