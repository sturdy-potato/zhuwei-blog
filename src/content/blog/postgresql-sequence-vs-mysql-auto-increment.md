---
title: "为什么 PostgreSQL 的 sequence 会和 MySQL AUTO_INCREMENT 表现不一样？"
excerpt: "PostgreSQL 的 sequence 和 MySQL 的 AUTO_INCREMENT 都能生成自增主键，但两者底层机制并不一样。本文从一次主键冲突问题出发，解释为什么 PostgreSQL 更容易出现 sequence 与表数据不同步的问题。"
pubDate: "2026-05-11"
category: "PostgreSQL"
section: "技术专栏"
tags: ["PostgreSQL", "MySQL", "sequence", "AUTO_INCREMENT", "数据库原理"]
color: "green"
icon: "Database"
minutes: 7
views: 0
comments: 0
draft: false
---

## 背景

在一次数据库变更中，我遇到了一个 PostgreSQL 主键冲突问题。

表结构里 `id` 是自增主键：

```sql
id bigint DEFAULT nextval('tree_node_values_id_seq'::regclass)
```

按理说，新增数据时不手动传 `id`，数据库应该自动生成一个不重复的主键。

但执行插入时却报错：

```text
duplicate key value violates unique constraint "tree_node_values_pkey"
```

继续排查后发现，表里的最大 `id` 已经是 `111`，但对应的 sequence 当前值才是 `4`：

```text
table_name         max_id   seq_last_value   is_called
------------------------------------------------------
tree_node_values   111      4                true
```

也就是说，PostgreSQL 下一次自动生成的 id 可能是 `5`，而表里早就已经存在 `id = 5` 的数据，于是发生主键冲突。

这个问题在 MySQL 里相对少见。

原因就在于：

> PostgreSQL 的 sequence 和 MySQL 的 AUTO_INCREMENT 底层设计并不一样。

## 一句话区别

可以先记一个简单结论：

```text
MySQL AUTO_INCREMENT 更像是表自己的自增计数器。
PostgreSQL sequence 更像是表旁边的独立发号器。
```

这句话基本解释了两者大部分行为差异。

## MySQL AUTO_INCREMENT 是什么

在 MySQL 中，我们通常这样定义自增主键：

```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100)
);
```

插入数据时不传 `id`：

```sql
INSERT INTO users(name) VALUES ('张三');
```

MySQL 会自动给这条记录生成一个新的 `id`。

从使用者视角看，`AUTO_INCREMENT` 基本是表的一部分。

也就是说：

```text
users 表自己知道下一个 id 应该是多少。
```

如果你手工插入一个更大的 id：

```sql
INSERT INTO users(id, name) VALUES (100, '李四');
```

MySQL 通常会把下一次自增值推进到 `101`。

所以再执行：

```sql
INSERT INTO users(name) VALUES ('王五');
```

新记录大概率会得到：

```text
id = 101
```

这就是为什么 MySQL 用户平时不太容易遇到“自增值落后于表内最大 id”的问题。

## PostgreSQL sequence 是什么

PostgreSQL 的自增机制本质上依赖 sequence。

比如这个字段：

```sql
id bigint DEFAULT nextval('tree_node_values_id_seq'::regclass)
```

意思是：

> 如果插入时没有传 `id`，就调用 `tree_node_values_id_seq` 这个 sequence 取一个新值。

也可以理解为：

```text
tree_node_values 表自己不直接维护下一个 id。
它只是默认去 tree_node_values_id_seq 这个发号器里拿号。
```

这个发号器是一个独立数据库对象。

你甚至可以直接调用它：

```sql
SELECT nextval('tree_node_values_id_seq');
```

它会返回下一个值。

也可以查看它当前发到哪里：

```sql
SELECT last_value, is_called
FROM public.tree_node_values_id_seq;
```

## 为什么 PostgreSQL 会不同步

问题就出在这里：

> sequence 是独立对象，它不会自动扫描表里当前最大 id。

假设当前 sequence 只发到了 `4`：

```text
sequence 当前值 = 4
```

然后有人手工插入了一条数据：

```sql
INSERT INTO tree_node_values(id, node_key, value_key, name)
VALUES (111, 'A', 'B', '示例数据');
```

这条数据会成功写入表中。

此时表里最大 id 已经变成：

```text
max(id) = 111
```

但 sequence 并不知道这件事。

它仍然认为自己只发到了：

```text
last_value = 4
```

下一次如果执行：

```sql
INSERT INTO tree_node_values(node_key, value_key, name)
VALUES ('C', 'D', '另一条数据');
```

PostgreSQL 会调用：

```sql
nextval('tree_node_values_id_seq')
```

于是可能生成：

