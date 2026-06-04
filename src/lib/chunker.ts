/**
 * 文本分块模块
 * - Markdown：优先按 ## 标题切分
 * - 纯文本：按段落（\n\n）切分
 * - 每 chunk 800-1200 字符，重叠 100 字符
 */

export interface Chunk {
  index: number;
  content: string;
}

const MAX_CHUNK_SIZE = 1200;
const MIN_CHUNK_SIZE = 800;
const OVERLAP = 100;

/**
 * 将文本切分为 chunks
 */
export function chunkText(text: string): Chunk[] {
  const chunks: Chunk[] = [];

  // 1. 按 Markdown 标题切分大段
  const sections = splitByHeadings(text);

  // 2. 每个 section 内再按段落切分
  let index = 0;
  for (const section of sections) {
    const paragraphs = section.split(/\n\n+/).filter((p) => p.trim());
    let current = "";

    for (const para of paragraphs) {
      // 如果加上这段不会超限，继续拼接
      if (current.length + para.length < MAX_CHUNK_SIZE) {
        current += (current ? "\n\n" : "") + para;
      } else {
        // 当前 chunk 够大，保存并开新 chunk
        if (current.length >= MIN_CHUNK_SIZE || current.length > 0) {
          chunks.push({ index: index++, content: current.trim() });
        }
        current = para;
      }
    }

    // 最后一个 chunk
    if (current.trim()) {
      chunks.push({ index: index++, content: current.trim() });
    }
  }

  // 3. 添加重叠（每个 chunk 尾部 100 字符复制到下一个 chunk 开头）
  return addOverlap(chunks);
}

/** 按 Markdown 标题（##）切分 */
function splitByHeadings(text: string): string[] {
  const headingRegex = /^##\s.+/gm;
  const splits: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      splits.push(text.slice(lastIndex, match.index));
    }
    lastIndex = match.index;
  }

  // 最后一段
  if (lastIndex < text.length) {
    splits.push(text.slice(lastIndex));
  }

  return splits.length > 0 ? splits : [text];
}

/** 为 chunks 添加重叠 */
function addOverlap(chunks: Chunk[]): Chunk[] {
  if (chunks.length <= 1 || OVERLAP <= 0) return chunks;

  const result: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let content = chunks[i].content;
    // 把前一个 chunk 的尾部拼到当前 chunk 开头
    if (i > 0) {
      const prevTail = chunks[i - 1].content.slice(-OVERLAP);
      content = prevTail + "\n\n" + content;
    }
    result.push({ index: i, content });
  }
  return result;
}
