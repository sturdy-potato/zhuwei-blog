---
title: "OpenClaw Agent Loop 原理拆解：一次消息如何变成模型调用和工具调用"
excerpt: "OpenClaw 的 Agent Loop 不是简单调用一次大模型，而是一条完整的任务执行链路。本文拆解一条消息如何经过会话解析、队列控制、上下文组装、模型推理、工具调用、流式回复和持久化，最终变成一次可控的 Agent 执行。"
pubDate: 2026-04-29
category: "AI工程"
section: "技术专栏"
tags:
  - OpenClaw
  - Agent Loop
  - Tool Calling
  - AI Gateway
  - 架构设计
color: "purple"
icon: "Workflow"
minutes: 10
views: 0
comments: 0
draft: false
---

# OpenClaw Agent Loop 原理拆解：一次消息如何变成模型调用和工具调用

前两篇文章分别拆了 OpenClaw 的整体架构和 Gateway。

这篇继续往核心里走：**OpenClaw 收到一条消息之后，到底是怎么变成模型调用和工具调用的？**

很多人理解 AI Bot 时，脑子里是这样一条链路：

```text
用户发消息
  ↓
调用大模型
  ↓
返回答案
```

这个理解适合普通聊天机器人，但不适合 OpenClaw。

OpenClaw 的 Agent Loop 更接近这样：

```text
用户消息
  ↓
解析入口和会话
  ↓
进入队列
  ↓
准备 workspace / skills / context
  ↓
组装 system prompt
  ↓
调用模型
  ↓
模型决定是否调用工具
  ↓
工具执行
  ↓
模型继续推理
  ↓
流式返回
  ↓
写入会话历史
```

所以，Agent Loop 不是“调用一次 LLM”。

它是一条完整的任务执行链路。

---

## 一、什么是 Agent Loop？

Agent Loop 可以理解成 Agent 的一次完整运行。

不是用户发一句、模型回一句这么简单，而是一次从输入到输出的完整闭环：

```text
输入接收
  ↓
上下文组装
  ↓
模型推理
  ↓
工具执行
  ↓
结果观察
  ↓
继续推理
  ↓
回复用户
  ↓
状态持久化
```

这就是 OpenClaw 和普通 Bot 的核心区别之一。

普通 Bot 主要解决：

```text
怎么回复？
```

Agent Loop 解决的是：

```text
怎么在保持会话一致性的前提下，完成一次可控的任务执行？
```

比如用户发：

```text
帮我查一下今天销售数据，并按品牌汇总一下。
```

普通 Chatbot 如果没有工具，只能根据已有知识胡乱回答。

Agent Loop 的目标则是让模型：

1. 理解用户要查“今天销售数据”；
2. 判断需要调用销售数据工具；
3. 自动组织工具参数；
4. 执行工具；
5. 拿到结果；
6. 再让模型根据结果生成分析；
7. 最后把结果回复到正确渠道。

这才是 Agent 的价值。

---

## 二、一次消息的总链路

可以先看一张简化流程图。

```text
用户消息
  ↓
Channel 接入
  ↓
Gateway 收到事件
  ↓
agent RPC
  ↓
解析 session
  ↓
返回 runId
  ↓
agentCommand
  ↓
runEmbeddedPiAgent
  ↓
Session Queue / Global Queue
  ↓
准备 workspace / skills / context
  ↓
构建 system prompt
  ↓
模型推理
  ↓
工具调用
  ↓
工具结果返回模型
  ↓
assistant 流式输出
  ↓
reply shaping
  ↓
session transcript 持久化
```

这条链路里有几个关键对象：

