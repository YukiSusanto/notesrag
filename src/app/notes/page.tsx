"use client";

import { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";

interface Note {
  id: number;
  filename: string;
  format: string;
  chunk_count: number;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id: number) {
    if (!confirm("确定删除这条笔记？相关的问答将无法检索到这些内容。")) return;

    try {
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      alert("删除失败");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">我的笔记</h1>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-500">
          暂无笔记，
          <a href="/upload" className="text-blue-600 underline">
            去导入
          </a>
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="bg-white p-4 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{note.filename}</p>
                <p className="text-sm text-gray-500">
                  {note.format.toUpperCase()} · {note.chunk_count} chunks ·{" "}
                  {new Date(note.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <button
                onClick={() => deleteNote(note.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </main>
  );
}
