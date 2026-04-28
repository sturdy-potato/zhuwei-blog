---
title: "大模型 Tool Calls 到底在干什么：从一次请求讲清楚函数调用"
excerpt: "Tool Calls（函数调用）不是「让模型执行代码」，而是「让模型按约定输出一段结构化 JSON，然后由你的后端去执行」。本文把一次完整链路拆开，从 schema、请求、回调到并行调用，逐步讲清楚。"
pubDate: 2026-04-24
category: "AI / Function Calling"
section: "技术专栏"
tags:
  - AI
  - LLM
  - Tool Calls
  - Function Calling
  - OpenAI
  - Claude
  - Agent
  - 后端开发
color: "purple"
icon: "🤖"
minutes: 14
views: 0
comments: 0
draft: false
---

做大模型相关的后端，迟早都会撞上一个词：**Tool Calls**（有的地方叫 Function Calling）。

它常见的名字有这么几个：

* OpenAI：`tools` / `tool_calls`
* Anthropic Claude：`tools` / `tool_use`
* Google Gemini：`functionDeclarations` / `functionCall`

名字不太一样，但背后都是**同一件事**。

这篇文章不打算堆概念，只想把一件事讲清楚：

> **大模型的 Tool Calls 到底在干什么？它在哪一步决定调用、谁来执行、结果怎么回去？**

把这条链路看懂，你再去读 SDK 文档，就不会被各种字段绕晕。

---

## 先澄清一个最大的误解

很多人第一次听”函数调用”会以为：

> **大模型自己能执行代码、自己去调 API、自己查数据库。**

**不是。**

大模型本身是一个文本模型，它**只会输出文字**。

Tool Calls 的真实含义是：

1. 你事先告诉模型：「这是我有的几个工具（函数），它们的名字、参数、用途是什么」。
2. 模型在回答时，如果认为「这件事我不应该自己瞎编，应该让后端去查真实数据」，就会输出一段**结构化的 JSON**，里面包含工具名和参数。
3. **真正的执行**还是你的后端代码在做：调 API、查库、跑脚本。
4. 执行完后，你再把结果作为一条新消息喂给模型，模型再基于这个结果生成最终回复。

一句话总结：

> **模型负责”判断该调哪个工具、该传什么参数”，你的后端负责”真的去执行、把结果拿回来再交给模型”。**

整件事的本质，是**把自然语言翻译成一次结构化的函数调用**，仅此而已。

---

## 一次 Tool Call 的完整链路

用一个最常见的例子：用户问「北京今天几度？」。

系统里注册了一个工具：`get_weather(city: string, unit: "c" | "f")`。

完整链路如下：

### Step 1｜前端/客户端发起请求

你向模型 API 发送一条消息：

```
{
  "model": "gpt-4.1",
  "messages": [
    { "role": "user", "content": "北京今天几度？" }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "查询某个城市当前天气，返回温度与天气描述",
        "parameters": {
          "type": "object",
          "properties": {
            "city":  { "type": "string", "description": "城市名，中英文都可以" },
            "unit":  { "type": "string", "enum": ["c", "f"], "default": "c" }
          },
          "required": ["city"]
        }
      }
    }
  ]
}
```

注意几个点：

* `tools` 是**这次对话可用的工具列表**，不是调用本身。
* `description` 和 `parameters` 是模型用来判断「什么时候该调、怎么传参」的**唯一依据**——它看不到你的实现，只看声明。
* 参数类型用 **JSON Schema** 描述。enum、required、default 它都能识别。

### Step 2｜模型返回一次 tool\_call，而不是回答

模型这一轮**不会直接回答用户**，它会返回类似：

```
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\":\"北京\",\"unit\":\"c\"}"
      }
    }
  ]
}
```

关键字段：

* `content: null`：模型没给用户一句”正文”，因为它决定先调工具。
* `tool_calls[].id`：这一次调用的唯一 ID，后面回传结果要用。
* `arguments`：一段**字符串化的 JSON**，里面是它想传的参数。

到这里为止，**没有任何代码被执行**。模型只是告诉你：“我建议你用这些参数去调 `get_weather`”。

### Step 3｜你的后端真正去执行

你读出 `tool_calls`，根据 `function.name` 分发到你自己的代码里：

```
// 伪代码
switch call.Function.Name {
case "get_weather":
    var args struct {
        City string `json:"city"`
        Unit string `json:"unit"`
    }
    json.Unmarshal([]byte(call.Function.Arguments), &args)
    result, err := weather.Query(args.City, args.Unit)
    // ...
}
```

这一步**完全在你这边跑**：你连什么数据库、调什么第三方、做哪些鉴权，模型都不知道，也不该知道。

### Step 4｜把工具的结果作为一条新消息回传

执行完之后，你再发起一次请求，把整个上下文连同工具结果一起传回去：

```
{
  "model": "gpt-4.1",
  "messages": [
    { "role": "user", "content": "北京今天几度？" },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [ /* 上一步那段 */ ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "{\"city\":\"北京\",\"temp\":14,\"desc\":\"多云\"}"
    }
  ],
  "tools": [ /* 保持一致 */ ]
}
```