| 对象                 | 作用                                   |
| ------------------ | ------------------------------------ |
| Channel            | 负责接入 Telegram、Slack、飞书、Discord 等外部渠道 |
| Gateway            | 负责统一接管入口、路由、会话、事件                    |
| agent RPC          | 负责发起一次 Agent run                     |
| session            | 负责隔离上下文和运行状态                         |
| queue              | 负责控制并发，避免同一个 session 同时跑多个任务         |
| agentCommand       | 负责运行 agent 的命令层逻辑                    |
| runEmbeddedPiAgent | 负责真正调用底层 agent runtime               |
| system prompt      | 负责告诉模型身份、规则、工具、技能、上下文                |
| tools              | 负责真实动作，比如查数据、读文件、发消息、执行命令            |
| stream events      | 负责把 assistant、tool、lifecycle 事件流式发出来 |
| persistence        | 负责把本轮执行写回 session 历史                 |

这说明 OpenClaw 的 Agent Loop 是一套运行时机制，而不是一个简单函数。

---

## 三、第一步：消息进入 Gateway

用户消息可能来自很多入口：

```text
Telegram
WhatsApp
Slack
Discord
Feishu
iMessage
WebChat
CLI
Cron
Webhook
```

这些入口格式都不一样。

但进入 Gateway 之后，需要被转换成 OpenClaw 内部可以理解的事件。

例如外部消息里至少要抽象出这些信息：

```text
消息来自哪个 channel？
是谁发的？
属于哪个 chat / thread？
消息内容是什么？
是否带附件？
是否需要回复？
应该绑定到哪个 session？
```

这一步很重要。

因为 Agent Runtime 不应该直接感知每个平台的细节。

如果 Agent Runtime 直接处理 Telegram 的 message_id、Slack 的 thread_ts、飞书的 open_id，系统会变得非常难维护。

所以 Gateway 的作用之一，就是先把外部渠道差异收口。

---

## 四、第二步：解析 session

收到消息后，OpenClaw 不能马上调用模型。

它必须先判断：

```text
这条消息属于哪个 session？
```

session 是 Agent Loop 的核心边界。

不同 session 代表不同上下文、不同历史、不同权限、不同运行状态。

比如：

```text
Telegram 私聊 A
Telegram 群聊 B
Slack 频道 C
飞书群 D
Cron 任务 E
Webhook 任务 F
```

这些不应该混在一起。

如果 session 混乱，会出现很严重的问题：

```text
用户在私聊里发的敏感信息，可能被带到群聊回复里。
群聊里的上下文，可能污染私聊任务。
定时任务的执行结果，可能进入人工对话历史。
```

所以，一条消息进入 Agent Loop 之前，首先要完成 session 解析。

可以简化成：

```text
channel + sender + conversation + thread
  ↓
sessionKey / sessionId
  ↓
绑定到对应 session
```

这也是为什么 OpenClaw 的 Agent Loop 是“per-session serialized run”。

它不是全局乱跑，而是按 session 隔离执行。

---

## 五、第三步：agent RPC 先返回 runId

在 OpenClaw 里，发起 Agent 执行的入口之一是 Gateway RPC：`agent`。

它不是等整个任务跑完才返回，而是先完成几件事：

```text
校验参数
解析 sessionKey / sessionId
持久化 session metadata
返回 runId 和 acceptedAt
```

也就是说，`agent` 更像是“提交任务”。

它接收请求后，先告诉调用方：

```text
你的任务已经被接受了，这是 runId。
```

然后真正的 Agent 执行继续往后跑。

这是一种典型的异步任务设计。

因为 Agent run 可能很慢：

* 模型推理要时间；
* 工具调用要时间；
* 浏览器操作要时间；
* 文件读取要时间；
* 外部接口请求要时间；
* 模型可能多轮调用工具。

如果 RPC 一直阻塞，体验和稳定性都会变差。

所以 OpenClaw 把“接受任务”和“等待任务完成”分开。

对应地，还有 `agent.wait`，用于等待某个 runId 的 lifecycle end 或 error。

---

## 六、第四步：agentCommand 接手执行

`agent` RPC 接收任务之后，会进入 `agentCommand`。

可以把 `agentCommand` 理解成 Agent Loop 的命令编排层。

它主要负责：

```text
解析模型配置
解析 thinking / verbose 默认值
加载 skills snapshot
调用 runEmbeddedPiAgent
兜底发出 lifecycle end / error
```

