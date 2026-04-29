---
title: "OpenClaw Gateway 架构：一个本地控制平面如何接管多渠道"
excerpt: "OpenClaw 的 Gateway 不是普通消息转发服务，而是整个 Agent 系统的本地控制平面。本文拆解它如何统一接管多渠道、客户端、节点、会话、事件和自动化入口。"
pubDate: 2026-04-29
category: "AI工程"
section: "技术专栏"
tags:
  - OpenClaw
  - Gateway
  - Agent
  - WebSocket
  - 架构设计
color: "cyan"
icon: "Network"
minutes: 9
views: 0
comments: 0
draft: false
---

# OpenClaw Gateway 架构：一个本地控制平面如何接管多渠道

上一篇文章里，我们把 OpenClaw 定位成一个本地优先的多渠道 Agent Gateway，而不是普通 Bot。

这一篇继续往下拆：**Gateway 到底是什么？它为什么能成为整个 OpenClaw 的控制平面？**

如果只看表面，Gateway 好像只是一个本地服务，负责接收消息、转发消息。

但从架构上看，它的角色远不止消息转发。

OpenClaw 官方文档里明确写到：Gateway 是一个长期运行的 WebSocket server，负责 channels、nodes、sessions、hooks 等能力。也就是说，它不是某个聊天渠道的适配器，而是 OpenClaw 运行时的中心节点。([OpenClaw][1])

可以简单理解为：

```text
普通 Bot 的核心是消息处理函数。
OpenClaw 的核心是 Gateway 控制平面。
```

---

## 一、为什么需要 Gateway？

先看普通 Bot 的做法。

假设我们要做一个飞书 Bot，最常见的结构是：

```text
飞书消息
  ↓
Webhook
  ↓
后端接口
  ↓
调用模型
  ↓
返回飞书
```

如果再接 Telegram，就再写一套 Telegram 接入逻辑：

```text
Telegram 消息
  ↓
Telegram Bot API
  ↓
后端接口
  ↓
调用模型
  ↓
返回 Telegram
```

如果继续接 Slack、Discord、WhatsApp、iMessage，很快就会变成这样：

```text
飞书 Bot 逻辑
Telegram Bot 逻辑
Slack Bot 逻辑
Discord Bot 逻辑
WhatsApp Bot 逻辑
iMessage Bot 逻辑
```

每个平台都有自己的鉴权、消息格式、回调协议、发送接口、事件类型。

如果没有统一 Gateway，系统会出现几个问题：

1. 渠道逻辑和 Agent 逻辑混在一起；
2. 每接一个平台都要重复实现一套消息处理；
3. 会话上下文难统一；
4. 工具调用权限难统一；
5. 多端控制入口难统一；
6. 自动化任务和聊天消息难统一；
7. 系统状态、健康检查、运行日志分散。

所以 Gateway 的第一层价值是：**把多渠道入口统一收口。**

但这还不是全部。

Gateway 更重要的价值是：**把 OpenClaw 从一个 Bot 变成一个可长期运行的 Agent 控制平面。**

---

## 二、Gateway 是 OpenClaw 的本地控制平面

OpenClaw 文档对 Gateway 架构的描述非常关键：单个长期运行的 Gateway 拥有所有 messaging surfaces，包括 WhatsApp、Telegram、Slack、Discord、Signal、iMessage、WebChat；macOS app、CLI、Web UI、自动化客户端通过 WebSocket 连接到 Gateway；Node 节点也通过 WebSocket 连接，并声明自己的 role、caps、commands。([OpenClaw][1])

这说明 Gateway 至少管理三类对象：

```text
第一类：消息渠道
WhatsApp / Telegram / Slack / Discord / Signal / iMessage / WebChat

第二类：控制客户端
CLI / macOS App / Web UI / Automations

第三类：执行节点
macOS Node / iOS Node / Android Node / Headless Node
```

这已经不是普通 Bot 的结构了。