```text
id = 5
```

如果表里已经有 `id = 5`，就会报主键冲突：

```text
duplicate key value violates unique constraint
```

## 用生活例子理解

可以把 MySQL 和 PostgreSQL 想成两种排队取号方式。

### MySQL：柜台自己管号

MySQL 更像是：

```text
每个窗口自己有一个叫号器。
窗口看到有人插了 111 号，就知道下次应该从 112 开始。
```

表和自增计数器绑定得比较紧。

### PostgreSQL：旁边有独立发号机

PostgreSQL 更像是：

```text
表旁边放了一个独立发号机。
正常新增数据时，大家都去发号机拿号。
但如果有人不拿号，直接手写了一个 111 号进表，发号机是不知道的。
```

所以发号机可能还停在 4。

下一次有人正常取号，拿到了 5，结果发现 5 号早就已经被人占了。

## 两者机制对比

| 对比项 | PostgreSQL sequence | MySQL AUTO_INCREMENT |
| --- | --- | --- |
| 本质 | 独立数据库对象 | 表级自增属性 |
| 是否可以单独调用 | 可以，`nextval()` | 通常不单独作为对象调用 |
| 手工插入较大 id 后 | sequence 不一定自动推进 | 通常会自动推进 |
| 数据导入带 id 后 | 容易出现 sequence 落后 | 相对较少出现 |
| 灵活性 | 更高，可独立用于多种发号场景 | 更偏向表主键自增 |
| 常见问题 | sequence 与表数据不同步 | 自增值管理相对直观 |

## PostgreSQL 为什么要这样设计

PostgreSQL 的 sequence 设计更通用。

它不一定只用于主键自增，也可以用于其他场景，比如：

* 订单编号；
* 批次号；
* 流水号；
* 多张表共享一个编号来源；
* 手动控制编号生成。

例如：

```sql
CREATE SEQUENCE order_no_seq START 10000;

SELECT nextval('order_no_seq');
```

这和某一张表没有强绑定关系。

这种设计的优点是灵活。

但缺点也很明显：

> 如果你手工插入数据、迁移数据、导入历史数据，就需要自己保证 sequence 和表数据一致。

## 哪些场景容易触发 sequence 不同步

常见场景有几个。

### 1. 手工插入过 id

例如：

```sql
INSERT INTO tree_node_values(id, node_key, value_key, name)
VALUES (111, 'A', 'B', '测试');
```

这会绕过 sequence。

### 2. 数据迁移时保留了原 id

比如从测试环境导入开发环境：

```sql
COPY tree_node_values(id, node_key, value_key, name)
FROM '/tmp/tree_node_values.csv'
WITH CSV HEADER;
```

数据进来了，但 sequence 可能没同步。

### 3. 初始化脚本显式指定主键

有些初始化数据会这样写：

```sql
INSERT INTO tree_nodes(id, parent_key, node_key, name)
VALUES
  (1, 'Root', 'A', '节点A'),
  (2, 'Root', 'B', '节点B'),
  (100, 'Root', 'C', '节点C');
```

如果脚本最后没有修 sequence，后面就容易出问题。

### 4. 备份恢复或跨环境同步

某些迁移工具只恢复了表数据，没有正确恢复 sequence 状态。

或者恢复后 sequence 起始值仍然很小。

### 5. 手工执行过 setval

例如误执行：

```sql
SELECT setval('tree_node_values_id_seq', 4);
```

这会直接把 sequence 改小。

## 如何检查 PostgreSQL sequence 是否正常

假设表名是：

```text
tree_node_values
```

自增字段是：

```text
id
```

可以先查字段默认值：

```sql
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tree_node_values'
  AND column_name = 'id';
```

如果结果类似：

```text
nextval('tree_node_values_id_seq'::regclass)
```

说明它使用的是 sequence。

然后查表最大 id 和 sequence 当前值：

```sql
SELECT
  'tree_node_values' AS table_name,
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) AS max_id,
  last_value AS seq_last_value,
  is_called
FROM public.tree_node_values_id_seq;
```

如果看到：

```text
max_id > seq_last_value
```

就要警惕了。

例如：

```text
max_id = 111
seq_last_value = 4
```

这基本可以判断 sequence 已经落后。

## 如何修复 sequence

修复方式是用 `setval` 把 sequence 设置到当前表最大 id 的下一个值。

```sql
SELECT setval(
  'public.tree_node_values_id_seq',
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) + 1,
  false
);
```

这里的含义是：

```text
把 tree_node_values_id_seq 调整到 tree_node_values 当前最大 id + 1
```

如果当前最大 id 是 `111`，则调整到 `112`。

参数里的 `false` 表示：

```text
下一次 nextval() 返回的就是当前设置的值
```

