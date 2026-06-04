/**
 * GET /api/notes   — 获取笔记列表
 * DELETE /api/notes — 删除笔记（含 Blob 清理）
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { removeFile } from "@/lib/blob";

// 强制动态渲染——笔记列表必须实时查询，不能静态缓存
export const dynamic = "force-dynamic";

/** 获取所有笔记 */
export async function GET() {
  try {
    const result = await sql`
      SELECT n.id, n.filename, n.format, n.blob_path, n.created_at,
             COUNT(c.id)::int AS chunk_count
      FROM notes n
      LEFT JOIN chunks c ON n.id = c.note_id
      GROUP BY n.id
      ORDER BY n.created_at DESC
    `;

    return NextResponse.json({ notes: result.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 删除指定笔记（DB + Blob 双清） */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少笔记 id" }, { status: 400 });
    }

    // 先查 blob_path 用于清理
    const noteResult = await sql`SELECT blob_path FROM notes WHERE id = ${id}`;
    const blobPath = noteResult.rows[0]?.blob_path;

    // 删除数据库记录（CASCADE 自动清 chunks）
    await sql`DELETE FROM notes WHERE id = ${id}`;

    // 清理 Blob 存储
    if (blobPath) {
      try {
        await removeFile(blobPath);
      } catch {
        // Blob 删除失败不影响主流程
        console.warn("Blob 清理失败:", blobPath);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
