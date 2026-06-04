/**
 * 向量检索模块
 * 在 pgvector 中搜索最相关的 chunks
 */
import { sql } from "./db";

export interface RetrievedChunk {
  id: number;
  note_id: number;
  chunk_index: number;
  content: string;
  filename: string;
  similarity: number;
}

export async function retrieveChunks(
  embedding: number[],
  topK: number = 8
): Promise<RetrievedChunk[]> {
  // 向量必须裸拼 SQL（数组太大，bind 参数不支持 ::vector cast）
  const vectorStr = `'[${embedding.join(",")}]'`;

  const result = await sql.query(`
    SELECT
      c.id,
      c.note_id,
      c.chunk_index,
      c.content,
      n.filename,
      1 - (c.embedding <=> ${vectorStr}::vector) AS similarity
    FROM chunks c
    JOIN notes n ON c.note_id = n.id
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    note_id: row.note_id,
    chunk_index: row.chunk_index,
    content: row.content,
    filename: row.filename,
    similarity: parseFloat(row.similarity),
  }));
}
