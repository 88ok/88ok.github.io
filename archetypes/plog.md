---
# 图片博客条目骨架：hugo new content plog/<名字>.md 自动生成。
#   location —— 拍摄地点，显示在标题下方与列表卡片上
#   images   —— 封面图数组（取第一张作列表卡片封面），图片放在 static/images/plog/<名字>/ 下
#   tags     —— 可选
# 正文插图（图片单独一段，属性行单独一行）：
#   ![图片描述](/images/plog/<名字>/01.jpg)
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
