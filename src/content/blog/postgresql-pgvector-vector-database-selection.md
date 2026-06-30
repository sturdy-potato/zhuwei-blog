---
title: "为什么我先用 PostgreSQL + pgvector 做向量库，而不是直接上专业向量数据库"
excerpt: "pgvector 不是所有向量检索场景的最优解，但在中小规模 RAG、图片相似检索和业务强过滤场景中，它可以用更低的工程复杂度完成向量存储和相似度检索。"
pubDate: 2026-04-26
category: "向量检索"
section: "AI工程"
tags:
  - "AI"
  - "向量数据库"
  - "PostgreSQL"
  - "pgvector"
  - "RAG"
  - "Milvus"
  - "Qdrant"
color: "purple"
icon: "Database"
minutes: 8
views: 0
comments: 0
draft: false
---

在做 RAG、图片相似检索、商品图查重时，很容易遇到一个选型问题：

> 向量数据到底应该放在哪里？

常见选择有两类：

1. 使用 PostgreSQL + pgvector
2. 使用专业向量数据库，例如 Milvus、Qdrant、Weaviate、Pinecone 等

如果只看“向量检索能力”，专业向量数据库当然更专门。
但如果从工程落地、业务查询、系统复杂度和维护成本看，PostgreSQL + pgvector 在很多早期项目里反而更合适。

我的判断是：

> 如果系统还在 MVP 或中小规模阶段，并且业务数据本来就在 PostgreSQL 里，优先使用 PostgreSQL + pgvector 是一个务实选择。

---

## 1. pgvector 是什么

pgvector 是 PostgreSQL 的一个向量扩展。

它让 PostgreSQL 可以存储向量字段，并支持向量相似度检索。

例如，可以创建一个带向量字段的表：

```sql
CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP DEFAULT NOW()
);
```

查询时可以按向量距离排序：

```sql
SELECT
    id,
    document_id,
    chunk_text,
    embedding <=> :query_embedding AS distance
FROM document_chunks
ORDER BY embedding <=> :query_embedding
LIMIT 10;
```

如果是图片相似检索，也可以这样设计：

```sql
CREATE TABLE goods_image_vectors (
    id BIGSERIAL PRIMARY KEY,
    goods_id BIGINT NOT NULL,
    merchant_id BIGINT,
    brand_id BIGINT,
    category_id BIGINT,
    image_url TEXT NOT NULL,
    image_md5 VARCHAR(64),
    embedding VECTOR(768),
    created_at TIMESTAMP DEFAULT NOW()
);
```

这时 PostgreSQL 不只是关系型数据库，也承担了一部分向量检索能力。

---

## 2. 为什么不是一开始就上专业向量数据库

专业向量数据库的能力更完整，但它也会带来额外复杂度。

例如你原来的业务数据在 PostgreSQL 里：

```text
goods_info
goods_image_vectors
documents
document_chunks
users
orders
categories
brands
merchants
```

如果再引入一个单独的向量数据库，就会多出一套同步链路：

```text
PostgreSQL 业务数据
  -> 数据同步任务
  -> 向量化服务
  -> 向量数据库
  -> 检索服务
  -> 再回查 PostgreSQL
```

这会带来几个问题：

1. 数据要写两份
2. 向量库和业务库可能不一致
3. 删除、更新、回滚要额外处理
4. 查询结果经常还要回 PostgreSQL 补业务字段
5. 系统部署和监控多一个组件
6. 排查问题链路更长

如果项目还没有进入大规模阶段，这些复杂度可能大于收益。

---

## 3. PostgreSQL + pgvector 的优势

### 3.1 架构简单

使用 PostgreSQL + pgvector，最大的好处是简单。

原来系统已经有 PostgreSQL，只需要增加扩展和向量字段：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

然后建表、写入 embedding、创建索引即可。

整体链路可以变成：

```text
原始数据
  -> 切块 / 图片处理
  -> 模型生成向量
  -> 写入 PostgreSQL
  -> SQL 查询召回
```

相比单独引入向量数据库，组件更少，部署更轻，排查问题也更直接。

---

### 3.2 业务过滤更自然

很多向量检索不是纯粹的“找最相似”，而是“在某个业务范围内找最相似”。

例如商品图片检索：

```text
只查同类目
只查同品牌
排除当前商户
只查已上架商品
只查最近 30 天新增商品
```

如果向量和业务字段都在 PostgreSQL 里，可以直接写 SQL：

```sql
SELECT
    goods_id,
    image_url,
    embedding <=> :query_vector AS distance
FROM goods_image_vectors
WHERE category_id = :category_id
  AND brand_id = :brand_id
  AND merchant_id <> :current_merchant_id
ORDER BY embedding <=> :query_vector
LIMIT 20;
```

这种查询方式对后端工程师很友好。

不需要先查向量库，再拿一批 ID 回 PostgreSQL 二次过滤。
也不需要为每种业务条件额外设计复杂同步字段。

---

### 3.3 事务一致性更好处理

业务系统经常有新增、修改、删除。

例如：

```text
商品下架
文档删除
知识库权限变更
图片替换
商户数据隔离
```

