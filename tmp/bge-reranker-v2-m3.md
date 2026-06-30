# 为什么我最终选择服务器部署 BAAI/bge-reranker-v2-m3 做 RAG 重排

最近在做知识库问答和 RAG 检索链路时，我遇到一个很典型的问题：向量召回能把“可能相关”的内容找出来，但它不一定能把“最应该给大模型看的内容”排在最前面。

一开始我以为只要 embedding 模型够强，检索效果就差不到哪里去。但实际接入文档、PRD、技术资料之后发现，单靠向量召回还是会有一些明显问题：

* 语义相近但答案无关的片段会被召回；
* 长文档切 chunk 之后，局部片段相似度高，但上下文价值不一定高；
* 用户问题比较具体时，embedding 可能召回“主题相关”，但不是“答案相关”的内容；
* TopK 召回数量开大以后，给 LLM 的上下文噪声变多，回答更容易跑偏。

所以我最终决定在 RAG 链路里增加一个 ReRank 模型，并选择在服务器上部署 `BAAI/bge-reranker-v2-m3`。

## 一、ReRank 模型到底解决什么问题？

一个典型的 RAG 检索流程大概是这样：

```text
用户问题
  ↓
Embedding 向量召回 TopK 文档片段
  ↓
ReRank 对候选片段重新排序
  ↓
取最相关的 TopN 片段
  ↓
交给大模型生成回答
```

Embedding 模型的作用是“粗召回”。它会把文本转成向量，然后通过向量相似度找出一批可能相关的内容。

ReRank 模型的作用是“精排”。它不会单独把文本转成向量，而是直接把「用户问题」和「候选文档片段」作为一组输入，然后输出一个相关性分数。`BAAI/bge-reranker-v2-m3` 的模型页也明确说明，reranker 和 embedding 模型不同，reranker 输入的是 query 和 passage，并直接输出相似度分数，而不是 embedding 向量。

简单理解：

```text
Embedding：先找出一批大概相关的
ReRank：再判断这批里面谁最相关
```

这一步看似简单，但对 RAG 最终效果影响很大。因为大模型最后回答时，并不是看整个知识库，而是看你塞进上下文窗口里的那几个 chunk。只要这几个 chunk 选错，后面模型再强也容易答偏。

## 二、为什么选择 BAAI/bge-reranker-v2-m3？

我选择 `BAAI/bge-reranker-v2-m3`，主要基于几个原因。

第一，它是一个专门用于重排的 cross-encoder 模型。vLLM 文档里也把 cross-encoder，也就是 reranker，定义为接收两个 prompt 输入并输出单一分数的分类模型。 这正好符合 RAG 里面「query + document → relevance score」的需求。

第二，它比较轻。BGE 官方文档标注 `BAAI/bge-reranker-v2-m3` 是 multilingual 模型，参数量为 568M，模型大小约 2.27GB，并描述为轻量、具备较强多语言能力、易部署、推理快。

第三，它对中文场景比较友好。BGE 官方文档建议，在多语言场景可以使用 `BAAI/bge-reranker-v2-m3`；在中文或英文场景，也可以使用 `BAAI/bge-reranker-v2-m3`。 对于中文知识库、飞书文档、PRD、技术文档来说，这一点比较重要。

第四，它生态成熟。`FlagEmbedding` 官方仓库将 `BAAI/bge-reranker-v2-m3` 描述为一个轻量 cross-encoder 模型，具备较强多语言能力、易部署、推理快。 这意味着它不是一个只能看不能用的模型，而是有比较完整的推理、部署和使用路径。

## 三、它和 bge-m3 是什么关系？

很多人会混淆 `bge-m3` 和 `bge-reranker-v2-m3`。

`bge-m3` 是 embedding 模型，主要负责把文本转成向量，用于向量检索。FlagEmbedding 文档中对 `BAAI/bge-m3` 的描述是：多语言、多功能、多粒度，支持 dense retrieval、sparse retrieval、multi-vector retrieval，并支持 8192 tokens 输入。

而 `bge-reranker-v2-m3` 是 reranker 模型，主要负责对已经召回的候选片段重新排序。

两者不是替代关系，而是配合关系：

```text
bge-m3：负责召回
bge-reranker-v2-m3：负责重排
```

如果只用 embedding，系统可能能找到“主题相关”的内容；加上 reranker 之后，系统更容易找到“真正能回答当前问题”的内容。

## 四、为什么最终选择服务器部署？

`BAAI/bge-reranker-v2-m3` 不是不能本地跑。它 568M 的参数量并不算特别大，本地 CPU 也可以强推。但在实际项目里，我最终还是倾向于放到服务器上部署，原因很现实。

