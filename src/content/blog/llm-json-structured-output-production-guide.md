---
title: "大模型稳定输出 JSON 的生产级方案：从结构化输出到验收闭环"
excerpt: "让大模型稳定输出 JSON，不是把 prompt 写得更凶，而是把模型输出当成不可信输入：用结构化输出约束格式，用程序校验兜住边界，用业务规则、日志、评测和审计保证系统可控。"
pubDate: 2026-06-23
category: "大模型应用"
section: "AI工程"
tags:
  - AI
  - LLM
  - JSON
  - Structured Outputs
  - Function Calling
  - Tool Calling
  - JSON Schema
  - 后端开发
color: "purple"
icon: "Braces"
minutes: 13
views: 0
comments: 0
draft: false
---

在大模型应用里，“让模型稳定输出 JSON”几乎是每个 AI 工程都会遇到的问题。

Demo 阶段，很多人会写一句：

```text
请严格输出 JSON，不要输出解释。
```

看起来能跑。

但一进生产系统，问题马上出现：

- 模型偶尔输出 Markdown 代码块；
- 字段缺失，类型不对，枚举值乱填；
- JSON 语法合法，但业务含义错了；
- 输出被截断，只返回了半个对象；
- 模型拒答或触发安全策略，根本没有返回预期结构；
- 工具参数看起来正确，但执行后会越权、重复扣款或写脏数据。

所以生产级方案不能停留在“让模型更听话”。

更可靠的思路是：

> **不要假设模型一定会正确输出 JSON。要把模型输出当成不可信输入，由工程系统负责验收。**

稳定 JSON 的本质，不是“模型稳定”，而是“系统稳定”。

---

## 先区分四种正确

很多团队说“JSON 不稳定”，其实混在了一起。

至少要分成四层：

```text
语法正确
  ↓
Schema 正确
  ↓
语义正确
  ↓
业务正确
```

### 语法正确

语法正确，只表示 JSON 能被解析器解析。

例如：

```json
{
  "intent": "refund_order"
}
```

这是合法 JSON。

但下面这个就不是：

```json
{
  "intent": "refund_order",
}
```

因为多了尾逗号。

### Schema 正确

Schema 正确，表示字段、类型、必填项、枚举值都符合系统约定。

比如系统要求：

```json
{
  "intent": "refund_order",
  "order_id": "A123",
  "confidence": 0.91
}
```

但模型返回：

```json
{
  "intent": "我要退款",
  "id": "A123",
  "score": "很高"
}
```

它虽然是合法 JSON，但不符合 Schema。

### 语义正确

语义正确，表示模型理解的用户意图是对的。

用户说：

```text
我想查一下这个订单还能不能退款。
```

模型返回：

```json
{
  "intent": "cancel_order",
  "order_id": "A123",
  "confidence": 0.86
}
```

这个 JSON 语法正确，Schema 也正确，但语义错了。用户要问的是退款咨询，不是取消订单。

### 业务正确

业务正确，表示结果符合真实业务规则。

模型返回：

```json
{
  "can_refund": true,
  "reason": "订单支持退款"
}
```

但数据库里这个订单已经超过售后期，实际不能退。

这种错误不是 JSON 格式问题，而是业务裁决问题。

前两层可以靠结构化输出和 Schema 校验解决大部分问题；后两层必须靠工具调用、数据库查询、业务规则和人工兜底。

---

## Prompt 只是第一层约束

Prompt 当然有用，但它不是最终保障。

一个基础 prompt 可以这样写：

```text
你是一个结构化信息抽取器。
只输出 JSON。
不要输出 Markdown。
不要输出解释。
不要使用代码块。
字段必须符合下面的 Schema。
缺失信息用 null，不要编造。
```

这种写法能降低错误率，但它仍然只是自然语言约束。

自然语言指令不能从解码层面阻止模型生成非法 token，也不能保证字段语义和业务判断一定正确。

所以 prompt 的定位应该是：

> **让模型更容易走向正确输出，而不是保证输出一定正确。**

---

## 优先使用 Structured Outputs，而不是只靠 JSON mode

如果你调用的是云端模型 API，第一优先级不是继续加 prompt，而是看服务商是否支持结构化输出。

常见能力包括：

- Structured Outputs
- JSON Schema response format
- Function Calling / Tool Calling
- strict mode
- JSON mode

它们不是一回事。

