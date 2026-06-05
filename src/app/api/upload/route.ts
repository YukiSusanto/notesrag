/**
 * POST /api/upload
 * 上传笔记文件 → 解析 → 分块 → 向量化 → 存储
 */
import { NextRequest, NextResponse } from "next/server";
import { storeFile } from "@/lib/blob";
import { parseDocument } from "@/lib/parser";
import { chunkText } from "@/lib/chunker";
import { embedBatch } from "@/lib/embed";
import { sql } from "@/lib/db";

export const maxDuration = 30; // Vercel Hobby 上限

const ALLOWED_TYPES = [
  "text/markdown",
  "text/plain",
  "application/pdf",
  "text/x-markdown",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(md|txt|pdf)$/i)) {
      return NextResponse.json({ error: "不支持的文件格式，请上传 .md / .txt / .pdf" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "文件过大（最大 10MB）" }, { status: 400 });
    }

    // 1. 存储原始文件到 Blob
    const buffer = Buffer.from(await file.arrayBuffer());
    const { pathname: blobPath } = await storeFile(file.name, buffer, file.type);

    // 2. 解析文档
    const parseResult = await parseDocument(buffer, file.name);
    if (!parseResult.text.trim()) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    // 3. 存笔记元数据（含 blob_path 用于删除时清理）
    const ext = file.name.toLowerCase().split(".").pop() || "txt";
    const noteResult = await sql`
      INSERT INTO notes (filename, content, format, blob_path, folder)
      VALUES (${file.name}, ${parseResult.text}, ${ext}, ${blobPath}, '未分类')
      RETURNING id
    `;
    const noteId = noteResult.rows[0].id;

    // 4. 分块
    const chunks = chunkText(parseResult.text);

    // 5. 批量向量化
    const texts = chunks.map((c) => c.content);
    const embeddings = await embedBatch(texts);

    // 6. 并行批量写入 chunks（使用连接池，瞬间完成）
    await Promise.all(
      chunks.map(async (chunk, i) => {
        const vectorStr = `[${embeddings[i].join(",")}]`;
        await sql`
          INSERT INTO chunks (note_id, chunk_index, content, embedding)
          VALUES (${noteId}, ${chunk.index}, ${chunk.content}, ${vectorStr}::vector)
        `;
      })
    );

    return NextResponse.json({
      ok: true,
      note: {
        id: noteId,
        filename: file.name,
        format: ext,
        chunks: chunks.length,
        parseMethod: parseResult.method,
        warning: parseResult.warning,
      },
    });
  } catch (err: any) {
    console.error("上传失败:", err);
    return NextResponse.json({ error: err.message || "上传处理失败" }, { status: 500 });
  }
}
