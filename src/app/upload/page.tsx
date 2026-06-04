"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("网络异常，请检查连接");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">导入笔记</h1>

      {/* 拖拽上传区域 */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors"
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleUpload(file);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <p className="text-gray-500 mb-3">
          拖拽文件到此处，或点击选择
        </p>
        <input
          type="file"
          accept=".md,.txt,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="text-sm"
        />
        <p className="text-xs text-gray-400 mt-2">
          支持 .md / .txt / .pdf，最大 10MB
        </p>
      </div>

      {/* 上传状态 */}
      {uploading && (
        <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded">
          ⏳ 正在处理...
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {/* 成功 */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 text-green-800 rounded">
          <p>✅ 导入成功：{result.note.filename}</p>
          <p className="text-sm mt-1">
            分块数：{result.note.chunks} |
            解析方式：{result.note.parseMethod}
            {result.note.warning && (
              <span className="text-yellow-700 ml-2">
                ⚠️ {result.note.warning}
              </span>
            )}
          </p>
        </div>
      )}
      </div>
    </main>
  );
}
