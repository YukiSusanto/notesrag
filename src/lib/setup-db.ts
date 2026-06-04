#!/usr/bin/env node
/**
 * 数据库初始化 + 迁移脚本
 * 用法：npm run setup-db
 */
import { initDatabase, recreateChunksTable } from "./db";

async function main() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error("❌ 请先在 .env.local 中设置 DATABASE_URL 或 POSTGRES_URL");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  console.log("📦 正在初始化数据库...");
  console.log(`   URL: ${dbUrl.replace(/\/\/.*@/, "//***@")}`);

  // 检查是否需要重建（命令行参数 --recreate）
  if (process.argv.includes("--recreate")) {
    await recreateChunksTable();
    console.log("\n⚠️  chunks 表已重建，请重新导入所有笔记。");
    process.exit(0);
  }

  try {
    await initDatabase();
    console.log("✅ 数据库初始化成功！");
    console.log(`   如需切换 Embedding Provider 后重建表：npm run setup-db -- --recreate`);
  } catch (err: any) {
    // 如果表已存在但维度不匹配
    if (err.message?.includes("vector")) {
      console.error("❌ 向量维度不匹配。请运行：npm run setup-db -- --recreate");
      console.error("   注意：这会删除所有已导入的笔记数据。");
    } else {
      console.error("❌ 数据库初始化失败：", err.message);
    }
    process.exit(1);
  }
}

main();