这一步还不是最底层模型调用。

它更像是进入模型运行时之前的一层准备和调度。

为什么要有这一层？

因为一次 Agent run 不只是“传一个 prompt 给模型”。

它还需要先确定：

```text
这次用哪个模型？
是否启用 thinking？
是否 verbose？
当前 agent 能使用哪些 skills？
是否有 per-run override？
如果底层 loop 没有正确发出结束事件，是否需要补 lifecycle？
```

这就是工程化 Agent 系统和简单 LLM 调用的区别。

简单调用大模型，只关心 prompt 和 response。

Agent Runtime 还要关心运行状态、事件、会话、工具、异常、超时和持久化。

---

## 七、第五步：进入队列，避免同 session 并发冲突

真正执行之前，OpenClaw 会把 run 放进队列。

这个设计非常关键。

因为用户经常会连续发消息：

```text
帮我查今天销售数据
按品牌拆一下
再发到群里
```

对用户来说，这三句话是连续意图。

对系统来说，这是三条消息。

如果三条消息同时触发三次模型调用，可能发生：

```text
第一次还没查完，第二次已经开始拆品牌。
第二次还没生成结果，第三次已经尝试发群。
三次 run 同时写 session 历史，顺序错乱。
多个工具同时争用同一份资源。
```

所以 OpenClaw 用队列解决这个问题。

可以理解成两层：

```text
Session Queue：同一个 session 内串行执行
Global Queue：控制整体并发数量
```

session queue 保证：

```text
同一个会话里，同一时间只有一个 active run。
```

global queue 保证：

```text
整个 Gateway 不会无限制并发调用模型和工具。
```

这非常适合 Agent 系统。

传统后端接口往往追求并发越高越好。

但 Agent 系统不能简单这样做。

因为 Agent 的上下文高度依赖顺序。

同一个 session 里，顺序错了，语义就错了。

---

## 八、第六步：准备 workspace、skills 和 context

进入真正模型调用前，OpenClaw 要准备模型能看到的上下文。

这一步不是简单拼接聊天记录。

它至少包括：

```text
workspace
session history
skills
bootstrap files
tool schemas
attachments
runtime info
memory / context files
```

可以把 context 理解成：

```text
本轮模型调用时，模型实际能看到的全部内容。
```

这里要区分两个概念：

```text
memory：长期保存的信息，可以存在磁盘或外部存储里。
context：当前这一轮真正塞进模型窗口里的内容。
```

模型不是直接读取你所有历史文件。

模型只能看到当前上下文窗口里的内容。

所以 OpenClaw 要做上下文选择和组装。

例如：

```text
系统规则要放进去
可用工具要放进去
可用 skills 的摘要要放进去
当前 session 的历史要放进去
必要 workspace 文件要放进去
工具结果和附件要放进去
```

这一步决定了模型“知道什么”。

如果 context 组装不好，模型就会表现得像失忆一样。

如果 context 放太多，又会浪费 token，甚至超出上下文窗口。

所以 Agent Loop 里 context assembly 是一个核心步骤。

---

## 九、第七步：构建 system prompt

准备好上下文后，OpenClaw 会构建 system prompt。

这里需要注意：system prompt 不只是普通的一段角色设定。

它通常包含：

```text
OpenClaw 的基础规则
当前运行环境
工具使用规则
skills 列表
workspace 注入内容
安全和沙箱说明
当前日期时间相关信息
模型特定指导
回复格式要求
silent reply 规则
```

可以理解为：

```text
system prompt = 本轮 Agent 执行的操作系统说明书
```

模型要靠它知道：

* 自己是谁；
* 当前运行在哪里；
* 能使用哪些工具；
* 工具应该怎么调用；
* 什么情况下不能回复；
* 是否可以执行命令；
* 是否需要走审批；
* 如何处理文件、上下文、消息和错误。

这也是为什么 Agent 系统的 prompt 比普通聊天 prompt 复杂得多。

普通 prompt 可能只写：

```text
你是一个有帮助的助手。
```

