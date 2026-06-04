"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ChatInput from "@/components/ChatInput";
import ChatMessage from "@/components/ChatMessage";
import { CitationData } from "@/components/CitationBadge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [citations, setCitations] = useState<CitationData[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (question: string) => {
    setError("");
    setCitations([]);

    // 添加用户消息
    const userMsg: Message = { role: "user", content: question };
    const aiMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "服务异常");
      }

      // 流式读取
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";
      let parsedMeta = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 检测 __ERROR__ 前缀
        if (buffer.startsWith("__ERROR__")) {
          const errMsg = buffer.slice(9);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === "assistant") {
              updated[lastIdx] = { ...updated[lastIdx], content: errMsg };
            }
            return updated;
          });
          setStreaming(false);
          return;
        }

        // 解析 __CITATIONS__ 元数据（在第一个 chunk 开头）
        if (!parsedMeta && buffer.includes("__CITATIONS__")) {
          const metaMatch = buffer.match(/__CITATIONS__(.*?)__END__/s);
          if (metaMatch) {
            try {
              setCitations(JSON.parse(metaMatch[1]));
            } catch {}
            // 移除元数据，只保留 LLM 输出
            buffer = buffer.replace(/__CITATIONS__.*?__END__\n?/s, "");
            parsedMeta = true;
          }
        }

        // 更新 AI 消息
        if (parsedMeta || !buffer.includes("__CITATIONS__")) {
          const displayText = parsedMeta
            ? buffer
            : buffer.replace(/__CITATIONS__.*?__END__\n?/s, "");

          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === "assistant") {
              updated[lastIdx] = { ...updated[lastIdx], content: displayText };
            }
            return updated;
          });
        }
      }

      // 流结束，最终清理
      if (!parsedMeta && buffer.includes("__CITATIONS__")) {
        const metaMatch = buffer.match(/__CITATIONS__(.*?)__END__/s);
        if (metaMatch) {
          try { setCitations(JSON.parse(metaMatch[1])); } catch {}
          buffer = buffer.replace(/__CITATIONS__.*?__END__\n?/s, "");
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "assistant") {
          updated[lastIdx] = { ...updated[lastIdx], content: buffer };
        }
        return updated;
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "请求失败");
        // 移除空的 AI 消息
        setMessages((prev) =>
          prev.filter((m) => !(m.role === "assistant" && m.content === ""))
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-lg mb-2">基于你的笔记，问任何问题</p>
            <p className="text-sm">
              先
              <Link href="/upload" className="text-blue-600 underline mx-1">
                导入笔记
              </Link>
              ，然后回来提问
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            citations={citations}
            streaming={
              streaming &&
              i === messages.length - 1 &&
              msg.role === "assistant"
            }
          />
        ))}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSend} disabled={streaming} />
        </div>
      </div>
    </main>
  );
}
