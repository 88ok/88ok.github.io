---
title: 图片博客
description: 用照片记录走过的路：山川、城市、街角与日常。一篇一个 md，可含多张图片。
search_keywords: [追风笔记, 图片博客, 摄影, plog, 照片]
type: plog
icon: fa-solid fa-camera
# 不进菜单：本栏目不出现在导航与侧边树中，只能通过链接直接访问。
# 照片需要宽度：关闭侧栏与 TOC，页面走宽布局（与 /projects 一致）。
sidebar_enabled: false
page_width: wide
body_class: td-plog
notoc: true
comments: false
share: [copy]
feedback: false
reading_time: false
navbar_autohide: false
footer_style: slim
cascade:
  type: plog
  theme_color: '#0f766e'
  theme_color_dark: '#5eead4'
  sidebar_enabled: false
  page_width: wide
  body_class: td-plog
  notoc: true
  comments: false
  share: [copy]
  feedback: false
  reading_time: false
  navbar_autohide: false
  footer_style: slim
---

这里放照片。一篇一个 markdown 文件：front matter 写标题、日期、拍摄地点（`location`）和封面（`images` 数组），正文里每个图片占一段、属性行单独一行来写说明——一个文件可以放多张，点击图片可放大。新条目可用 `hugo new content plog/<名字>.md` 生成骨架。

```markdown
![图片描述](/images/plog/<名字>/01.jpg)
{caption="图片说明"}
```
