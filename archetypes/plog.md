---
# 图片博客条目骨架：hugo new content plog/<名字>/index.md 自动生成。
# 一个文件夹就是一组照片：index.md 与图片放在同一目录 content/plog/<名字>/ 下，
# 正文用文件名直接引用图片；所有组按时间汇在 /plog 一页，不生成独立页面。
#   location   —— 拍摄地点，显示在集头
#   description—— 一句话说明，显示在集头
#   images     —— 可选，组封面（供搜索等场景使用），写同目录文件名
#   tags       —— 不要用：各组没有独立页面，标签归档页会指向不存在的地址
# 正文只放图片：每个图片单独一段，说明写在下一行的属性行里。
#   ![图片描述](01.jpg)
#   {caption="图片说明"}
# 不写属性行就只显示图（块级图片默认可点击放大）；一组可含任意多张图片。
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: '{{ .Date }}'
location: ''
description: ''
images: []
draft: true
---

![图片描述](01.jpg)
{caption="图片说明"}
