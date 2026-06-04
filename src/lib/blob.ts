/**
 * 文件存储模块
 * 优先 Vercel Blob（生产环境），本地开发降级到 /tmp/
 */
import { put, del } from "@vercel/blob";
import { writeFile, unlink, mkdir } from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/** 是否有 Blob 存储可用 */
export function hasBlob() {
  return !!BLOB_TOKEN;
}

/**
 * 保存文件
 * @returns 可访问的 URL 或本地路径
 */
export async function storeFile(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; pathname: string }> {
  if (hasBlob()) {
    try {
      const ext = path.extname(filename);
      const result = await put(`${randomUUID()}${ext}`, buffer, {
        access: "private",
        contentType,
      });
      console.log("[blob] ✅ 存入 Blob:", result.pathname);
      return { url: result.url, pathname: result.pathname };
    } catch (err: any) {
      console.error("[blob] ❌ Blob 写入失败，降级 /tmp/:", err.message);
    }
  }

  // 降级：本地 /tmp/ 存储
  console.log("[blob] 📁 使用 /tmp/ 存储");
  await mkdir("/tmp/notes-rag", { recursive: true });
  const localPath = path.join("/tmp/notes-rag", `${randomUUID()}-${filename}`);
  await writeFile(localPath, buffer);
  return { url: localPath, pathname: localPath };
}

/**
 * 删除文件（仅 Blob 模式有效，本地模式忽略）
 */
export async function removeFile(pathname: string) {
  if (hasBlob()) {
    await del(pathname);
  } else {
    // 本地文件尝试删除（忽略错误）
    try {
      await unlink(pathname);
    } catch {
      // 文件可能不存在
    }
  }
}
