---
# 图片博客条目骨架：hugo new content plog/<名字>/index.md 自动生成。
# 一个文件夹就是一组照片：index.md 与图片放在同一目录 content/plog/<名字>/ 下，
# 图片在 front matter 的 photos 列表里声明（文件名直接引用）；所有照片
# 按组的时间汇在 /plog 一页（每张照片一张卡），不生成独立页面。
#   location   —— 拍摄地点，显示为卡片左上角徽章（缺省用标题）
#   description—— 一句话说明，用于列表页摘要等场景
#   images     —— 可选，组封面（供 RSS/SEO 使用），写同目录文件名
#   photos     —— 照片列表：src 必填；caption 可选（卡片左下角图注）
#   tags       —— 不要用：各组没有独立页面，标签归档页会指向不存在的地址
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: '{{ .Date }}'
location: ''
description: ''
images: []
photos:
  - src: 01.jpg
    caption: 图片说明（可省略）
draft: true
---
