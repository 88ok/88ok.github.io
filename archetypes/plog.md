---
# 图片博客条目骨架：hugo new content plog/<名字>/index.md 自动生成。
# 每篇一个文件夹（页面资源包）：index.md 与图片放在同一目录 content/plog/<名字>/ 下，
# 正文用文件名直接引用图片， Hugo 自动读取宽高（瀑布流不跳动）并生成封面缩略图。
#   location   —— 拍摄地点，显示在标题下方与列表卡片上
#   description—— 一句话说明，显示在标题下方
#   images     —— 封面图数组（取第一张作列表卡片封面），写同目录的文件名
#   tags       —— 可选
# 正文只放图片：每个图片单独一段，说明写在下一行的属性行里。
#   ![图片描述](01.jpg)
#   {caption="图片说明"}
# 不写属性行就只显示图（块级图片默认可点击放大）；一个文件可含任意多张图片。
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: '{{ .Date }}'
location: ''
description: ''
images: []
tags: []
draft: true
---

![图片描述](01.jpg)
{caption="图片说明"}