如果向量数据和业务数据都在 PostgreSQL，可以放在同一个数据库体系里处理。

例如删除一篇文档时，可以同时删除它的 chunk 和 embedding：

```sql
DELETE FROM document_chunks
WHERE document_id = :document_id;
```

如果使用独立向量数据库，就要考虑：

```text
PostgreSQL 删除成功，但向量库删除失败怎么办？
向量库删除成功，但业务库事务回滚怎么办？
同步任务延迟期间，是否会查到脏数据？
```

这些都不是不能解决，但会增加工程成本。

---

### 3.4 适合中小规模检索

对于早期 RAG 系统，数据规模可能只是：

```text
几千篇文档
几十万 chunk
几十万张图片
百万级向量
```

这个规模下，PostgreSQL + pgvector 通常可以支撑验证和早期生产。

尤其是当查询 QPS 不高，业务过滤条件比较明确时，没有必要一开始就引入重型向量数据库。

更重要的是，很多系统早期瓶颈并不在向量数据库，而在：

```text
文档清洗
切块策略
embedding 模型选择
召回评估
rerank
权限过滤
业务规则
```

在这些问题没有解决前，过早上复杂向量库，收益有限。

---

### 3.5 运维成本低

PostgreSQL 是成熟的数据库。
备份、恢复、权限、监控、慢查询分析、连接池、主从复制，这些能力很多团队已经有现成经验。

如果使用 pgvector，仍然可以沿用原来的 PostgreSQL 运维体系。

而专业向量数据库通常需要额外学习：

```text
collection 管理
segment / shard 管理
索引构建
数据压缩
副本机制
导入导出
监控指标
集群扩容
```

对小团队来说，这些都是实际成本。

---

## 4. PostgreSQL + pgvector 的劣势

pgvector 的优势是简单，但它不是万能方案。

### 4.1 极大规模数据不是它的强项

如果向量规模达到千万、亿级，并且查询并发很高，专业向量数据库通常更合适。

因为专业向量库通常围绕大规模向量检索做了更多设计，例如：

```text
分布式存储
分片
副本
批量导入
压缩
高吞吐查询
向量索引优化
集群扩容
```

PostgreSQL 也能做分区、调参、优化，但它毕竟不是专门为海量向量检索设计的系统。

---

### 4.2 高并发向量检索压力更大

向量检索是计算密集型任务。
如果大量请求同时执行相似度搜索，会给数据库带来明显压力。

这时 PostgreSQL 同时承担：

```text
业务查询
事务写入
向量检索
索引维护
```

可能会互相影响。

专业向量数据库的一个优势是可以把向量检索压力从主业务数据库中拆出去。

这在高并发系统里很重要。

---

### 4.3 向量索引调优能力有限

pgvector 支持向量索引，例如 HNSW、IVFFlat。
但专业向量数据库通常会提供更多围绕向量场景的调优能力。

例如：

```text
索引参数管理
召回率和延迟权衡
分布式索引构建
批量导入优化
量化压缩
多副本查询
混合检索优化
```

如果系统对召回率、延迟、吞吐都有很高要求，专业向量库的优势会更明显。

---

### 4.4 数据库职责可能变重

PostgreSQL 原本已经承担业务数据存储。

如果再把大量向量数据、向量索引、相似度搜索都放进去，数据库职责会变重。

这会带来几个风险：

```text
表体积快速膨胀
索引体积变大
备份恢复时间变长
写入和索引维护变慢
业务查询被向量查询拖慢
```

所以使用 pgvector 时，要控制边界。
它适合起步和中等规模，不代表可以无限堆数据。

---

## 5. 专业向量数据库的优势

专业向量数据库适合更大规模、更高并发、更复杂的向量检索场景。

典型优势包括：

### 5.1 更适合大规模向量检索

如果数据规模是：

```text
千万级向量
亿级向量
多模态向量
高并发在线检索
多租户向量服务
```

专业向量库通常更合适。

例如 Milvus、Qdrant 这类系统，本身就是围绕向量搜索、索引构建、分布式扩展设计的。

---

### 5.2 更适合独立向量服务

当向量检索已经变成系统核心能力时，单独拆出向量服务是合理的。

例如：

```text
多个业务系统共用一个向量检索服务
文本、图片、视频都要做向量检索
召回服务需要独立扩容
需要单独监控召回延迟和召回率
向量数据量增长很快
```

这时继续放在 PostgreSQL 里，可能会限制系统演进。

---

### 5.3 更适合高性能 ANN 检索

ANN 是 Approximate Nearest Neighbor，也就是近似最近邻搜索。

专业向量数据库通常会围绕 ANN 做更多优化，用来平衡：

```text
召回率
查询延迟
索引体积
写入速度
内存占用
过滤条件
```

对于搜索、推荐、广告、风控这类高 QPS 场景，这些能力很重要。

---

## 6. 专业向量数据库的劣势

专业向量数据库也有成本。

### 6.1 系统复杂度增加

引入专业向量库后，系统通常会变成：

