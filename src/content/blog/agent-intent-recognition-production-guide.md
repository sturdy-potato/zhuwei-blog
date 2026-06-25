---
title: "Agent 意图识别的生产级做法：从分类到可控决策"
excerpt: "Agent 意图识别不应只是让大模型返回一个标签。更科学的做法是用分层架构把用户输入转成结构化决策结果，再经过工具召回、参数校验、安全策略和确认流程，进入可控执行。"
pubDate: 2026-06-23
category: "大模型应用"
section: "AI工程"
tags:
  - AI
  - Agent
  - LLM
  - Intent Recognition
  - Tool Calling
  - 架构设计
color: "purple"
icon: "Route"
minutes: 7
views: 0
comments: 0
draft: false
---

Agent 意图识别最容易被误解成一件事：

> 调用大模型，返回一个 intent label。

例如：

```json
{
  "intent": "send_email"
}
```

这在 Demo 里可以跑，但不适合生产系统。

因为真实用户输入往往不是单一分类，而是包含多意图、上下文、省略参数、用户修正、工具依赖和安全风险。

更科学的做法是：

> **不要把 Agent 意图识别做成分类器，而要做成可控决策入口。**

它的目标不是只判断“用户想做什么”，而是为后续的任务规划、工具路由、参数校验、安全控制和执行确认提供结构化输入。

---

## 一、核心原则

生产级 Agent 意图识别要遵守三个原则。

### 1. 不输出单标签，而输出结构化决策结果

单标签只能表达“像什么”，不能表达“怎么做”。

更合理的输出应该包含：

```text
1. 用户目标
2. 子任务
3. 工具候选
4. 缺失参数
5. 风险等级
6. 是否需要确认
7. 下一步动作
```

例如用户说：

> 帮我看看谁没交周报，顺便发邮件催一下。

系统不应该只返回：

```json
{
  "intent": "send_email"
}
```

而应该返回：

```json
{
  "tasks": [
    {
      "name": "query_weekly_report_status",
      "order": 1,
      "tool": "report_system"
    },
    {
      "name": "draft_reminder_email",
      "order": 2,
      "tool": "email_draft_tool"
    },
    {
      "name": "send_email",
      "order": 3,
      "tool": "email_sender",
      "side_effect": true,
      "need_user_confirmation": true
    }
  ],
  "next_action": "execute_until_confirmation"
}
```

这里的关键是：发邮件属于外部副作用操作，不能默认直接执行，必须先生成草稿，再让用户确认。

### 2. 简单请求轻量处理，复杂请求进入规划

不是所有请求都需要复杂 Agent 链路。

```text
简单请求：轻量 router
复杂请求：planner / supervisor
高危请求：安全策略 + 用户确认 / 人工审批
```

比如：

```text
今天上海天气怎么样？
```

可以直接路由到天气工具。

但下面这种请求：

```text
帮我把昨天的合同找出来，不对，还是先查查有没有风险条款。
```

就需要识别用户修正、定位合同、判断缺参、选择合同分析工具，并确认整个过程只读、不修改文件。

### 3. 大模型负责理解，不负责最终放行

LLM 适合做复杂语义理解、多意图拆解、参数抽取和结构化输出。

但是否允许执行，不能只由 LLM 决定。

删除数据、外部发送、财务操作、权限变更、生产配置修改、敏感数据导出，都必须经过确定性的安全策略和权限校验。

---

## 二、推荐架构

一个更稳的生产级方案可以分成六步：

```text
用户输入
  ↓
1. 输入预处理
  ↓
2. 规则与风险初筛
  ↓
3. 候选意图 / 候选工具召回
  ↓
4. LLM 结构化理解
  ↓
5. 权限与安全策略校验
  ↓
6. 决策汇总
  ↓
执行 / 追问 / 确认 / 审批 / 拒绝 / 降级
```

### 1. 输入预处理

处理语言、时间、指代、上下文、用户修正和输入边界。

