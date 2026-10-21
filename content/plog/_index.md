---
title: 图片
description: 用照片记录走过的路：山川、城市、街角与日常。
icon: fa-solid fa-images
# 专属主题色：左侧分区下拉里每一项都用自己栏目的色标，这里取暖琥珀色，
# 与博客(紫) / 技术(蓝) / 专题(青) / 项目(紫罗兰) 区分，也贴合影像气质。
theme_color: '#b45309'
theme_color_dark: '#fbbf24'
search_keywords: [追风笔记, 图片, 图片博客, 摄影, plog, 照片, Expo]
# Oink v1.3.0 起主题原生支持图片相册（type: expo），本栏目改用主题能力：
# 打开 /plog 列出所有相册（卡片 + 封面），点进相册是照片墙（墙壁/卡片/无缝
# 三种布局 + 尺寸滑块 + 原图查看器），左侧栏自动生成本栏目的相册树。
# 已进菜单：顶部导航「图片」+ 左侧栏分区切换下拉（icon 决定下拉里的图标）。
# 新增相册：content/plog/<名字>/ 下建 index.md 与 images/ 目录
#（hugo new content plog/<名字>/index.md 生成骨架），照片在 front matter
# 的 resources 列表里声明；每张照片可带 params.caption 图注。
# 站点级默认在 hugo.yaml 的 params.ui.expo（布局/尺寸/图片目录模式）。
# outputs 只留 html：不生成 /plog 的 RSS。
# 注意：英文站（content_en）没有对应目录，故 hugo.yaml 的 en 菜单不加此项，
# 否则 pageRef 解析失败会在 --panicOnWarning 下中断构建。
outputs: [html]
cascade:
  type: expo
  comments: false
  reading_time: false
---