注意：

* 新增了一条 `role: "tool"` 的消息，`tool_call_id` 必须对上 Step 2 里的 `id`。
* `content` 通常是 JSON 字符串，也可以是纯文本，取决于你想怎么给模型看。

### Step 5｜模型产出最终自然语言回复

这一次模型有真实数据了，输出就会是：

```
{
  "role": "assistant",
  "content": "北京今天 14°C，多云，出门可以穿个薄外套。"
}
```

整条链路就结束了。

用一张心智图概括：

> **用户 → 模型（判断要不要调工具）→ 你的后端（真的去执行）→ 把结果回传模型 → 模型写回答 → 用户**

模型在这里扮演的其实是**一个更聪明的路由器**，而不是执行者。

---

## 工具声明（JSON Schema）该怎么写

Tool Calls 的效果好坏，**一半取决于 schema 写得够不够克制、够不够准确**。

几条经验：

### 1\. description 要写「什么时候该调这个工具」

不要写”这个工具用来查天气”，要写：

> “当用户询问**某个具体城市**的**当前天气、温度、降水概率**时使用。不要用于历史天气或预测。”

模型是按这段话判断”要不要触发”的。模糊的描述 \= 随便触发 / 从不触发。

### 2\. 参数要严格

能用 `enum` 就不要用自由字符串：

```
"unit": { "type": "string", "enum": ["c", "f"] }
```

能用 `integer` 就不要用 `string`。给默认值、给范围、给 `required`，都帮模型少犯错。

### 3\. 一个工具只做一件事

不要搞”万能工具” `do_anything(action, params)`。模型会被你搞得很混乱，最后它宁愿不调。

拆成 `create_order / cancel_order / search_order` 这种**动词明确的小工具**，命中率会高得多。

### 4\. 工具数量不要爆

理论上一次可以塞几十个工具，但：

* 工具越多，上下文越长，成本越高。
* 工具越多，模型越容易挑错那个。

业界比较稳的做法是**分层**：先让一个”调度模型”选定一个工具组，再把该组工具传给”执行模型”。

---

## 多轮对话里的 Tool Calls

真实场景很少是一次就搞定，经常是**模型连着调几次工具**才能回答。

比如用户问：“帮我查一下北京今天的天气，然后根据天气推荐一下晚饭吃什么。”

模型可能：

1. 先调 `get_weather("北京")` → 得到 14°C 多云。
2. 再调 `search_recipes(weather="cold", mood="cozy")` → 得到几个菜谱。
3. 最后综合起来写一段回答。

工程上这叫**Tool Calling Loop**，伪代码一般是：

```
while True:
    resp = llm.chat(messages, tools=tools)
    if resp.tool_calls:
        for call in resp.tool_calls:
            result = dispatch(call)  # 执行真正的函数
            messages.append(tool_result_message(call.id, result))
        continue
    else:
        return resp.content  # 终于不调工具了，模型给出正文
```

几个需要注意的工程点：

* **循环必须有上限**，比如最多 8 轮。不然模型可能在自家搭的工具里反复横跳，直接把钱烧完。
* **每一轮的 token 成本都会累加**，因为上下文越来越长（所有历史 tool\_call \+ tool\_result 都要传回去）。
* **并行调用要支持**（见下一节），不然 3 次串行调用就是 3 倍延迟。

---

## 并行工具调用（Parallel Tool Calls）

现代的模型（GPT\-4\.1、Claude 3\.5\+、Gemini 2\.5\+）都支持**一轮里返回多个 tool\_call**。

典型场景：用户问”北京和上海今天分别几度？”

模型会一次性吐出：

```
"tool_calls": [
  { "id": "call_1", "function": { "name": "get_weather", "arguments": "{\"city\":\"北京\"}" }},
  { "id": "call_2", "function": { "name": "get_weather", "arguments": "{\"city\":\"上海\"}" }}
]
```

你应该**并发执行这两个调用**，然后把两条 `role: "tool"` 消息一起回传：

```
[
  { "role": "tool", "tool_call_id": "call_1", "content": "..." },
  { "role": "tool", "tool_call_id": "call_2", "content": "..." }
]
```

顺序不重要，**ID 对得上就行**。

如果你偷懒串行跑，那支持并行的意义就丢光了。

---

## 不同模型家族的差异（简要对照）

三家的设计思路其实很像，只有字段名不同：

| 维度 | OpenAI | Anthropic Claude | Google Gemini |
| --- | --- | --- | --- |
| 工具声明字段 | `tools` | `tools` | `tools.functionDeclarations` |
| 模型输出的调用 | `tool_calls` | `content` 里的 `tool_use` 块 | `functionCall` |
| 回传结果的角色 | `role: "tool"` | `content` 里的 `tool_result` 块 | `functionResponse` |
| 并行调用 | 支持 | 支持 | 支持 |
| 强制调工具 | `tool_choice` | `tool_choice` | `tool_config.function_calling_config.mode` |