例如“不对，还是”“刚才那个”“昨天的合同”都不是普通关键词，而是影响任务状态的重要信号。

### 2. 规则与风险初筛

规则层用于快速识别高置信信号，尤其是风险信号。

常见高风险动作包括：

```text
删除、转账、退款、发外部邮件、导出敏感数据、修改权限、修改生产配置
```

例如：

```json
{
  "risk_keyword": "删除",
  "data_type": "客户资料",
  "risk_level": "high"
}
```

这类判断不应该完全依赖大模型。

### 3. 候选意图 / 候选工具召回

当系统工具很多时，不要把所有工具都塞给 LLM。

应该先用规则、关键词、Embedding、轻量分类模型和权限过滤，召回少量候选工具。

这样可以降低成本、减少误选、缩短响应时间，也能避免无权限工具进入模型上下文。

### 4. LLM 结构化理解

LLM 负责把用户输入转成结构化任务：

```text
多意图拆解
任务顺序
参数抽取
缺参识别
工具选择
用户修正理解
```

输出必须走固定 schema，而不是让模型自由发挥。

### 5. 权限与安全策略校验

安全层不只返回允许或拒绝。

更实用的决策状态是：

```text
ALLOW：允许执行
CONFIRM_REQUIRED：需要用户确认
APPROVAL_REQUIRED：需要审批
DENY：拒绝执行
FALLBACK：降级为安全替代方案
```

比如用户要求删除客户资料，系统不应直接执行，可以降级为：

```text
生成待删除清单
分析影响范围
创建审批单
```

### 6. 决策汇总

最后把意图、任务、参数、工具、权限和风险合并成一个明确动作：

```text
EXECUTE：执行
CLARIFY：追问
CONFIRM：确认
APPROVAL：审批
DENY：拒绝
FALLBACK：降级
HANDOFF：转人工
```

---

## 三、结构化输出示例

用户输入：

> 帮我把昨天的合同找出来，不对，还是先查查有没有风险条款。

推荐输出：

```json
{
  "signals": {
    "has_self_correction": true,
    "time_reference": "昨天",
    "business_object": "合同"
  },
  "tasks": [
    {
      "name": "find_contract",
      "role": "supporting_task",
      "status": "needed",
      "reason": "risk_analysis_requires_target_file"
    },
    {
      "name": "analyze_contract_risk_terms",
      "role": "user_goal",
      "status": "active",
      "missing_info": ["target_contract"]
    }
  ],
  "safety": {
    "risk_level": "low",
    "decision": "ALLOW",
    "constraints": [
      "read_only",
      "no_external_send",
      "no_file_modification"
    ]
  },
  "next_action": "CLARIFY_OR_SEARCH"
}
```

注意这里没有把 `find_contract` 简单标记为取消。

用户取消的是“把合同找出来给我看”这个显式目标，但“查找合同”仍然可能是风险分析的内部依赖。

---

## 四、工程兜底

生产系统还必须补齐这些机制：

```text
1. Schema 校验：模型输出必须能被程序验证
2. 枚举约束：intent、tool、decision 不允许随意生成
3. 参数校验：类型、范围、必填字段都要检查
4. 权限过滤：无权限工具不能进入候选集
5. 执行确认：副作用操作必须确认或审批
6. 幂等控制：避免重复发送、重复扣款、重复删除
7. 审计日志：记录输入、决策、工具调用和确认链路
8. 降级策略：模型失败、超时或冲突时安全退出
```

这些能力比 prompt 更重要。

Prompt 决定模型怎么想，工程兜底决定系统能不能安全上线。

---

## 五、一句话总结

Agent 意图识别不是一道分类题，而是 Agent 执行链路的决策入口。

最科学的做法是：

> 用规则和召回缩小范围，用 LLM 做结构化理解，用权限和安全策略决定能不能执行，最后输出可执行、可审计、可拦截的行动计划。
