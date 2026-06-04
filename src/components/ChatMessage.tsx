"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import CitationBadge, { CitationData } from "./CitationBadge";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: CitationData[];
  streaming?: boolean;
}

/**
 * 流式文本预处理器
 * 检测末尾未闭合的 <cite> 标签，临时补 </cite> 防止 react-markdown 崩溃
 */
function preprocessStreamingXml(text: string): string {
  // 统计 <cite> 和 </cite> 数量
  const opens = (text.match(/<cite[^>]*>/g) || []).length;
  const closes = (text.match(/<\/cite>/g) || []).length;

  // 有未闭合的 <cite> 标签
  if (opens > closes) {
    const missing = opens - closes;
    // 找到最后一个 <cite> 的位置
    const lastOpen = text.lastIndexOf("<cite");
    if (lastOpen !== -1) {
      const after = text.slice(lastOpen);
      // 如果这个标签还没闭合（没有 > 也没有 />）
      if (!after.includes(">")) {
        // 连 > 都没有，补 >
        return text + ">";
      }
    }
    // 补缺失的 </cite>
    return text + "</cite>".repeat(missing);
  }

  return text;
}

export default function ChatMessage({
  role,
  content,
  citations,
  streaming,
}: Props) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%] text-sm">
          {content}
        </div>
      </div>
    );
  }

  // AI 消息 —— 用 react-markdown 渲染
  const displayContent = streaming
    ? preprocessStreamingXml(content)
    : content;

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4 max-w-[85%] text-sm shadow-sm">
        {content ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              components={{
                cite: ({ id, children }: any) => (
                  <CitationBadge
                    id={id}
                    citations={citations}
                  >
                    {children}
                  </CitationBadge>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex gap-1 text-gray-400">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
              ●
            </span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
              ●
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