所以如果设置为 `112, false`，下一次生成的就是 `112`。

如果使用：

```sql
SELECT setval('public.tree_node_values_id_seq', 112, true);
```

则表示当前值已经被使用过，下一次 `nextval()` 会返回 `113`。

实际修复时，我更习惯使用：

```sql
SELECT setval(
  'public.tree_node_values_id_seq',
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) + 1,
  false
);
```

这样语义比较直观：

```text
下一次从最大 id + 1 开始。
```

## 多张表如何一起修

如果有多张表都可能存在这个问题，可以分别修：

```sql
BEGIN;

SELECT setval(
  'public.tree_nodes_id_seq',
  COALESCE((SELECT MAX(id) FROM public.tree_nodes), 0) + 1,
  false
);

SELECT setval(
  'public.tree_node_values_id_seq',
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) + 1,
  false
);

COMMIT;
```

修完后再查：

```sql
SELECT
  'tree_node_values' AS table_name,
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) AS max_id,
  last_value AS seq_last_value,
  is_called
FROM public.tree_node_values_id_seq;
```

看到类似：

```text
max_id = 111
seq_last_value = 112
is_called = false
```

就说明下一次自动插入会从 `112` 开始。

## 涉及工具说明

这类问题通常会涉及几个工具。

### PostgreSQL

PostgreSQL 是一个开源关系型数据库。它支持事务、索引、复杂 SQL、JSON、扩展机制等能力。

macOS 可以用 Homebrew 安装：

```bash
brew install postgresql@16
brew services start postgresql@16
```

验证安装：

```bash
psql --version
```

Ubuntu 可以这样安装：

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### psql

`psql` 是 PostgreSQL 官方命令行客户端。

连接数据库示例：

```bash
psql "host=127.0.0.1 port=5432 dbname=your_database user=your_user"
```

进入后可以执行 SQL，也可以查看表结构：

```sql
\d public.tree_node_values
```

### SQL 工单平台

在公司内部，数据库变更通常不会直接连生产库执行，而是通过 SQL 工单平台提交。

这类平台一般会提供：

* SQL 审核；
* 权限检查；
* 影响行数预估；
* 审批流；
* 执行日志；
* 回滚记录；
* 操作审计。

如果执行失败，优先看工单日志里的数据库原始报错，而不是只看页面上的“执行失败”。

## 实践建议

### 1. 初始化数据尽量不要手写 id

不推荐：

```sql
INSERT INTO tree_node_values(id, node_key, value_key, name)
VALUES (111, 'A', 'B', '示例');
```

推荐：

```sql
INSERT INTO tree_node_values(node_key, value_key, name)
VALUES ('A', 'B', '示例');
```

让数据库自己生成 `id`。

### 2. 如果必须导入 id，导入后修 sequence

比如迁移历史数据时保留了 id，那么导入后一定要执行：

```sql
SELECT setval(
  'public.tree_node_values_id_seq',
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) + 1,
  false
);
```

### 3. 变更脚本里区分技术主键和业务唯一键

很多表的 `id` 只是技术主键。

真正的业务唯一性可能是：

```text
parent_key + node_key
```

或者：

```text
node_key + value_key
```

如果业务上要求唯一，最好加唯一索引：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uk_tree_nodes_parent_node
ON public.tree_nodes(parent_key, node_key);
```

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uk_tree_node_values_node_value
ON public.tree_node_values(node_key, value_key);
```

这样初始化脚本才能安全使用：

```sql
ON CONFLICT (node_key, value_key) DO UPDATE
```

### 4. 不要只看 duplicate key，要看冲突的是哪个约束

看到：

```text
duplicate key value violates unique constraint
```

不要马上判断是业务字段重复。

应该先看约束名。

如果是：

```text
tree_node_values_pkey
```

通常说明是主键冲突。

如果是：

```text
uk_tree_node_values_node_value
```

才说明是业务唯一索引冲突。

## 总结

MySQL 和 PostgreSQL 都能实现自增主键，但两者底层模型不同。

MySQL 的 `AUTO_INCREMENT` 更像是表内置的自增计数器。

PostgreSQL 的 `sequence` 更像是独立发号器，表只是默认去这个发号器取值。

因此，在 PostgreSQL 中，如果你手工插入 id、导入历史数据、迁移数据，sequence 不一定会自动同步到表内最大 id。

这就是为什么 PostgreSQL 更容易出现：

```text
表里最大 id 已经很大，但 sequence 当前值还很小
```

最后导致：

```text
duplicate key value violates unique constraint
```

一句话记住：

> PostgreSQL sequence 是独立发号器。只要你绕过它手工塞过 id，就要记得把它重新校准。