Agent prompt 需要告诉模型：

```text
你可以做什么
你不可以做什么
你如何调用工具
你如何处理工具结果
你如何回复用户
你如何保持安全边界
```

---

## 十、第八步：模型推理不是最终答案，而是决策过程

完成 prompt 和 context 组装后，才进入模型推理。

但这里的模型输出不一定是最终答案。

模型可能会先判断：

```text
我是否已经知道答案？
是否需要调用工具？
需要调用哪个工具？
工具参数是什么？
调用工具之后如何处理结果？
```

比如用户发：

```text
帮我查一下今天销售数据，并按品牌汇总。
```

模型不应该直接回答：

```text
今天销售情况良好。
```

它应该判断需要工具：

```text
需要调用 query_sales_report
参数：
dateStart = 今天 00:00:00
dateEnd = 今天 23:59:59
groupBy = brand
metrics = gmv, order_count, avg_order_value
```

这一步就是 Tool Calling 的核心。

模型不只是生成自然语言，而是生成一个结构化动作请求。

---

## 十一、第九步：工具调用开始执行

模型决定调用工具之后，Agent Runtime 会执行对应工具。

工具可以有很多种：

```text
读取文件
搜索网页
操作浏览器
调用 API
执行命令
发送消息
查询 session
创建定时任务
调用 MCP 工具
生成图片或媒体
```

工具调用一般会经历几个阶段：

```text
tool start
  ↓
tool update
  ↓
tool end
```

也就是说，工具执行本身也会产生事件。

这很重要。

因为有些工具不是瞬间完成的。

比如：

```text
浏览器打开页面
等待加载
点击按钮
提取内容
截图
返回结果
```

这些过程如果没有事件流，用户和系统都不知道工具卡在哪里。

OpenClaw 把 tool events 纳入 stream，可以让外部观察到工具执行过程。

这也是 Agent 系统可观测性的一部分。

---

## 十二、第十步：工具结果回到模型

工具执行完之后，结果不会直接原样发给用户。

通常会先回到模型。

模型拿到工具结果后，再决定下一步：

```text
结果够不够？
是否还要继续调用工具？
是否要修正参数？
是否要解释结果？
是否要生成最终回复？
```

比如销售数据工具返回：

```json
{
  "date": "2026-04-29",
  "totalGmv": 1532000,
  "orderCount": 8120,
  "brandStats": [
    {
      "brand": "A",
      "gmv": 420000,
      "orderCount": 2100
    },
    {
      "brand": "B",
      "gmv": 310000,
      "orderCount": 1800
    }
  ]
}
```

模型不会直接把 JSON 扔给用户。

它会根据用户意图组织成更可读的结果：

```text
今天 GMV 为 153.2 万，订单数 8120。
按品牌看，A 品牌贡献最高，GMV 为 42 万，占比约 27.4%。
B 品牌排名第二，GMV 为 31 万，占比约 20.2%。
```

所以工具负责拿事实，模型负责解释和组织表达。

这就是 Agent Loop 的闭环：

```text
模型提出动作
工具执行动作
模型观察结果
模型继续推理
```

---

## 十三、第十一步：流式输出 assistant / tool / lifecycle 事件

OpenClaw 的 Agent Loop 不只是最后返回一个结果。

它会发出多类 stream 事件：

```text
lifecycle：start / end / error
assistant：模型输出增量
tool：工具调用事件
```

这三类事件对应三种不同信息：

| stream    | 含义                      |
| --------- | ----------------------- |
| lifecycle | 本次 run 的生命周期，比如开始、结束、异常 |
| assistant | 模型正在输出的文本增量             |
| tool      | 工具调用过程，比如开始、更新、结束       |

这样做的价值是：

```text
用户可以看到模型正在回复
系统可以观察工具是否执行
调用方可以知道 run 是否结束
异常可以被明确捕获
```

如果没有 stream，Agent 就会像黑盒。

用户只知道“它卡住了”，但不知道是模型慢、工具慢、队列等待、还是 session 冲突。