```text
业务数据库：PostgreSQL / MySQL
向量数据库：Milvus / Qdrant / Weaviate
模型服务：Embedding / 图片向量化
同步任务：负责业务数据和向量数据同步
检索服务：聚合向量结果和业务数据
```

链路变长后，排查问题会更复杂。

---

### 6.2 数据一致性需要额外处理

专业向量库通常不直接存完整业务数据。
它更多存的是：

```text
id
embedding
metadata
payload
```

最终展示结果往往还要回业务库查详情。

这时就需要处理同步一致性：

```text
新增时是否同步成功
更新时是否覆盖旧向量
删除时是否清理向量
业务库和向量库 ID 是否一致
同步失败是否重试
```

如果这些机制没有做好，搜索结果可能查到已删除或已下架的数据。

---

### 6.3 业务过滤和复杂查询未必更方便

专业向量库通常支持 metadata filter。
但如果业务查询非常复杂，比如：

```text
多表 join
复杂权限
多级类目
商户状态
品牌状态
活动状态
库存状态
价格区间
用户可见范围
```

PostgreSQL 的 SQL 表达能力更自然。

如果强行把所有业务过滤字段都同步到向量数据库，metadata 会越来越重。
这会让向量库逐渐承担一部分业务数据库职责，系统边界反而变模糊。

---

## 7. 选型对比

| 对比项     | PostgreSQL + pgvector | 专业向量数据库                             |
| ------- | --------------------- | ----------------------------------- |
| 部署复杂度   | 低，基于现有 PostgreSQL     | 较高，需要新增组件                           |
| 运维成本    | 低，沿用 PostgreSQL 体系    | 较高，需要单独运维                           |
| 业务过滤    | 强，SQL 天然支持            | 支持 metadata filter，但复杂业务查询不如 SQL 自然 |
| 事务一致性   | 好处理                   | 需要同步机制保证一致性                         |
| 大规模向量检索 | 中等规模更合适               | 更适合千万级、亿级                           |
| 高并发检索   | 容易影响业务库               | 可以独立扩容                              |
| 索引能力    | 能用，但能力相对有限            | 更专门，调优能力更强                          |
| 系统演进    | 适合 MVP 和早期生产          | 适合向量检索成为核心服务后                       |
| 开发效率    | 高，后端直接写 SQL           | 中等，需要适配 SDK 和查询模型                   |
| 数据回查    | 通常不需要额外回查             | 经常需要回业务库补详情                         |

---

## 8. 怎么判断该选哪个

可以按下面这个规则判断。

### 8.1 优先选 PostgreSQL + pgvector 的情况

如果符合这些条件，可以先用 pgvector：

```text
业务数据本来就在 PostgreSQL
数据规模在百万级以内
查询 QPS 不高
业务过滤条件比较多
团队不想增加新组件
系统还在 MVP 或早期生产阶段
RAG 效果还在验证
图片检索还在验证阈值和召回质量
```

这时优先目标不是追求极限性能，而是快速跑通闭环。

---

### 8.2 优先选专业向量数据库的情况

如果出现这些情况，就应该考虑专业向量库：

```text
向量规模达到千万级以上
查询 QPS 很高
向量检索已经影响 PostgreSQL 主库
需要独立扩容检索服务
需要多副本和高可用
需要支持多个业务共用向量检索
需要更强的 ANN 调优能力
需要处理文本、图片、视频等多模态大规模检索
```

这时向量检索已经不是普通功能，而是基础设施。
单独拆出专业向量数据库更合理。

---

## 9. 我的建议

实际项目里，不建议一开始就追求“最专业”的方案。

更稳妥的路线是：

```text
第一阶段：PostgreSQL + pgvector
  -> 快速验证模型、切块、召回、阈值、业务过滤

第二阶段：pgvector 优化
  -> 加 HNSW / IVFFlat 索引
  -> 加业务字段索引
  -> 做分区
  -> 做批量写入和异步向量化

第三阶段：专业向量数据库
  -> 当数据规模、QPS、扩展性成为主要瓶颈时再迁移
```

这样做的好处是：
前期不用承担太多架构复杂度，后期也保留迁移空间。

不要把向量数据库选型看成一次性决定。
更合理的方式是让系统随着数据规模和业务压力演进。

---

## 10. 结论

PostgreSQL + pgvector 的核心价值不是“比专业向量数据库更强”，而是：

```text
足够好
足够简单
足够贴近业务
足够容易落地
```

对于很多 RAG、图片相似检索、商品图查重和企业知识库系统来说，早期真正重要的是：

```text
数据清洗是否干净
切块是否合理
embedding 模型是否合适
top-k 召回是否稳定
业务过滤是否准确
结果是否可解释
```

这些问题没有解决前，直接上专业向量数据库，不一定能带来明显收益。

我的选型建议是：

> 中小规模、业务过滤强、团队已有 PostgreSQL：先用 pgvector。
> 数据量大、高并发、向量检索成为核心基础设施：再上专业向量数据库。

技术选型不要只看组件名。
更重要的是看当前阶段的问题到底是什么。

如果当前最大问题是“检索链路还没跑通”，pgvector 更合适。
如果当前最大问题是“向量检索已经成为性能瓶颈”，专业向量数据库更合适。
