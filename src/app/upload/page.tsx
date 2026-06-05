"use client";

import { useState } from "react";

let _taskId = 0;

interface FileTask {
  id: number;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  result?: { chunks: number; parseMethod: string; warning?: string };
}

export default function UploadPage() {
  const [tasks, setTasks] = useState<FileTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function updateTask(id: number, patch: Partial<FileTask>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  /** 接收文件列表并逐个上传 */
  async function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files).filter((f) => {
      const ext = f.name.toLowerCase().split(".").pop();
      return ["md", "txt", "pdf"].includes(ext || "");
    });

    if (fileArr.length === 0) return;

    // 初始化任务列表（分配唯一 ID，避免闭包索引错乱）
    const newTasks: FileTask[] = fileArr.map((f) => ({
      id: ++_taskId,
      name: f.name,
      status: "pending" as const,
    }));
    setTasks((prev) => [...prev, ...newTasks]);

    // 串行上传（UUID 驱动，多次拖入安全并行）
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const id = newTasks[i].id;

      updateTask(id, { status: "uploading" });

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          updateTask(id, {
            status: "done",
            result: {
              chunks: data.note.chunks,
              parseMethod: data.note.parseMethod,
              warning: data.note.warning,
            },
          });
        } else {
          throw new Error(data.error || "上传失败");
        }
      } catch (err: any) {
        updateTask(id, {
          status: "error",
          error: err.message || "网络异常",
        });
      }
    }
  }

  return (
    <main className="h-full bg-gray-50 flex flex-col">
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">导入笔记</h1>

        {/* 拖拽上传区域 */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50 scale-[1.02]"
              : "border-gray-300 hover:border-blue-400"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
              handleFiles(e.dataTransfer.files);
            }
          }}
        >
          {isDragging ? (
            <p className="text-blue-600 text-lg font-medium">📂 松开即可上传</p>
          ) : (
            <>
              <p className="text-gray-500 mb-3">
                拖拽文件到此处，或点击选择多个文件
              </p>
              <input
                type="file"
                multiple
                accept=".md,.txt,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(e.target.files);
                    e.target.value = ""; // 重置 input，允许重复选同文件
                  }
                }}
                className="text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">
                支持 .md / .txt / .pdf，最大 10MB，可多选
              </p>
            </>
          )}
        </div>

        {/* 文件列表 */}
        {tasks.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>
                进度：{tasks.filter((t) => t.status !== "pending").length}/{tasks.length}
              </span>
            </div>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded flex items-center gap-3 text-sm ${
                  task.status === "error"
                    ? "bg-red-50 text-red-700"
                    : task.status === "done"
                    ? "bg-green-50 text-green-800"
                    : "bg-white border border-gray-200"
                }`}
              >
                {/* 状态图标 */}
                {task.status === "pending" && (
                  <span className="text-gray-400">⏳</span>
                )}
                {task.status === "uploading" && (
                  <span className="animate-pulse text-blue-500">⏳</span>
                )}
                {task.status === "done" && <span>✅</span>}
                {task.status === "error" && <span>❌</span>}

                {/* 文件名 + 详情 */}
                <div className="flex-1 min-w-0">
                  <span className="truncate block font-medium">{task.name}</span>
                  {task.status === "uploading" && (
                    <span className="text-xs text-blue-500">处理中...</span>
                  )}
                  {task.status === "done" && task.result && (
                    <span className="text-xs">
                      {task.result.chunks} chunks · {task.result.parseMethod}
                      {task.result.warning && (
                        <span className="text-yellow-600 ml-1">
                          ⚠️ {task.result.warning}
                        </span>
                      )}
                    </span>
                  )}
                  {task.status === "error" && (
                    <span className="text-xs">{task.error}</span>
                  )}
                </div>

                {/* 删除已完成/失败的任务 */}
                {task.status !== "pending" && task.status !== "uploading" && (
                  <button
                    onClick={() =>
                      setTasks((prev) => prev.filter((t) => t.id !== task.id))
                    }
                    className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
                  >
                    清除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