Agent 系统要进入真实使用场景，必须具备这种运行时可观测能力。

---

## 十四、第十二步：回复整形和去重

模型和工具产生的内容，不能直接无脑发出去。

OpenClaw 还需要做 reply shaping。

可以理解成最终回复整理：

```text
assistant 文本
reasoning 摘要
工具结果摘要
错误信息
silent token
重复消息
```

都需要处理。

比如有些工具本身已经把消息发出去了。

这时如果 assistant 又补一句：

```text
我已经发送了。
```

可能会造成重复。

再比如某些场景下，Agent 应该保持静默，不需要回复用户。

这就需要识别类似 `NO_REPLY` 的 silent token，并从最终输出中过滤。

所以最终回复不是模型输出什么就发什么。

而是经过一层整理：

```text
模型输出
  ↓
工具摘要处理
  ↓
重复回复抑制
  ↓
silent reply 过滤
  ↓
错误兜底
  ↓
发送给渠道
```

这一步看似细节，但对产品体验非常重要。

普通 Demo 可以忽略。

真实 Agent 系统不能忽略。

---

## 十五、第十三步：写入 session transcript

Agent run 结束后，还需要把本轮执行写回 session。

这包括：

```text
用户输入
assistant 输出
工具调用
工具结果
usage metadata
错误信息
运行时间
```

为什么这一步重要？

因为下一轮模型调用要依赖历史。

如果不持久化，本轮执行结束后，Agent 就不知道刚刚发生了什么。

比如用户下一句说：

```text
把刚刚的结果发给运营群。
```

模型必须能知道“刚刚的结果”是什么。

这就依赖 session transcript。

所以 Agent Loop 的最后一步不是“回复用户”，而是“回复 + 持久化”。

完整闭环应该是：

```text
输入进入 session
执行过程写入 session
输出回到用户
状态留给下一轮
```

这才叫一个完整的 Agent Loop。

---

## 十六、超时、取消和异常

Agent Loop 还必须处理异常情况。

比如：

```text
模型调用超时
工具执行失败
Gateway 断开
RPC 超时
用户取消任务
上下文超限
外部 API 报错
```

OpenClaw 的设计里，agent runtime 有超时控制；`agent.wait` 的 timeout 只是等待超时，不一定会停止实际 agent run。

这个区别很重要。

```text
agent runtime timeout：任务本身被中止
agent.wait timeout：调用方不等了，但任务可能还在跑
```

这和很多异步任务系统类似。

例如你提交一个后台任务，前端等了 30 秒超时，不代表后台任务一定停止了。

所以设计 Agent API 时，要区分：

```text
提交任务
等待任务
取消任务
任务真实结束
任务返回失败
```

不能把它们混成一个状态。

---

## 十七、上下文压缩和重试

Agent Loop 还有一个容易被忽略的问题：上下文窗口。

模型能看到的 token 是有限的。

随着 session 历史越来越长，上下文会越来越大。

如果不处理，迟早会遇到：

```text
context length exceeded
request too large
input is too long
```

OpenClaw 的思路是 compaction。

也就是把较早的历史消息压缩成摘要，保留近期消息和必要工具调用关系。

可以理解成：

```text
完整历史仍然保存在磁盘
但模型当前只看压缩后的上下文
```

这点很关键。

压缩不是删除历史。

压缩只是改变“下一轮模型实际看到什么”。

Agent 系统要长期运行，必须处理这个问题。

否则 session 越长，成本越高，速度越慢，最终还会超出模型限制。

---

## 十八、用一个例子串起来

假设用户在飞书里发：

```text
帮我查一下今天销售数据，按品牌汇总，并给出异常品牌。
```

在 OpenClaw 里，链路大概是：