第一，本地部署适合体验，不适合作为稳定服务。开发机上同时跑 IDE、浏览器、Docker、数据库、知识库服务、LLM 客户端，很容易出现资源争抢。Reranker 虽然比大语言模型轻，但它是 cross-encoder，每个 query 都要和多个候选 chunk 组成 pair 逐个打分。召回 Top20，就意味着至少要打 20 组分数。

第二，服务器部署更方便统一接入。RAG 系统一般不是一个脚本，而是一条服务链路：embedding、向量库、rerank、大模型、知识库 API、前端对话接口都要串起来。把 reranker 独立成一个 HTTP 服务后，后续无论是 WeKnora、LangChain、FastAPI，还是自研知识库服务，都可以通过接口调用。

第三，服务器部署更容易控制性能参数。比如可以统一限制：

```text
召回 TopK：20
Rerank TopN：20
最终给 LLM：3 ~ 5 个 chunk
max_length：512 或 1024
batch_size：按显存调整
```

这样既能提升检索质量，又不会让 reranker 成为系统瓶颈。

第四，后续更容易扩展。如果本地体验后发现效果不错，可以继续把 reranker 服务化、容器化，再接入监控、日志和限流。这样它就不只是一个测试模型，而是 RAG 系统里的正式组件。

## 五、推荐的部署方式

`BAAI/bge-reranker-v2-m3` 可以通过 `FlagEmbedding` 使用。官方模型页给出的示例是使用 `FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=True)` 加载模型，然后通过 `compute_score` 对 query 和 passage 打分；也可以设置 `normalize=True` 将分数映射到 0 到 1 的范围。

最小使用方式大概是：

```python
from FlagEmbedding import FlagReranker

reranker = FlagReranker(
    "BAAI/bge-reranker-v2-m3",
    use_fp16=True
)

pairs = [
    ["什么是 ReRank 模型？", "ReRank 模型用于对召回结果进行二次排序。"],
    ["什么是 ReRank 模型？", "MySQL 的行锁用于控制并发事务。"]
]

scores = reranker.compute_score(pairs, normalize=True)
print(scores)
```

如果要服务化，可以在外面包一层 FastAPI，对外暴露一个 `/rerank` 接口。

如果想走更标准的推理服务，也可以考虑 vLLM。vLLM 文档说明 scoring 模型支持 `/score`、`/v1/score`，以及 Cohere 风格的 `/rerank`、`/v1/rerank`、`/v2/rerank` API，并且支持 `BAAI/bge-reranker-v2-m3` 这类 XLM-RoBERTa based cross-encoder 模型。

部署思路可以是：

```bash
vllm serve BAAI/bge-reranker-v2-m3 \
  --runner pooling \
  --host 0.0.0.0 \
  --port 8000
```

然后上层 RAG 服务只需要把 query 和候选 documents 发给 reranker 服务，拿到重排后的结果即可。

## 六、实际使用时要注意什么？

使用 reranker 时，不建议把所有文档都交给它处理。正确做法是：

```text
先用 embedding 召回 TopK
再用 reranker 精排 TopK
最后取 TopN 给 LLM
```

比较稳妥的初始配置是：

```text
向量召回 TopK：20
Rerank 输入数量：20
最终入上下文：3 ~ 5
chunk 长度：500 ~ 1000 中文字
max_length：512 或 1024
```

不要一开始就把 TopK 设置成 100，也不要把每个 chunk 切得特别长。因为 reranker 是对「query + passage」逐组打分，候选数量越多、文本越长，推理成本越高。

另外，reranker 不是用来替代 embedding 的。它不适合负责全库召回。它的最佳位置是在向量召回之后，对少量候选结果做精细排序。

## 七、最终结论

我最终选择服务器部署 `BAAI/bge-reranker-v2-m3`，不是因为它是最强的 reranker，而是因为它在当前阶段最均衡：

```text
能力够用
中文友好
模型不算太重
部署资料成熟
可以本地验证，也可以服务器服务化
适合作为 RAG 检索链路的精排模块
```

对于一个知识库问答系统来说，LLM 决定了回答表达能力，embedding 决定了能不能召回候选资料，而 reranker 决定了最终交给 LLM 的资料质量。

如果把 RAG 比作查资料写答案：

```text
Embedding 像是先从书架上找出 20 本可能相关的书；
Reranker 像是再翻目录和段落，挑出最该看的 3 页；
LLM 才是最后根据这 3 页组织语言回答问题。
```

所以在 RAG 系统里，ReRank 不是锦上添花，而是从“能搜到”走向“搜得准”的关键一步。

对我目前的场景来说，`BAAI/bge-reranker-v2-m3` 是一个比较务实的选择：先用它把检索质量拉上来，再根据后续并发、延迟和效果评估决定是否升级到更大的 reranker 模型。
