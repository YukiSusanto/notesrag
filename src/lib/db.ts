/**
 * 数据库连接模块
 * 使用 @vercel/postgres（兼容任何 Postgres URL，包括 Neon）
 *
 * 向量维度：默认 384（方案 A Xenova all-MiniLM-L6-v2）
 * 切换方案 B (OpenAI 1536) 后需运行：npm run setup-db -- --recreate
 */
import { sql } from "@vercel/postgres";

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "xenova";

function getDim(): number {
  return EMBEDDING_PROVIDER === "openai" ? 1536 : 384;
}

export async function initDatabase() {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  await sql`
    CREATE TABLE IF NOT EXISTS notes (
      id          SERIAL PRIMARY KEY,
      filename    TEXT NOT NULL,
      content     TEXT NOT NULL,
      format      TEXT NOT NULL,
      blob_path   TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 迁移：旧表可能没有 blob_path 列
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS blob_path TEXT`;

  // 用裸字符串拼 SQL（vector(N) 不能用 bind 参数）
  const dim = getDim();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS chunks (
      id          SERIAL PRIMARY KEY,
      note_id     INTEGER REFERENCES notes(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content     TEXT NOT NULL,
      embedding   vector(${dim}),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql`
    CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `;

  console.log(`✅ 数据库表初始化完成 (向量维度: ${dim})`);
}

/** 重建 chunks 表（切换 embedding provider 时用） */
export async function recreateChunksTable() {
  const dim = getDim();
  console.log(`🔄 重建 chunks 表 (向量维度: ${dim})...`);

  await sql.query(`DROP TABLE IF EXISTS chunks CASCADE`);

  await sql.query(`
    CREATE TABLE chunks (
      id          SERIAL PRIMARY KEY,
      note_id     INTEGER REFERENCES notes(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content     TEXT NOT NULL,
      embedding   vector(${dim}),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql`
    CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `;

  console.log("✅ chunks 表重建完成");
}

export { sql };
