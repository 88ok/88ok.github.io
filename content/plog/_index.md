---
title: 图片
description: 用照片记录走过的路：山川、城市、街角与日常。
search_keywords: [追风笔记, 图片, 图片博客, 摄影, plog, 照片, Expo]
# Oink v1.3.0 起主题原生支持图片相册（type: expo），本栏目改用主题能力：
# 打开 /plog 列出所有相册（卡片 + 封面），点进相册是照片墙（墙壁/卡片/无缝
# 三种布局 + 尺寸滑块 + 原图查看器），左侧栏自动生成本栏目的相册树。
# 不进菜单：不出现在导航中，通过链接直接访问。
# 新增相册：content/plog/<名字>/ 下建 index.md 与 images/ 目录
#（hugo new content plog/<名字>/index.md 生成骨架），照片在 front matter
# 的 resources 列表里声明；每张照片可带 params.caption 图注。
# 站点级默认在 hugo.yaml 的 params.ui.expo（布局/尺寸/图片目录模式）。
# outputs 只留 html：不生成 /plog 的 RSS。
outputs: [html]
cascade:
  type: expo
  comments: false
  reading_time: false
---
