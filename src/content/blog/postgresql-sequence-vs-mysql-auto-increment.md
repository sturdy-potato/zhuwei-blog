---
title: "为什么 PostgreSQL 的 sequence 会和 MySQL AUTO_INCREMENT 表现不一样？"
excerpt: "PostgreSQL 的 sequence 是独立发号器，MySQL 的 AUTO_INCREMENT 更像表自己的计数器。这个差异会直接影响手工插入 id、数据迁移和主键冲突排查。"
pubDate: "2026-05-11"
category: "数据库"
section: "后端工程"
tags: ["PostgreSQL", "MySQL", "sequence", "AUTO_INCREMENT", "数据库原理"]
color: "green"
icon: "Database"
minutes: 4
views: 0
comments: 0
draft: false
---

## 背景

一次 PostgreSQL 数据变更里，我遇到了主键冲突：

```text
duplicate key value violates unique constraint "tree_node_values_pkey"
```

表里的 `id` 明明是自增主键：

```sql
id bigint DEFAULT nextval('tree_node_values_id_seq'::regclass)
```

继续查才发现，表里的最大 `id` 已经是 `111`，但 sequence 当前值还是 `4`：

```text
table_name         max_id   seq_last_value   is_called
------------------------------------------------------
tree_node_values   111      4                true
```

这意味着下一次自动插入可能拿到 `id = 5`。如果表里已经有 `5`，就会直接主键冲突。

这个问题在 MySQL 里相对少见，核心原因是两者的自增机制不一样。

## 核心区别

一句话：

```text
MySQL AUTO_INCREMENT 更像表自己的自增计数器。
PostgreSQL sequence 更像表旁边的独立发号器。
```

MySQL 里，如果手工插入一个更大的 id：

```sql
INSERT INTO users(id, name) VALUES (100, '李四');
```

后续自增值通常会被推进到 `101`。

PostgreSQL 不一样。字段默认值只是调用 sequence：

```sql
nextval('tree_node_values_id_seq')
```

如果你绕过 sequence，手工插入了一个更大的 id：

```sql
INSERT INTO tree_node_values(id, node_key, value_key, name)
VALUES (111, 'A', 'B', '示例数据');
```

表里的最大 id 变成了 `111`，但 sequence 不会自动扫描表，也不会自动知道这件事。它可能仍然停在 `4`。

## 对比一下

| 对比项 | PostgreSQL sequence | MySQL AUTO_INCREMENT |
| --- | --- | --- |
| 本质 | 独立数据库对象 | 表级自增属性 |
| 生成方式 | 字段默认调用 `nextval()` | 表内部维护自增值 |
| 手工插入较大 id 后 | 不一定自动推进 | 通常会自动推进 |
| 数据迁移保留 id 后 | 容易落后 | 相对少见 |
| 灵活性 | 更高，可独立发号 | 更贴近主键自增 |

PostgreSQL 这么设计不是缺陷，而是更通用。sequence 可以不绑定某张表，也可以用来生成订单号、批次号、流水号，甚至被多张表共享。

代价是：如果你手工插入 id、导入历史数据、跨环境同步数据，就要自己保证 sequence 和表数据一致。

## 哪些场景容易出问题

最常见的是这几类：

1. 手工插入过主键 id。
2. 数据迁移时保留了原始 id。
3. 初始化脚本显式写了 id。
4. 备份恢复后 sequence 状态没有同步。
5. 手工执行过错误的 `setval`。

例如：

```sql
SELECT setval('tree_node_values_id_seq', 4);
```

这会直接把 sequence 改小，后面就可能撞上已有主键。

## 如何检查

先确认字段是不是依赖 sequence：

```sql
SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tree_node_values'
  AND column_name = 'id';
```

如果看到类似：

```text
nextval('tree_node_values_id_seq'::regclass)
```

说明它用的是 sequence。

再查表最大 id 和 sequence 当前值：

```sql
SELECT
  'tree_node_values' AS table_name,
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) AS max_id,
  last_value AS seq_last_value,
  is_called
FROM public.tree_node_values_id_seq;
```

如果 `max_id > seq_last_value`，就要警惕。

## 如何修复

把 sequence 调整到当前表最大 id 的下一个值：

```sql
SELECT setval(
  'public.tree_node_values_id_seq',
  COALESCE((SELECT MAX(id) FROM public.tree_node_values), 0) + 1,
  false
);
```

这里的 `false` 表示：下一次 `nextval()` 返回的就是设置进去的值。

如果当前最大 id 是 `111`，上面会把 sequence 设置为 `112`，下一次自动生成的 id 就是 `112`。

多张表可以放在一个事务里分别修：

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

## 实践建议

初始化数据时，能不写 id 就不要写：

```sql
INSERT INTO tree_node_values(node_key, value_key, name)
VALUES ('A', 'B', '示例');
```

如果迁移数据时必须保留 id，导入后一定要补一条 `setval`。

另外，排查 `duplicate key` 时不要只看报错文本，要看冲突的是哪个约束：

```text
tree_node_values_pkey
```

这通常是主键冲突。

如果是业务唯一索引，例如：

```text
uk_tree_node_values_node_value
```

那才是业务字段重复。

## 总结

PostgreSQL 的 sequence 是独立发号器，表只是默认去它那里拿号。

所以只要你绕过它手工插入过 id，或者迁移数据时保留了 id，就可能出现：

```text
表里最大 id 已经很大，但 sequence 当前值还很小
```

修复也很直接：用 `setval` 把 sequence 校准到 `MAX(id) + 1`。