普通 Bot 通常只有：

```text
消息平台
  ↓
Bot 服务
  ↓
模型
```

OpenClaw Gateway 更像：

```text
消息渠道
控制客户端
执行节点
自动化入口
  ↓
Gateway 控制平面
  ↓
Agent Runtime
  ↓
Tools / Skills / Plugins / Sessions / Hooks
```

所以，Gateway 的本质是一个中枢。

它不直接等同于 Agent，也不直接等同于模型，更不等同于某个聊天平台。

它负责把所有入口、所有连接、所有事件统一接入到 OpenClaw 的运行时体系里。

---

## 三、Gateway 解决的是“多入口统一”问题

OpenClaw 支持很多入口，但这些入口可以分成几类。

### 1. 聊天渠道入口

比如：

```text
Telegram
WhatsApp
Slack
Discord
Signal
iMessage
WebChat
Feishu
```

这些入口主要负责接收用户消息。

用户可以在 Telegram 上发一句：

```text
帮我查一下今天销售数据
```

也可以在 Slack 里发：

```text
Summarize the latest report.
```

也可以在飞书群里发：

```text
帮我看一下这批商品异常原因。
```

从用户视角看，这是不同聊天软件。

但从 OpenClaw Gateway 视角看，它们最终都应该被转换成一种更统一的内部事件：

```text
谁发的？
从哪个渠道发的？
在哪个会话里？
消息内容是什么？
是否带附件？
是否需要回复？
应该交给哪个 Agent？
```

这就是渠道抽象的意义。

---

### 2. 控制客户端入口

OpenClaw 不只是被动接收聊天消息。

CLI、macOS app、Web UI、automations 也会连接 Gateway。文档里提到，这些 control-plane clients 通过 WebSocket 连接到 Gateway，默认绑定地址是 `127.0.0.1:18789`。([OpenClaw][1])

这说明 Gateway 还有一个职责：**给控制端提供统一 API。**

比如你在 CLI 里执行命令，本质上不是 CLI 自己完成所有事情，而是通过 Gateway 去查询状态、触发 Agent、管理会话、检查健康状态。

可以理解成：

```text
CLI 不是核心
Web UI 不是核心
macOS App 也不是核心

它们都是 Gateway 的控制客户端
```

这和很多后端系统里的控制平面很像。

比如 Kubernetes 里，kubectl 不是集群本身，它只是控制 Kubernetes API Server 的客户端。

OpenClaw 里，CLI / Web UI / App 也不是核心，它们是 Gateway 的操作入口。

---

### 3. Node 执行入口

OpenClaw 的 Gateway 架构里还有一个很重要的概念：Node。

文档里提到，macOS、iOS、Android、headless 节点也通过 WebSocket 连接 Gateway，但会声明 `role: node`，并显式提供自己的 caps 和 commands。([OpenClaw][1])

这点很有意思。

普通 Bot 往往只运行在一台服务器上。

但 OpenClaw 的模型更像：

```text
Gateway 负责统一调度
不同 Node 提供不同执行能力
```

比如：

```text
macOS Node：可能提供本机文件、浏览器、系统能力
iOS Node：可能提供移动端相关能力
Android Node：可能提供安卓侧能力
Headless Node：可能运行在服务器上，提供后台任务能力
```

这就让 OpenClaw 有了“分布式个人助手”的味道。

Gateway 不一定亲自执行所有动作，它可以通过连接上的 Node 去完成某些能力。

这也是它比普通 Bot 更像控制平面的原因。

---

## 四、Gateway 如何接管多渠道？

可以把 Gateway 接管多渠道的过程拆成五步。

---

### 第一步：维护渠道连接

不同渠道的连接方式不同。

比如：

```text
Telegram：通过 Bot API / grammY
WhatsApp：通过 Baileys
Slack：通过 Slack API
Discord：通过 Discord Gateway / API
iMessage：通过本地或系统相关能力
```

