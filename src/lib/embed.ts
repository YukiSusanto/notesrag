/**
 * Embedding 模块 —— 双模式（带运行时可降级）
 *
 * 方案 A：本地 Xenova/Transformers.js — all-MiniLM-L6-v2（384 维，免费）
 *   安装：npm install @xenova/transformers --ignore-scripts
 *   已知问题：WSL 跨文件系统环境下 sharp 原生模块编译失败
 *
 * 方案 B：OpenAI text-embedding-3-small（1536 维，$0.02/百万 token）
 *   设置 EMBEDDING_PROVIDER=openai + OPENAI_API_KEY
 *
 * 切换：.env.local → EMBEDDING_PROVIDER=xenova|openai
 */

import { request as httpsRequest } from "https";

// ─── 统一接口 ───────────────────────────────────

const PROVIDER = process.env.EMBEDDING_PROVIDER || "openai";

export async function embedText(text: string): Promise<number[]> {
  if (PROVIDER === "xenova") return embedWithXenova(text);
  return embedWithOpenAI(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (PROVIDER === "xenova") return batchWithXenova(texts);
  return batchWithOpenAI(texts);
}

// ─── 方案 A：Xenova 本地 ───────────────────────

let xenovaPipeline: any = null;
let xenovaAvailable = true;

async function getXenovaPipeline() {
  if (!xenovaPipeline && xenovaAvailable) {
    try {
      const { pipeline } = await import("@xenova/transformers");
      console.log("📦 加载本地 Embedding 模型...");
      xenovaPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      console.log("✅ Xenova 就绪");
    } catch (err: any) {
      xenovaAvailable = false;
      throw new Error(`Xenova 不可用: ${err.message}`);
    }
  }
  if (!xenovaPipeline) throw new Error("Xenova 不可用");
  return xenovaPipeline;
}

async function embedWithXenova(text: string): Promise<number[]> {
  const pipe = await getXenovaPipeline();
  const result = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(result.data) as number[];
}

async function batchWithXenova(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) results.push(await embedWithXenova(text));
  return results;
}

// ─── 方案 B：OpenAI API（使用 https 模块，避免 Node 22 fetch URL 解析问题）───

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMBED_BASE = process.env.EMBED_BASE_URL || "https://api.openai.com";
const EMBED_HOST = EMBED_BASE.replace("https://", "");
const MODEL = "text-embedding-3-small";

function httpPost(host: string, path: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = httpsRequest(
      {
        hostname: host,
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const json = JSON.parse(body);
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(json);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function embedWithOpenAI(text: string): Promise<number[]> {
  if (!OPENAI_KEY) throw new Error("缺少 OPENAI_API_KEY");
  const json = await httpPost(EMBED_HOST, "/v1/embeddings", { model: MODEL, input: text });
  return json.data[0].embedding;
}

async function batchWithOpenAI(texts: string[]): Promise<number[][]> {
  if (!OPENAI_KEY) throw new Error("缺少 OPENAI_API_KEY");
  const json = await httpPost(EMBED_HOST, "/v1/embeddings", { model: MODEL, input: texts });
  return json.data.map((item: any) => item.embedding);
}
