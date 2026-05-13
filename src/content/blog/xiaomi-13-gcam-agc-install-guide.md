---
title: "小米 13 安装 GCam / AGC 相机简单记录"
excerpt: "记录小米 13 安装 AGC8.8、下载配置文件、放置配置目录和导入配置的完整流程。"
pubDate: 2026-05-13
category: "数码折腾"
section: "技术专栏"
tags:
  - Android
  - 小米13
  - GCam
  - AGC
  - 相机
color: "blue"
icon: "Camera"
minutes: 3
views: 0
comments: 0
draft: false
---

## 背景

最近想在小米 13 上试一下 GCam，也就是常说的“谷歌相机”。

严格来说，这不是 Google 官方给小米做的原版相机，而是第三方开发者基于 Google Camera 修改、移植出来的版本。

常见说法有：

- GCam
- Google Camera Port
- 谷歌相机移植版
- Pixel 相机算法移植版

它的主要价值是尝试 Google Pixel 风格的计算摄影效果，比如 HDR、夜景、人像、色彩和细节处理。

## AGC 是什么

AGC 是 GCam 的一个第三方改版分支，常见开发者是 BigKaka。

可以简单理解为：

```text
AGC = 相机 App 本体
.agc = AGC 使用的配置文件
```

GCam 不是只装 APK 就完事，最好还要配合对应机型的配置文件。

对于小米 13，机型代号一般是：

```text
fuxi
```

## 推荐版本

小米 13 比较稳的组合是：

```text
AGC8.8.224_V8.0.apk
+
antykat-v2-Xiaomi13-AGC8.8.agc
```

其中：

```text
AGC8.8.224_V8.0.apk
```

是相机 App 本体。

```text
antykat-v2-Xiaomi13-AGC8.8.agc
```

是小米 13 专用配置文件。

## APK 下载选择

在下载 AGC8.8.224_V8.0 时，优先选择普通版：

```text
AGC8.8.224_V8.0.apk
```

不建议一开始下载这些特殊包名版本：

```text
AGC8.8.224_V8.0_snap.apk
AGC8.8.224_V8.0_samsung.apk
AGC8.8.224_V8.0_aweme.apk
AGC8.8.224_V8.0_ruler.apk
```

简单判断：

| 文件 | 说明 | 是否推荐 |
| --- | --- | --- |
| AGC8.8.224_V8.0.apk | 普通通用版 | 推荐 |
| snap | 特殊包名版本 | 暂不需要 |
| samsung | 三星相关版本 | 小米不用 |
| aweme | 伪装包名版本 | 暂不需要 |
| ruler | 特殊包名版本 | 暂不需要 |

## 配置文件下载

小米 13 可以下载这个配置：

```text
antykat-v2-Xiaomi13-AGC8.8.agc
```

如果看到下面这个，也可以作为备用配置：

```text
LHColor-AGC-Mi13.agc
```

建议先用第一个。

## 安装步骤

### 1. 安装 APK

先安装：

```text
AGC8.8.224_V8.0.apk
```

安装完成后，打开一次相机，把需要的权限给上。

一般包括：

```text
相机权限
存储权限
麦克风权限
```

### 2. 新建配置目录

在手机内部存储里新建目录：

```text
Download/AGC.8.8/configs/
```

完整结构类似：

```text
Download
└── AGC.8.8
    └── configs
```

注意：

```text
AGC.8.8
configs
```

目录名尽量照着写。

### 3. 放入配置文件

把配置文件放进去：

```text
Download/AGC.8.8/configs/antykat-v2-Xiaomi13-AGC8.8.agc
```

### 4. 导入配置

打开 AGC 相机，找到：

```text
Load Configs
```

然后选择：

```text
antykat-v2-Xiaomi13-AGC8.8.agc
```

导入后，AGC 就会按照小米 13 的配置参数工作。

## 这个目录必须放吗

不是系统强制必须，但建议放。

原因是 AGC8.8 默认会从这个目录读取配置：

```text
Download/AGC.8.8/configs/
```

放这里最省事，也最容易被 AGC 识别。

不同 AGC 大版本，目录可能不同：

```text
AGC8.8  -> Download/AGC.8.8/configs/
AGC9.2  -> Download/AGC.9.2/configs/
AGC9.6  -> Download/AGC.9.6/configs/
```

## 能不能装最新版

可以试，但不建议一开始就追最新版。

GCam 的核心不是版本越新越好，而是：

```text
APK 版本 + 机型专用配置
```

如果没有小米 13 对应的配置，最新版也可能出现：

```text
闪退
镜头切换异常
颜色不正常
夜景效果差
超广角或长焦不可用
```

所以我的建议是：

```text
先用稳定组合：
AGC8.8.224_V8.0
+
antykat-v2-Xiaomi13-AGC8.8.agc
```

后面想折腾，再试 AGC9.x。

## 使用建议

GCam 不建议完全替代小米原相机。

比较适合用来拍：

```text
白天照片
室内照片
人像
夜景
不同色彩风格
```

但下面这些场景，建议继续优先用小米原相机：

```text
视频
快速抓拍
长焦切换
运动场景
重要照片
```

## 总结

小米 13 安装 AGC 的核心流程就是：

```text
1. 下载 AGC8.8.224_V8.0.apk
2. 安装 APK
3. 下载小米 13 配置文件 antykat-v2-Xiaomi13-AGC8.8.agc
4. 放到 Download/AGC.8.8/configs/
5. 打开 AGC，导入配置
```

一句话总结：

```text
AGC 是相机本体，.agc 是机型配置。
小米 13 先用 AGC8.8 + 小米 13 专用配置，稳定性更高。
```