OpenClaw 文档明确提到，Gateway 会维护 provider connections。([OpenClaw][1])

也就是说，Gateway 需要管理这些外部连接的生命周期：

```text
启动连接
保持在线
接收事件
发送消息
处理断线重连
处理鉴权状态
处理平台限流
```

普通 Bot 通常只关心“收到一条消息怎么处理”。

Gateway 还要关心“这个渠道是否健康、连接是否可用、是否需要重连、是否可以发送消息”。

这是更底层的运行时职责。

---

### 第二步：把不同平台消息标准化

每个平台的消息格式都不一样。

Telegram 可能有 chat_id、message_id、from。

Slack 可能有 channel、thread_ts、user。

飞书可能有 open_id、chat_id、message_type。

Discord 可能有 guild、channel、member、message。

如果 Agent 直接面对这些原始格式，系统会非常混乱。

所以 Gateway 要做一层转换：

```text
平台原始消息
  ↓
渠道适配器解析
  ↓
OpenClaw 内部消息事件
```

内部事件至少需要表达这些信息：

```text
channel：消息来自哪个平台
conversation：属于哪个会话
sender：谁发的
text：文本内容
attachments：附件
reply target：回复目标
timestamp：时间
metadata：平台特有信息
```

这一步的本质是：**把平台差异挡在 Gateway 外层，不让 Agent Runtime 直接被平台协议污染。**

---

### 第三步：绑定 Session

收到消息之后，Gateway 不能直接丢给模型。

它需要先判断这条消息属于哪个 session。

比如：

```text
Telegram 私聊 A
Telegram 群聊 B
Slack 频道 C
飞书群 D
Cron 任务 E
Webhook 事件 F
```

这些都应该是不同 session。

因为不同 session 的上下文、权限、历史记录、运行状态可能完全不同。

一个很典型的问题是：

```text
用户在私聊里让 Agent 查销售数据
用户又在群聊里让 Agent 发总结
```

如果 session 混在一起，Agent 可能把私聊里的上下文带到群里，甚至造成信息泄露。

所以 Gateway 需要在消息进入 Agent 之前完成 session 定位：

```text
消息入口
  ↓
识别 channel
  ↓
识别 sender / chat / thread
  ↓
生成 session key
  ↓
绑定到对应 session
```

这也是 OpenClaw 比普通 Bot 更工程化的地方。

普通 Bot 很多时候只处理 message。

Agent Gateway 必须处理 session。

---

### 第四步：路由到 Agent Runtime

绑定 session 后，Gateway 还需要决定：

```text
这条消息交给哪个 Agent？
使用哪个模型？
启用哪些 tools？
加载哪些 skills？
是否需要进入队列？
是否允许执行？
```

这一步就进入 Agent Runtime 了。

Gateway 不是模型本身，但它负责把请求送到正确的执行链路。

可以理解成：

```text
Gateway 负责入口和调度
Agent Runtime 负责推理和执行
Model 负责生成和决策
Tools 负责真实动作
```

如果用后端类比：

```text
Gateway 像 API Gateway + Control Plane
Agent Runtime 像业务编排引擎
Tools 像具体业务服务
Model 像推理决策模块
```

这层分工非常重要。

如果没有 Gateway，所有渠道都会直接调用 Agent Runtime，入口会变乱。

如果没有 Agent Runtime，Gateway 就只是消息代理，做不了复杂任务。

---

### 第五步：把结果送回正确渠道

Agent 处理完成后，结果不一定只是文本。

可能是：

```text
普通文本回复
分段流式回复
图片
文件
语音
工具执行结果
Canvas 页面
错误提示
审批请求
```

Gateway 需要把这些输出重新映射回对应渠道。

比如同样是“回复消息”：

```text
Telegram 有 Telegram 的发送方式
Slack 有 Slack 的 thread 回复方式
Discord 有 Discord 的 channel 回复方式
飞书有飞书的消息接口
```

