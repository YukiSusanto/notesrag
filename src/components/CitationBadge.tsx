"use client";

import { useState } from "react";

/** 引用来源数据 */
export interface CitationData {
  id: number;
  filename: string;
  content: string;
  chunk_index: number;
}

/** 引用标签组件 —— 点击展开高亮原文
 *
 *  所有容器用 <span> 避免 react-markdown 的 <p> 嵌套 <div> 报错
 */
export default function CitationBadge({
  id,
  children,
  citations,
}: {
  id?: string;
  children?: React.ReactNode;
  citations?: CitationData[];
}) {
  const [open, setOpen] = useState(false);
  const numId = parseInt(id || "0", 10);
  const cite = citations?.find((c) => c.id === numId);
  const citeText = typeof children === "string" ? children : "";

  return (
    <span className="inline">
      <sup
        onClick={() => setOpen(!open)}
        className="text-blue-600 cursor-pointer hover:underline font-bold ml-0.5 text-xs"
        title="点击查看来源"
      >
        [{id || "?"}]
      </sup>

      {open && cite && (
        <>
          {/* 遮罩层 */}
          <span
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* 右侧面板 */}
          <span className="fixed top-0 right-0 w-96 h-full bg-white border-l border-gray-200 shadow-2xl z-50 p-6 overflow-y-auto text-sm block">
            <span className="flex justify-between items-center mb-4">
              <span className="font-medium text-gray-800 text-base">
                📄 {cite.filename}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </span>
            <span className="block text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
              {highlightText(cite.content, citeText)}
            </span>
          </span>
        </>
      )}
    </span>
  );
}

/** 在原文中高亮匹配的引用文本
 *
 *  先精确匹配，失败后归一化匹配（用字符级映射同时还原起止位置） */
function highlightText(fullText: string, quote: string): React.ReactNode {
  if (!quote) return fullText;

  // 1. 精确匹配（优先）
  let idx = fullText.indexOf(quote);
  let end = idx + quote.length;

  // 2. 归一化匹配（容错空格/换行差异）
  if (idx === -1) {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const normFull = norm(fullText);
    const normQuote = norm(quote);
    const normStart = normFull.indexOf(normQuote);
    if (normStart === -1) return fullText;
    const normEnd = normStart + normQuote.length;

    // 字符级映射：归一化位置 → 原始位置（统一处理起止点）
    const mapPos = (targetNormPos: number) => {
      let orig = 0;
      let n = 0;
      while (n < targetNormPos && orig < fullText.length) {
        // 跳过原始文本中连续空白（它们在归一化后合并为一个空格）
        if (/\s/.test(fullText[orig])) {
          // 只在第一个空白字符处计数归一化，后续连续空白跳过
          if (n === 0 || !/\s/.test(fullText[orig - 1])) n++;
        } else {
          n++;
        }
        orig++;
      }
      return orig;
    };

    idx = mapPos(normStart);
    end = mapPos(normEnd);
  }

  const before = fullText.slice(0, idx);
  const match = fullText.slice(idx, end);
  const after = fullText.slice(end);

  return (
    <>
      {before}
      <mark className="bg-yellow-200 px-0.5 rounded">{match}</mark>
      {after}
    </>
  );
}
