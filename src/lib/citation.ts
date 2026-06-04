/**
 * 引用格式生成模块
 * 两种模式：full（原文内嵌）/ light（仅 id）
 */

const CITATION_MODE = process.env.CITATION_MODE || "light";

/**
 * 生成传给 LLM 的引用格式要求（嵌入在 system prompt 里）
 */
export function getCitationPrompt(): string {
  if (CITATION_MODE === "full") {
    return `
回答格式要求（引用溯源）：
当你的回答引用笔记内容时，使用 <cite id="X" text="原文句子"/> 标记来源。
- id 是笔记片段的编号
- text 是你实际使用的笔记原文（必须逐字复制，不要改写）
- 不要编造引用编号，只引用真正用于回答的内容
`;
  }

  return `
回答格式要求（引用溯源）：
当你的回答引用笔记内容时，使用 <cite id="X"/> 标记来源。
- id 是笔记片段的编号
- 不要编造引用编号，只引用真正用于回答的内容
`;
}

/**
 * 构造检索结果到 LLM 的上下文格式
 */
export function formatChunksForPrompt(chunks: Array<{ index: number; filename: string; content: string }>): string {
  return chunks
    .map(
      (c) =>
        `[{index}] (来源: {filename})\n{content}`
          .replace("{index}", String(c.index))
          .replace("{filename}", c.filename)
          .replace("{content}", c.content)
    )
    .join("\n\n---\n\n");
}
