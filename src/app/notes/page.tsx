"use client";

import { useState, useEffect } from "react";

interface Note {
  id: number;
  filename: string;
  format: string;
  folder: string;
  chunk_count: number;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      const list: Note[] = data.notes || [];
      setNotes(list);
      // 默认全展开
      const folders = new Set<string>();
      list.forEach((n: Note) => folders.add(n.folder || "未分类"));
      setOpenFolders(folders);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function deleteNote(id: number) {
    if (!confirm("确定删除这条笔记？")) return;
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function changeFolder(id: number, folder: string) {
    const name = folder.trim();
    if (!name) return;
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, folder: name }),
    });
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, folder: name } : n))
    );
  }

  // 按 folder 分组
  const groups = new Map<string, Note[]>();
  for (const n of notes) {
    const key = n.folder || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  const folderNames = [...groups.keys()];

  function toggleFolder(name: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <main className="h-full bg-gray-50 flex flex-col">
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">我的笔记</h1>

        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : notes.length === 0 ? (
          <p className="text-gray-500">暂无笔记，去"导入"页面上传</p>
        ) : (
          <div className="space-y-4">
            {[...groups.entries()].map(([folder, items]) => (
              <div key={folder}>
                <button
                  onClick={() => toggleFolder(folder)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full text-left py-1"
                >
                  <span className="text-xs">
                    {openFolders.has(folder) ? "▼" : "▶"}
                  </span>
                  <span>📁 {folder}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {items.length}
                  </span>
                </button>

                {openFolders.has(folder) && (
                  <ul className="mt-2 space-y-2 ml-6">
                    {items.map((note) => (
                      <li
                        key={note.id}
                        className="bg-white p-3 rounded shadow-sm border border-gray-100 flex justify-between items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {note.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {note.format.toUpperCase()} ·{" "}
                            {note.chunk_count} chunks ·{" "}
                            {new Date(note.created_at).toLocaleDateString("zh-CN")}
                          </p>
                        </div>

                        {/* 组合框：可选已有 + 手打新建 */}
                        <FolderPicker
                          current={note.folder || "未分类"}
                          options={folderNames}
                          onChange={(name) => changeFolder(note.id, name)}
                        />

                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-red-400 hover:text-red-600 text-xs shrink-0 ml-2"
                        >
                          删除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/** 可编辑的组合框：下拉选已有 + 手打新建 */
function FolderPicker({
  current,
  options,
  onChange,
}: {
  current: string;
  options: string[];
  onChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  return editing ? (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (value.trim() && value !== current) onChange(value);
        else setValue(current);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className="text-xs border border-blue-300 rounded px-2 py-1 w-20 focus:outline-none"
    />
  ) : (
    <select
      value={current}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          setValue("");
          setEditing(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
    >
      {options.map((f) => (
        <option key={f} value={f}>{f}</option>
      ))}
      <option value="__new__">＋ 新建...</option>
    </select>
  );
}