```text
1. Feishu Channel 收到消息
2. Gateway 转成内部事件
3. 解析出 sender / chat / thread
4. 绑定到对应 session
5. agent RPC 校验参数
6. 返回 runId 和 acceptedAt
7. agentCommand 解析模型、thinking、skills
8. runEmbeddedPiAgent 进入 session queue
9. 等待同 session 前一个 run 结束
10. 进入 global queue
11. 准备 workspace、skills、context、历史消息
12. 构建 system prompt
13. 调用模型
14. 模型判断需要销售数据工具
15. 生成工具调用参数
16. 执行 query_sales_report
17. 工具返回销售数据
18. 模型分析品牌 GMV、订单数、异常波动
19. assistant 流式输出结果
20. reply shaping 处理重复、silent、错误兜底
21. Gateway 把回复发回飞书
22. session transcript 写入本轮历史
23. lifecycle end
```

这才是一次完整 Agent run。

如果画成一条主线：

```text
消息
  ↓
会话
  ↓
队列
  ↓
上下文
  ↓
模型
  ↓
工具
  ↓
模型
  ↓
回复
  ↓
持久化
```

这就是 Agent Loop 的本质。

---

## 十九、为什么 Agent Loop 比普通 Bot 难？

普通 Bot 的难点主要是：

```text
如何接消息？
如何回消息？
如何调用模型？
```

Agent Loop 的难点是：

```text
如何保持 session 一致？
如何控制并发？
如何组装上下文？
如何让模型正确调用工具？
如何处理工具结果？
如何流式暴露执行状态？
如何避免重复回复？
如何处理异常和超时？
如何长期运行而不爆上下文？
```

也就是说，OpenClaw 解决的是 Agent 工程化问题，不只是 Bot 接入问题。

这也是它值得研究的原因。

---

## 二十、对后端研发的启发

从后端研发视角看，OpenClaw Agent Loop 有几个设计点很值得借鉴。

### 1. Agent run 应该是任务，而不是普通接口

不要把 Agent 调用简单设计成：

```text
POST /chat
```

更合理的是：

```text
POST /agent
  ↓
返回 runId
  ↓
通过 stream / wait / status 观察执行过程
```

因为 Agent run 可能很长，也可能调用多个工具。

它更像异步任务，不像普通 HTTP 查询。

---

### 2. 同一个 session 必须串行

对于 Agent 系统，同一个 session 里的消息顺序非常重要。

不能简单并发。

否则上下文、工具调用、历史写入都可能乱。

```text
session 内串行
session 间并行
全局有并发上限
```

这是一个很实用的设计原则。

---

### 3. Context assembly 是核心能力

Agent 的表现，很大程度取决于 context 组装质量。

不是模型越强就一定效果越好。

如果上下文缺失，模型不知道事实。

如果上下文混乱，模型容易误判。

如果上下文太大，成本和延迟都会上升。

所以企业 AI 平台也应该把 context assembly 单独设计成模块，而不是随手拼 prompt。

---

### 4. 工具调用要有事件流

工具执行不能是黑盒。

至少要能看到：

```text
工具开始
工具参数
工具中间状态
工具结束
工具错误
```

否则排查 Agent 问题会非常困难。

---

### 5. 最终回复要经过整理

模型输出不等于最终消息。

真实系统要处理：

```text
重复消息
工具已发送消息
silent reply
错误兜底
分段发送
渠道格式限制
```

这一步决定了用户体验。

---

## 二十一、总结

OpenClaw 的 Agent Loop 可以概括为一句话：

```text
它把一条消息变成一次受会话约束、受队列控制、带上下文组装、可调用工具、可流式观察、可持久化的 Agent run。
```

普通 Bot 更像：

```text
收到消息 → 调模型 → 回复
```

OpenClaw Agent Loop 更像：

```text
收到消息
  ↓
解析会话
  ↓
进入队列
  ↓
组装上下文
  ↓
构建系统提示词
  ↓
模型推理
  ↓
工具执行
  ↓
模型观察结果
  ↓
流式回复
  ↓
整理输出
  ↓
持久化状态
```

这就是 Agent 系统真正复杂的地方。

如果说 Gateway 解决的是“多入口如何接入”，那么 Agent Loop 解决的是“入口进来以后，任务如何被可靠执行”。

这也是 OpenClaw 最值得学习的核心之一。

