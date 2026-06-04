/**
 * 文档解析模块
 * 方案 B（主线）：LlamaParse API → 返回结构化 Markdown
 * 方案 A（降级）：pdfjs-dist 本地提取
 * .md / .txt 直接读取，跳过 API
 */

const LAMAPARSE_KEY = process.env.LLAMAPARSE_API_KEY;
const LAMAPARSE_UPLOAD = "https://api.cloud.llamaindex.ai/api/parsing/upload";

export interface ParseResult {
  text: string;       // Markdown 文本
  method: "lamaparse" | "pdfjs" | "direct";
  warning?: string;   // 降级警告信息
}

/**
 * 解析上传的文件内容
 * @param buffer 文件二进制内容
 * @param filename 原始文件名（用于判断格式）
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const ext = filename.toLowerCase().split(".").pop();

  // Markdown / 纯文本：直接读取
  if (ext === "md" || ext === "txt") {
    return {
      text: buffer.toString("utf-8"),
      method: "direct",
    };
  }

  // PDF：先试 LlamaParse，失败降级 pdfjs-dist
  if (ext === "pdf") {
    if (LAMAPARSE_KEY) {
      try {
        const markdown = await parseWithLlamaParse(buffer, filename);
        return { text: markdown, method: "lamaparse" };
      } catch (err) {
        console.warn("LlamaParse 失败，降级 pdfjs-dist:", err);
        const text = await parseWithPdfjs(buffer);
        return {
          text,
          method: "pdfjs",
          warning: "解析质量可能受影响（已降级为本地解析）",
        };
      }
    }
    // 无 LlamaParse key，直接用 pdfjs
    const text = await parseWithPdfjs(buffer);
    return { text, method: "pdfjs" };
  }

  throw new Error(`不支持的文件格式: .${ext}`);
}

/** LlamaParse API —— 上传 buffer 并轮询获取 Markdown */
async function parseWithLlamaParse(
  buffer: Buffer,
  filename: string
): Promise<string> {
  // Step 1: 上传
  const formData = new FormData();
  // Buffer → Uint8Array → Blob（避免 Buffer 类型不兼容）
  formData.append("file", new Blob([new Uint8Array(buffer)]), filename);

  const uploadRes = await fetch(LAMAPARSE_UPLOAD, {
    method: "POST",
    headers: { Authorization: `Bearer ${LAMAPARSE_KEY}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`LlamaParse 上传失败: ${uploadRes.status}`);
  }

  const { id: jobId } = await uploadRes.json();

  // Step 2: 轮询直到完成
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const jobRes = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
      { headers: { Authorization: `Bearer ${LAMAPARSE_KEY}` } }
    );

    if (jobRes.status === 200) {
      const data = await jobRes.json();
      return data.markdown;
    }
    if (jobRes.status !== 404) {
      throw new Error(`LlamaParse 查询失败: ${jobRes.status}`);
    }
  }

  throw new Error("LlamaParse 超时（30 秒）");
}

/** pdfjs-dist 本地解析（降级方案） */
async function parseWithPdfjs(buffer: Buffer): Promise<string> {
  // 动态导入（pdfjs-dist 较大，按需加载）
  const pdfjsLib = await import("pdfjs-dist");

  // pdfjs-dist 需要 Uint8Array
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}
