/**
 * POST /api/chat
 * 问答接口：检索 + LLM 流式生成（Vercel AI SDK）
 */
import { NextRequest } from "next/server";
import { streamText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { embedText } from "@/lib/embed";
import { retrieveChunks } from "@/lib/retrieve";
import { getCitationPrompt, formatChunksForPrompt } from "@/lib/citation";

const LLM_MODEL = "deepseek-chat";
const TIMEOUT_MS = 25_000; // Vercel Hobby 30s 上限，留 5s buffer

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { question } = await req.json();
    if (!question) {
      return streamError(encoder, "问题不能为空");
    }

    // 1. 向量检索
    const queryEmbedding = await embedText(question);
    const chunks = await retrieveChunks(queryEmbedding);

    if (chunks.length === 0) {
      return streamError(
        encoder,
        "请先导入笔记，然后我才能基于你的笔记回答问题。\n\n去[导入笔记](/upload)页面上传你的笔记文件。"
      );
    }

    // 2. 组装 prompt
    const citationPrompt = getCitationPrompt();
    const chunksContext = formatChunksForPrompt(
      chunks.map((c) => ({
        index: c.id,
        filename: c.filename,
        content: c.content,
      }))
    );

    const systemPrompt = `你是一个个人知识库助手。请仅基于以下笔记片段回答问题。
如果笔记中没有相关信息，请明确说"根据你的笔记，未找到相关信息"，不要编造任何内容。

关于图表与数据：如果用户询问具体数值或趋势，但检索到的笔记片段中只有关于图表的笼统描述而无具体数据，请诚实地回答"笔记中存在相关的图表，但受限于文本检索，无法提取具体数值"。不要根据常识或上下文盲目推测数据。

${citationPrompt}
`;

    const userPrompt = `笔记片段：
${chunksContext}

问题：${question}`;

    // 3. 引用元数据
    const citationsJson = JSON.stringify(
      chunks.map((c) => ({
        id: c.id,
        filename: c.filename,
        content: c.content,
        chunk_index: c.chunk_index,
      }))
    );

    // 4. AI SDK 流式生成 + 超时保护
    const abort = AbortSignal.timeout(TIMEOUT_MS);

    const result = streamText({
      model: deepseek(LLM_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: abort,
    });

    // 5. 包一层 ReadableStream：先发引用元数据，再透传 token 流
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(`__CITATIONS__${citationsJson}__END__\n`)
        );

        try {
          for await (const token of result.textStream) {
            controller.enqueue(encoder.encode(token));
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            controller.enqueue(encoder.encode("\n\n[回答超时，已截断]"));
          } else {
            console.error("流式异常:", err);
            controller.enqueue(encoder.encode("\n\n[生成中断，请重试]"));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Chat 异常:", err);
    return streamError(encoder, "服务器内部错误，请稍后重试");
  }
}

/** 以流形式返回错误/提示信息 */
function streamError(encoder: TextEncoder, message: string) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`__ERROR__${message}`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
