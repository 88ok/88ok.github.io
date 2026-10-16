---
title: 示例：一篇图片博客长什么样
date: 2026-10-16T09:00:00+08:00
location: 示例地点·北京
description: 这是一篇演示条目，展示图片博客的写法。看明白后删掉它，开始写你自己的。
images:
  - /images/plog/demo/cover.svg
tags:
  - 示例
---

这个页面演示 **一篇 md 如何渲染成图片博客**：

- `location` 显示在标题下方，也会出现在列表卡片上；
- `images` 数组的第一张是 `/plog` 列表卡片的封面；
- 正文每张图片都可以带说明，点击图片可以放大；
- 一个文件可以放任意多张图片，顺序即展示顺序。

![山与湖](/images/plog/demo/01.svg)
{width="960" height="720" caption="晨雾里的山谷，湖面还亮着"}

![城市日落](/images/plog/demo/02.svg)
{width="960" height="720" caption="下班路上的日落，云被烧成了橙色"}

![林间小路](/images/plog/demo/03.svg)
{width="960" height="720"}

最后一张没写 `caption`，就只显示图片。要写新的一篇，在 `content/plog/` 下新建 md 文件即可（`hugo new content plog/你的名字.md` 会生成骨架）；把这个文件和 `static/images/plog/demo/` 一起删掉，就是干干净净的图片博客了。