实际工程里，除非你要极致压榨某一家，否则建议**自己在后端封一层统一的 tool schema**，然后针对不同 provider 做一次轻量适配。这样换模型不等于重写业务。

---

## 真正会踩的几个坑

这些都是我和团队实际踩过的。

### 1\. 把 `arguments` 当 JSON 对象处理

OpenAI 返回的 `arguments` **是字符串**，不是 JSON 对象。

必须：

```
args = json.loads(tool_call.function.arguments)
```

如果模型偶尔返回了不合法 JSON，要**兜底**，别让一个 parse 异常把整个对话打挂。常见做法：try/except 后把错误信息塞进 tool\_result 再喂回去，让模型自己重试一次。

### 2\. 工具执行失败后一定要回传错误

**不要抛异常就结束对话**。应该像这样：

```
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "{\"error\":\"city not found\",\"message\":\"unknown city: 火星\"}"
}
```

模型拿到错误会自己换策略——要么换参数再调一次，要么直接告诉用户。

### 3\. 不要在工具参数里塞敏感信息

模型会把参数**原样记录在上下文里**，后续所有请求都会再发一遍。

不要在参数里放：

* 密码 / token
* 用户的完整手机号 / 身份证
* 内部系统的完整 URL

**敏感信息应该在你的后端查出来，然后在 tool\_result 里有控制地给回去**，而不是让模型自己拼到 arguments 里。

### 4\. tool\_call\_id 不对会直接报错

我见过太多次：前端/网关层把历史消息截断，但没把对应的 `role: "tool"` 一起带上，导致模型看到了 `tool_calls` 却没有它们的结果，直接 400。

截历史时务必**成对处理**：一个 `assistant.tool_calls` \+ 它的每一条 `role: "tool"` 必须一起保留或一起丢。

### 5\. 流式（stream）下 arguments 是分片拼出来的

开启 streaming 后，`arguments` 不是一次性吐完的，而是一段段 delta。

你要**缓存一个 string buffer，全部拼完再 `json.loads`**，别一边来一边 parse。

---

## 什么时候不要用 Tool Calls

Tool Calls 很好用，但它**不是银弹**。

### 场景 1：问答本身模型就能答

“1 \+ 1 等于几”、“React useEffect 干嘛的”，这种**不涉及实时数据、不涉及你系统状态**的问题，硬要走 tool call 只是白白增加延迟和成本。

### 场景 2：结构化抽取

如果你只是想让模型**把一段文本抽成 JSON**（比如从简历里提取姓名/学历），更合适的是 **JSON Mode / Structured Output**，而不是 Tool Calls。

Tool Calls 的假设是”可能调、可能不调、可能多调几次”，而结构化抽取是”一定要输出这么一个对象”。两者意图不一样。

### 场景 3：极短延迟要求

Tool Calls 的最低链路是 **2 次模型调用 \+ 1 次工具执行**。如果你做的是 100ms 以内必须响应的场景，直接写规则或调 API 更合适。

---

## 一个可落地的最小示例（Node.js）

用 OpenAI SDK 举个最小完整示例：

```
import OpenAI from "openai";
const client = new OpenAI();

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "查询某个城市当前天气",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          unit: { type: "string", enum: ["c", "f"], default: "c" }
        },
        required: ["city"]
      }
    }
  }
];

async function dispatch(call) {
  const args = JSON.parse(call.function.arguments);
  if (call.function.name === "get_weather") {
    return { city: args.city, temp: 14, desc: "多云" };
  }
  return { error: "unknown tool" };
}

async function chat(userInput) {
  const messages = [{ role: "user", content: userInput }];
  for (let i = 0; i < 5; i++) {
    const resp = await client.chat.completions.create({
      model: "gpt-4.1",
      messages,
      tools
    });
    const msg = resp.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) return msg.content;

    for (const call of msg.tool_calls) {
      const result = await dispatch(call);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }
  throw new Error("tool loop exceeded");
}

console.log(await chat("北京今天几度？"));
```

核心就三件事：

1. 把工具声明给模型。
2. 循环：模型要调工具就执行、回填结果；不调就返回正文。
3. 循环次数**必须**有上限。

---

## 总结

Tool Calls 本质上不是”让大模型变得更强”，而是：

> **把大模型从一个”全凭 prompt 拼凑”的文本生成器，变成一个「能决定何时交给真正系统去做事」的调度者。**

关键要记住的几点：

1. 模型**不执行代码**，它只输出”我建议调这个工具、带这些参数”。
2. 真正的执行 / 安全 / 鉴权 / 审计，全都在**你的后端**这边。
3. Schema 写得越克制、描述越精确，工具命中率越高。
4. 工程上必须支持**多轮 \+ 并行**，但要给循环加上限。
5. 敏感信息不要进 arguments，它会一直躺在上下文里。

把这五点想清楚，再去看 OpenAI / Anthropic / Gemini 的文档，就是在对同一个模型**换着马甲读三遍**，不会再乱。

---

## 参考资料

* OpenAI Function Calling 官方文档
* Anthropic Tool Use 官方文档
* Google Gemini Function Calling 官方文档