| 能力 | 主要解决什么 | 不能解决什么 |
| --- | --- | --- |
| JSON mode | 尽量返回可解析 JSON | 不保证字段符合你的 Schema |
| Structured Outputs | 按 Schema 返回结构化对象 | 不保证语义、事实、业务规则正确 |
| Function / Tool Calling | 让模型生成工具名和参数 | 不代表模型真的执行了工具 |
| Constrained Decoding | 在解码阶段限制合法 token | 不保证业务判断正确 |

OpenAI 官方文档也明确区分了 JSON mode 和 Structured Outputs：JSON mode 主要保证输出是合法 JSON；Structured Outputs 才会约束模型输出遵守你提供的 Schema。能用 Structured Outputs 时，不应该只依赖 JSON mode。参考：[OpenAI Structured Outputs 文档](https://platform.openai.com/docs/guides/structured-outputs)。

但这里要特别注意：

> **Structured Outputs 通过了，不等于业务可用。**

它只能说明“结构符合约定”。后面仍然要检查：

- 模型是否拒答；
- 输出是否因为 `max_tokens` 或上下文限制被截断；
- `finish_reason` 是否正常；
- 字段值是否和用户真实意图一致；
- 工具参数是否有权限执行；
- 业务规则是否允许这次操作。

结构化输出是入口约束，不是最终验收。

---

## Tool Calling 不是让模型执行代码

Tool Calling 很容易被误解。

它的真实含义是：

> **模型负责选择工具并生成参数，后端负责校验、执行、审计和回传结果。**

比如模型输出：

```json
{
  "tool": "refund_order",
  "arguments": {
    "order_id": "A123",
    "amount": 99
  }
}
```

这不代表退款已经发生。

你的后端至少还要做：

- 用户是否有权限操作这个订单；
- 订单是否属于当前用户；
- 订单状态是否允许退款；
- 金额是否超过可退金额；
- 这次请求是否重复提交；
- 是否需要人工审批；
- 执行结果是否要写审计日志。

Tool Calling 的生产原则是：

> **模型只给建议参数，系统才拥有执行权。**

尤其是涉及资金、权限、库存、账号、邮件发送、数据库写入的工具，不能让模型输出直接进入执行层。

---

## Schema 设计比 prompt 更关键

很多“JSON 不稳定”，本质是 Schema 太松。

### 字段要少而明确

不要设计这种字段：

```json
{
  "result": "用户好像想退款"
}
```

这对程序没有太大价值。

更好的设计是：

```json
{
  "schema_version": "v1",
  "intent": "refund_order",
  "order_id": "A123",
  "confidence": 0.91,
  "missing_fields": []
}
```

### 能用枚举就不要用自由文本

不要让模型自由发挥：

```json
{
  "intent": "用户可能是想退款吧"
}
```

应该让它从有限集合里选：

```json
{
  "intent": "refund_order"
}
```

枚举值由系统定义：

```text
query_order
cancel_order
refund_order
complaint
unknown
```

### 可缺失字段也保持稳定

生产系统里，不建议模型有时返回字段、有时省略字段。

推荐让字段稳定存在，缺失值用 `null`：

```json
{
  "intent": "refund_order",
  "order_id": null
}
```

Schema 里要明确写成 nullable：

```json
{
  "order_id": {
    "type": ["string", "null"]
  }
}
```

这样后端不需要同时处理“字段不存在”和“字段为 null”两套分支。

### 禁止额外字段

如果业务不需要 `user_emotion`，就不要让它混进系统。

```json
{
  "type": "object",
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": ["v1"]
    },
    "intent": {
      "type": "string",
      "enum": ["query_order", "cancel_order", "refund_order", "unknown"]
    },
    "order_id": {
      "type": ["string", "null"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["schema_version", "intent", "order_id", "confidence"],
  "additionalProperties": false
}
```

`additionalProperties: false` 的意义，是减少模型自作主张扩展接口。

---

## 程序校验是必需品

模型返回之后，不能直接进入业务逻辑。

生产链路至少应该是：

```text
模型响应
  ↓
检查 API 状态和 finish_reason
  ↓
解析 JSON 或读取结构化字段
  ↓
Schema 校验
  ↓
语义置信度与缺失字段判断
  ↓
业务规则校验
  ↓
通过后进入业务系统
```

Python 里可以用 Pydantic：

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class IntentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["v1"]
    intent: Literal["query_order", "cancel_order", "refund_order", "unknown"]
    order_id: str | None
    confidence: float = Field(ge=0, le=1)
    missing_fields: list[str]
```

统一校验：

```python
def validate_llm_output(raw_json: str) -> IntentResult:
    return IntentResult.model_validate_json(raw_json)
```

这一步的意义不是“让模型更稳定”，而是让系统知道模型什么时候不稳定。

---

## 失败处理要覆盖 API 边界

很多文章只写“JSON 解析失败就重试”，这还不够。

生产环境至少要区分这些失败：

| 失败类型 | 典型表现 | 处理方式 |
| --- | --- | --- |
| API 调用失败 | 超时、429、5xx | 指数退避、限流、降级 |
| 模型拒答 | 返回 refusal 或安全拒绝 | 不强行 repair，走安全兜底 |
| 输出截断 | `finish_reason` 异常或内容不完整 | 扩大 token、缩短输入、重试 |
| JSON 语法错误 | 解析失败 | 保守 repair 或错误感知重试 |
| Schema 失败 | 字段缺失、类型错误、枚举非法 | 带校验错误重试 |
| 语义低置信 | `confidence` 低、缺失关键字段 | 追问用户或转人工 |
| 业务校验失败 | 订单不可退、权限不足 | 返回业务原因，不让模型裁决 |

错误感知重试不要只说“你错了”，要把具体错误反馈给模型：

```text
你的上一次输出没有通过 JSON Schema 校验。

错误：
字段 intent 的值 "退款" 不在允许枚举中。

允许值：
["query_order", "cancel_order", "refund_order", "unknown"]

请只返回修正后的 JSON。
不要输出解释。
不要使用 Markdown。
```

重试次数必须有限制，通常 `max_retries = 2` 或 `3`。

超过次数后，不要无限请求模型。应该进入降级路径：

- 返回 `unknown`；
- 追问用户补充信息；
- 转人工；
- 返回普通文本解释；
- 记录异常日志，进入离线分析队列。

---

## JSON repair 只能保守使用

JSON repair 很有用，但不能滥用。

它适合修复：

- 多余尾逗号；
- 少一个右括号；
- 字符串引号不完整；
- Markdown 代码块包裹；
- 少量转义问题。

它不适合做：

- 猜测用户真实意图；
- 自动补业务字段；
- 把非法枚举强行映射成合法枚举；
- 为了通过校验而编造订单号、金额、用户 ID。

repair 的原则是：

> **只能修语法，不能修事实；只能做保守归一化，不能替模型做业务判断。**

否则 repair 层本身会变成新的错误来源。

---

## 业务校验不能交给模型

模型适合做：

- 意图识别；
- 字段抽取；
- 文本分类；
- 候选方案生成；
- 自然语言解释。

程序适合做：

- 权限判断；
- 金额计算；
- 库存判断；
- 订单状态判断；
- 规则执行；
- 数据库更新。

比如退款场景，正确链路应该是：

```text
模型识别用户意图：refund_order
  ↓
模型抽取 order_id
  ↓
后端查询订单
  ↓
后端校验用户权限
  ↓
后端判断是否可退款
  ↓
需要时发起人工审批
  ↓
最终返回结果
```

不要让模型直接回答“可以退”或“不能退”。

它可以解释规则，但不能替代规则系统。

---

## 安全、审计和幂等要提前设计

只要模型输出会影响真实业务动作，就必须考虑安全治理。

### 权限

模型输出里的 `user_id`、`order_id`、`tenant_id` 都不能直接相信。

真实身份必须来自你的登录态、服务端 session 或 token，而不是模型抽取结果。

### 幂等

涉及写操作时，要有幂等键。

比如创建工单、发送邮件、退款申请，都要防止模型重试导致重复执行。

```text
idempotency_key = request_id + tool_name + normalized_arguments_hash
```

### 审批

高风险工具不要直接执行。

可以把工具分级：

| 风险等级 | 示例 | 策略 |
| --- | --- | --- |
| 低风险 | 查询天气、查询订单状态 | 可自动执行 |
| 中风险 | 创建工单、发送通知 | 参数校验后执行 |
| 高风险 | 退款、删除数据、修改权限 | 人工确认或审批 |

### 审计

日志至少要记录：

- 请求 ID；
- 用户 ID；
- 模型名称和版本；
- Schema 版本；
- 原始输出或结构化输出；
- 校验错误；
- 工具名和参数摘要；
- 执行结果；
- fallback 原因。

注意日志脱敏。手机号、邮箱、身份证号、地址、token、订单详情等敏感信息，不应该原样进入普通日志。

---

## 自部署模型可以用 Constrained Decoding

如果你使用自部署开源模型，可以考虑 constrained decoding。

它的核心思想是：

> **在解码阶段限制模型只能生成符合规则的 token。**

约束来源可以是：

- JSON Schema；
- Regex；
- Context-Free Grammar；
- Finite State Machine。

它能显著提高格式稳定性，尤其适合批量抽取、高并发、低容错场景。

但它也有成本：

- 接入复杂度更高；
- 对推理框架有要求；
- 复杂 Schema 可能影响速度；
- 仍然不能保证语义和业务正确。

所以它解决的是“格式和结构约束”，不是所有正确性问题。

---

## SFT 不是第一选择

有些团队会说：

> 那我是不是应该微调一个模型，让它天然稳定输出 JSON？

SFT 确实可以提升模型对特定格式、特定任务、特定字段的稳定性。

但它通常不是第一优先级。

更合理的顺序是：

```text
1. 设计清晰 Schema
2. 使用 Structured Outputs / Tool Calling
3. 加程序校验
4. 加错误感知 retry 和 fallback
5. 建立评测集和日志闭环
6. 仍不满足，再考虑 SFT
```

SFT 适合这些条件同时出现：

- Schema 长期稳定；
- 调用量极大；
- 任务类型固定；
- 延迟和成本敏感；
- 有大量高质量标注数据；
- 模型经常出现字段语义错误。

但即使做了 SFT，生产系统也仍然需要 Schema 校验、业务校验和失败兜底。

SFT 提升的是模型倾向，不是绝对保证。

---

## 评测指标不要只看 parse 成功率

只看 `json.loads` 成功率，会把很多问题藏起来。

生产环境至少应该统计：

| 指标 | 含义 |
| --- | --- |
| `parse_success_rate` | JSON 是否能解析 |
| `schema_validation_success_rate` | 是否符合 Schema |
| `semantic_accuracy` | 意图和字段是否符合用户真实表达 |
| `business_validation_success_rate` | 是否通过业务规则 |
| `retry_rate` | 有多少请求需要重试 |
| `fallback_rate` | 有多少请求最终降级 |
| `refusal_rate` | 有多少请求被模型拒答 |
| `truncation_rate` | 有多少输出被截断 |
| `tool_execution_error_rate` | 工具执行失败比例 |
| `latency_p95` | 重试后延迟是否可接受 |
| `cost_per_success` | 每次成功结构化输出的平均成本 |

其中 `semantic_accuracy` 最容易被忽略。

它不能只靠线上日志自动算，通常要有一批人工标注的评测集：

- 正常表达；
- 信息缺失；
- 多意图混合；
- 模糊表达；
- 对抗输入；
- 长上下文；
- 跨语言或中英混合；
- 真实线上失败样本。

没有评测集，就很难判断一次 prompt、Schema 或模型升级到底是变好了还是变差了。

---

## 推荐的生产级架构

一个比较稳的链路可以这样设计：

```text
用户输入
  ↓
任务路由
  ↓
选择 Schema 和工具白名单
  ↓
调用支持结构化输出的模型
  ↓
检查 API 状态、refusal、finish_reason
  ↓
解析结构化结果
  ↓
Schema 校验
  ↓
语义置信度和缺失字段判断
  ↓
业务规则校验
  ↓
低风险工具自动执行
  ↓
高风险工具人工确认
  ↓
记录日志和指标
  ↓
失败样本进入评测集
```

代码层面，不应该到处散落：

```python
json.loads(llm_result)
```

而应该封装成统一组件：

```python
result = structured_llm.call(
    prompt=prompt,
    schema=IntentResult,
    max_retries=2,
    fallback={"schema_version": "v1", "intent": "unknown"},
)
```

这个组件负责：

- 模型调用；
- API 边界检查；
- Schema 校验；
- 错误感知重试；
- fallback；
- 日志脱敏；
- 指标上报；
- raw output 采样留存；
- Schema 版本管理。

---

## 最后总结

让大模型稳定输出 JSON，不能只靠 prompt。

生产级方案应该是：

```text
清晰 Schema
  +
Structured Outputs / Tool Calling
  +
API 边界检查
  +
程序校验
  +
错误感知 retry
  +
业务规则校验
  +
权限、幂等、审计
  +
日志和评测闭环
```

JSON mode 可以作为基础能力，但不要把它当成 Schema 保证。

Structured Outputs 可以显著提升结构稳定性，但不要把它当成业务正确性保证。

Tool Calling 可以让模型生成工具参数，但真正的执行权必须在后端。

这套方案背后的核心思想很简单：

> **模型负责理解，程序负责验收，业务系统负责裁决。**

做到这一点，JSON 输出才从“看起来听话”，变成“系统上可控”。