所以 Gateway 还要负责 outbound delivery。

也就是说，它既负责 inbound，也负责 outbound。

完整链路是：

```text
外部渠道消息
  ↓
Gateway inbound
  ↓
Session / Routing / Queue
  ↓
Agent Runtime
  ↓
Tools / Model
  ↓
Gateway outbound
  ↓
外部渠道回复
```

---

## 五、Gateway 的 WebSocket 协议为什么重要？

OpenClaw Gateway 不是简单 HTTP 接口，而是以 WebSocket 作为控制平面通信方式。

文档里说，Gateway WS 协议是 OpenClaw 的单一控制平面 + 节点传输协议；所有客户端，包括 CLI、Web UI、macOS App、iOS/Android 节点、headless 节点，都会通过 WebSocket 连接，并在握手时声明角色和作用域。([OpenClaw][2])

为什么这里适合 WebSocket？

因为 OpenClaw 的通信不是简单的一问一答。

它需要：

```text
客户端请求 Gateway
Gateway 返回响应
Gateway 主动推送事件
Agent 流式输出
健康状态实时变化
节点能力注册
渠道消息实时进入
任务状态实时更新
```

HTTP 更适合：

```text
请求一次
响应一次
连接结束
```

WebSocket 更适合：

```text
连接长期存在
双方都可以主动发送消息
状态可以实时推送
```

OpenClaw Gateway 作为长期运行的控制平面，天然需要这种双向通信能力。

---

## 六、Gateway 不是 API Gateway 的简单翻版

这里容易有一个误解：既然叫 Gateway，那是不是类似传统 API Gateway？

不完全是。

传统 API Gateway 通常负责：

```text
路由
鉴权
限流
日志
负载均衡
协议转换
```

OpenClaw Gateway 也有类似职责，但它多了 Agent 系统特有的职责：

```text
管理聊天渠道连接
管理控制客户端连接
管理节点连接
维护 session
转发 server-push events
触发 Agent run
承接 cron / hook 事件
处理流式回复
对接工具和插件运行时
```

所以它更接近：

```text
API Gateway
+ Message Gateway
+ Agent Control Plane
+ Runtime Coordinator
```

如果只把它理解成 API Gateway，会低估它在 OpenClaw 里的位置。

---

## 七、为什么 Gateway 要本地运行？

OpenClaw 强调 local-first。

Gateway 默认绑定在本地地址，例如 `127.0.0.1:18789`。文档里也提到，Gateway 默认拒绝未配置状态启动，并且对非 loopback 绑定有安全保护。([OpenClaw][3])

这背后的逻辑很明确。

OpenClaw 不是一个只会回复闲聊的 Bot，它可能具备这些能力：

```text
读取本地文件
操作浏览器
执行命令
访问会话历史
连接消息平台
调用外部工具
触发自动化任务
```

这些能力如果暴露在公网，风险很高。

所以 Gateway 采用本地优先设计，本质是在强调：

```text
你的 Agent 控制平面应该先归你自己控制。
```

本地 Gateway 的优势是：

1. 数据路径更可控；
2. 本地工具更容易接入；
3. 本机浏览器、文件、系统能力可以被安全编排；
4. 不必把所有入口都交给第三方 SaaS；
5. 更适合个人长期助手和企业内部私有助手。

但它也带来一个要求：

```text
你必须认真处理部署、安全、鉴权和网络暴露问题。
```

对 Agent 系统来说，这不是可选项。

---

## 八、Gateway 和 Channels 的关系

Channels 是消息渠道。

Gateway 是统一管理这些 channels 的控制平面。

它们的关系可以理解成：

```text
Channel 负责懂某个平台
Gateway 负责管理所有平台
```

例如：

