# PostgreSQL 性能优化笔记

## 索引策略

### B-Tree 索引（默认）

适用于等值查询和范围查询：

```sql
-- 单列索引
CREATE INDEX idx_users_email ON users(email);

-- 复合索引（注意列顺序）
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

**最左前缀原则**：复合索引 `(a, b, c)` 可以加速 `WHERE a=?` 和 `WHERE a=? AND b=?`，但不能加速 `WHERE b=?` 单独查询。

### 部分索引

只索引满足条件的行，节省空间：

```sql
CREATE INDEX idx_active_users ON users(email)
WHERE status = 'active';
```

### 索引开销对比

| 操作 | 无索引 | B-Tree | GIN | BRIN |
|------|--------|--------|-----|------|
| 等值查询 | 全表扫描 | 极快 | 快 | 慢 |
| 范围查询 | 全表扫描 | 快 | 不支持 | 快（大表） |
| LIKE '%keyword%' | 全表扫描 | 不支持 | 快 | 不支持 |
| 写入性能 | 快 | -20% | -40% | -5% |
| 索引大小 | 0 | 中等 | 大 | 极小 |

## 查询优化

### EXPLAIN ANALYZE 解读

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id;
```

关注指标：
- **Seq Scan**：全表扫描，大表要避免
- **Index Scan vs Index Only Scan**：后者不需要回表，快 2-5 倍
- **Nested Loop vs Hash Join**：小表驱动大表用 Nested Loop，两个大表用 Hash Join
- **cost=0.00..XXX**：启动成本..总成本，单位是"页读取"

### 常见慢查询模式

1. `SELECT *` — 传输不需要的列，阻止 Index Only Scan
2. `WHERE function(column) = ?` — 函数包裹列导致索引失效
3. `WHERE a OR b` — OR 条件难以优化，考虑 UNION ALL
4. 隐式类型转换 — `WHERE id = '123'` 如果 id 是 int 类型
5. 大 OFFSET — `LIMIT 20 OFFSET 100000` 需要扫描 100020 行，用游标分页替代

### 连接池配置

```ini
# PgBouncer / 应用层连接池建议
max_connections = 200        # PG 最大连接数
pool_size = 20               # 每个应用实例的连接池大小
idle_timeout = 600           # 空闲连接超时（秒）
```

经验值：每个 CPU 核心配 2-4 个活跃连接效率最高。

## VACUUM 与膨胀

- **死元组**：UPDATE/DELETE 后旧版本数据占空间
- **autovacuum**：默认开启，但大表需要调优参数
- 监控膨胀：`SELECT schemaname, tablename, n_dead_tup FROM pg_stat_user_tables`
- 手工清理：`VACUUM FULL table_name`（锁表，生产慎用）
