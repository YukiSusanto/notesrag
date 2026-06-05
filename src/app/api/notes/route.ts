/**
 * GET /api/notes   — 获取笔记列表
 * DELETE /api/notes — 删除笔记（含 Blob 清理）
 * PATCH /api/notes  — 修改笔记分类
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { removeFile } from "@/lib/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** 获取所有笔记 */
export async function GET() {
  try {
    const result = await sql`
      SELECT n.id, n.filename, n.format, n.folder, n.blob_path, n.created_at,
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
    const noteResult = await sql`SELECT blob_path FROM notes WHERE id = ${id}`;
    const blobPath = noteResult.rows[0]?.blob_path;
    await sql`DELETE FROM notes WHERE id = ${id}`;
    if (blobPath) {
      try { await removeFile(blobPath); } catch { console.warn("Blob 清理失败:", blobPath); }
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 修改笔记分类 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, folder } = await req.json();
    if (!id || folder === undefined) {
      return NextResponse.json({ error: "缺少 id 或 folder" }, { status: 400 });
    }
    await sql`UPDATE notes SET folder = ${folder} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