```text
Telegram Channel 懂 Telegram 消息格式
Slack Channel 懂 Slack thread 机制
Discord Channel 懂 Discord guild / channel
WhatsApp Channel 懂 WhatsApp session
Feishu Channel 懂飞书事件和回复接口
```

但这些 Channel 不应该各自决定 Agent 的核心逻辑。

正确的分层应该是：

```text
Channel Adapter
  负责平台协议

Gateway
  负责连接管理、事件统一、路由、session、控制平面

Agent Runtime
  负责推理、工具调用、执行循环

Tools / Plugins
  负责具体能力
```

这样，新增一个渠道时，理论上只需要新增或修改 Channel Adapter，而不需要重写 Agent Runtime。

这就是 OpenClaw 架构上值得借鉴的地方。

---

## 九、Gateway 和 Hooks / Cron 的关系

OpenClaw 不只处理人发来的消息。

它还支持自动化触发，比如：

```text
定时任务 Cron
外部事件 Webhook
系统事件
自动化客户端
```

这类入口和聊天消息不同。

聊天消息是人主动发起的。

Cron / Hook 是系统主动触发的。

但从 Agent 视角看，它们最终都可以变成一次任务输入。

例如：

```text
每天早上 9 点总结昨天销售数据
GitHub 有新 issue 时分析优先级
邮箱收到特定邮件时生成摘要
某个 API 返回异常时通知群聊
```

如果没有 Gateway，这些入口很容易各自为政。

有了 Gateway 后，它们可以统一进入 OpenClaw 的 Agent 执行体系：

```text
Cron / Webhook / System Event
  ↓
Gateway
  ↓
Session
  ↓
Agent Runtime
  ↓
Tools
  ↓
回复到指定渠道
```

这就是 Gateway 的另一个价值：**把人工消息和系统事件统一成 Agent 可处理的输入。**

---

## 十、Gateway 和 Nodes 的关系

Nodes 是 OpenClaw 架构中非常值得关注的一层。

它让 Gateway 不只是“本机服务”，而是可以连接不同设备或运行环境。

可以把它理解成：

```text
Gateway 是调度中心
Node 是能力执行点
```

比如：

```text
macOS Node 可以提供桌面能力
iOS Node 可以提供移动端能力
Android Node 可以提供安卓端能力
Headless Node 可以提供服务器后台能力
```

Node 连接 Gateway 时，会声明自己的能力。

也就是说，Gateway 可以知道：

```text
这个节点能做什么
能接收哪些命令
当前是否在线
是否可以参与某个任务
```

这个设计对个人 Agent 很有想象空间。

因为真实用户的工作环境不是单一服务器，而是多个设备：

```text
手机
电脑
服务器
浏览器
聊天软件
文件系统
本地应用
```

Gateway + Node 的结构，实际上是在为“跨设备 Agent”打基础。

---

## 十一、Gateway 架构的核心流程图

可以把整个 Gateway 流程画成这样：

```text
                ┌────────────────────┐
                │  Control Clients    │
                │ CLI / Web UI / App  │
                └─────────┬──────────┘
                          │ WebSocket
                          ↓
┌──────────────┐    ┌────────────────────┐    ┌──────────────┐
│ Channels     │ →  │      Gateway        │ ←  │ Nodes         │
│ IM / Slack   │    │ Control Plane       │    │ macOS/iOS/... │
│ Feishu/...   │    └─────────┬──────────┘    └──────────────┘
└──────────────┘              │
                              ↓
                    ┌────────────────────┐
                    │ Session / Queue     │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Agent Runtime       │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Tools / Skills      │
                    │ Plugins / MCP       │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Replies / Events    │
                    └────────────────────┘
```

这个结构里，Gateway 的位置非常清楚。

它不是最外层的某个渠道适配器，也不是最内层的模型调用器。

它位于中间，负责把所有入口、状态、事件和执行链路接起来。

---

## 十二、从后端研发视角看 Gateway 的设计价值

