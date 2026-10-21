---
# Expo 相册骨架：hugo new content plog/<名字>/index.md 自动生成。
# 一个文件夹就是一个相册：index.md 与 images/ 照片目录放在一起
#（content/plog/<名字>/），照片在 front matter 的 resources 列表里声明。
#   title       —— 相册名（/plog 卡片标题）
#   description —— 一句话说明（/plog 卡片摘要、相册页导语）
#   resources   —— 照片列表：src 必填（相对本目录，如 images/01.jpg）；
#                  params.caption 图注；params.title 标题（缺省用文件名）；
#                  params.weight 排序，小的在前（缺省 0，保持声明顺序）；
#                  params.id 稳定图片锚点（缺省文件名哈希，改名会失效）
#   卡片封面 = 权重最小的第一张照片，无需单独指定封面。
#   Expo 没有「拍摄地点」字段：想带地点就写进 description。
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: '{{ .Date }}'
description: ''
resources:
  - src: images/01.jpg
    title: ''
    params:
      caption: 图片说明（可省略）
draft: true
---
