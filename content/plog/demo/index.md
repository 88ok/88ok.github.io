---
title: 示例：照片墙长什么样
date: 2026-10-16T09:00:00+08:00
description: 演示 Expo 相册的写法：照片放在 images/ 目录，在 resources 列表里声明，caption 即图注。看明白后把这组整删掉。
# Expo 相册骨架（archetypes/plog.md 同款）：
#   title/description —— 相册名与一句话说明（/plog 卡片摘要）
#   resources         —— 照片列表：src 相对相册目录（images/xxx）；
#                        params.caption 图注，params.title 标题，
#                        params.weight 排序（小的在前），params.id 稳定锚点
#   卡片封面 = 权重最小的第一张照片，无需单独指定封面。
resources:
  - src: images/01.svg
    title: 样张一
    params:
      caption: 每张照片一个磁贴，点击打开原图查看器
  - src: images/02.svg
    title: 样张二
    params:
      caption: 查看器支持缩放、拖动与键盘导航
  - src: images/03.svg
    title: 样张三
    params:
      caption: 工具栏可切换墙壁 / 卡片 / 无缝三种布局
  - src: images/04.svg
    title: 样张四
    params:
      caption: 所有相册汇在 /plog 这一页，按时间排列
---