OpenClaw Gateway 对后端研发最有启发的地方，是它没有把 Agent 当成“一个接口”。

很多早期 AI 应用会这么设计：

```text
POST /chat
  ↓
调用大模型
  ↓
返回结果
```

这种设计做 Demo 可以。

但要做长期运行的 Agent 平台，就会遇到大量工程问题：

```text
多渠道怎么接？
会话怎么隔离？
连续消息怎么排队？
工具权限怎么控制？
系统事件怎么触发？
多端节点怎么接入？
执行过程怎么流式返回？
运行状态怎么观测？
```

OpenClaw Gateway 的设计思路是：

```text
先建立一个本地控制平面
再把渠道、节点、客户端、自动化入口都接进来
最后统一交给 Agent Runtime 执行
```

这对企业内部 AI 平台也很有借鉴意义。

比如我们要做一个企业 AI 助手，不应该一开始就把飞书 Bot、企微 Bot、Web 页面、定时任务全部写成独立逻辑。

更合理的架构是：

```text
飞书 / 企微 / Web / API / Cron / Webhook
  ↓
统一 Gateway
  ↓
统一会话和权限
  ↓
统一 Agent Runtime
  ↓
统一工具系统
```

这样后续扩展能力时，系统不会快速失控。

---

## 十三、Gateway 设计里最值得学习的 5 个点

### 1. 长期运行，而不是请求即销毁

Agent 系统需要持续维护连接、状态、会话和任务。

所以 Gateway 更适合作为 daemon 长期运行，而不是一次性脚本。

---

### 2. WebSocket 控制平面

OpenClaw 使用 WebSocket 承载 CLI、Web UI、App、Node 等连接。

这比纯 HTTP 更适合流式输出、实时事件、节点在线状态和双向通信。

---

### 3. 渠道适配和 Agent Runtime 解耦

Channel 只负责平台协议。

Agent Runtime 不应该感知每个平台的复杂细节。

这样系统才能持续扩展。

---

### 4. Session 是入口统一后的关键

多渠道统一之后，如果没有 session 隔离，系统很容易串上下文。

Gateway 必须先明确“这条消息属于哪个会话”，再交给 Agent。

---

### 5. 安全默认值必须保守

Gateway 是控制平面，不能随便暴露。

尤其是 Agent 具备读文件、跑命令、发消息、调工具能力时，Gateway 一旦暴露，风险不是普通接口泄露，而是执行权限泄露。

---

## 十四、总结

OpenClaw Gateway 的本质，不是一个简单的消息转发器。

它更像一个本地控制平面，统一接管：

```text
多聊天渠道
控制客户端
执行节点
会话状态
自动化事件
Agent Runtime
工具调用
运行状态
```

普通 Bot 关注的是：

```text
收到消息后怎么回复
```

OpenClaw Gateway 关注的是：

```text
所有入口如何统一进入 Agent 系统
所有任务如何被正确路由、隔离、执行和返回
```

这就是它的架构价值。

如果说上一篇文章的结论是：

```text
OpenClaw 不是普通 Bot，而是一个本地优先的 Agent Gateway。
```

那么这一篇可以进一步明确：

```text
Gateway 是 OpenClaw 的控制平面。
它负责把多渠道、多客户端、多节点、多事件统一接入同一套 Agent Runtime。
```

这个设计对后端研发很有参考意义。

未来我们自己做企业 AI 平台、运营助手、数据分析助手、自动化 Agent 时，也可以借鉴这套思路：

```text
不要让每个渠道各自调用模型。
先做统一 Gateway，再做 Agent Runtime，再做 Tools / Skills / Plugins。
```

只有这样，AI 应用才不会停留在“聊天机器人”阶段，而是逐步演进成真正可维护、可扩展、可运行的 Agent 平台。

[1]: https://github.com/openclaw/openclaw
[2]: https://github.com/openclaw/openclaw/blob/main/docs/gateway/protocol.md
[3]: https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md
