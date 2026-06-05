"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "问答", icon: "💬" },
  { href: "/upload", label: "导入", icon: "📤" },
  { href: "/notes", label: "笔记", icon: "📋" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* 折叠态遮罩（移动端点击关闭） */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-30 ${
          open ? "w-48" : "w-14"
        }`}
      >
        {/* 折叠按钮 */}
        <button
          onClick={() => setOpen(!open)}
          className="h-12 flex items-center justify-center hover:bg-gray-100 text-gray-500 text-lg"
        >
          {open ? "◀" : "▶"}
        </button>

        {/* 导航项 */}
        <nav className="flex-1 pt-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 mx-1 rounded-lg transition-colors text-sm ${
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title={item.label}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {open && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 底部占位（留给后续对话历史） */}
        <div className="p-2 border-t border-gray-100">
          {open && (
            <p className="text-xs text-gray-400 text-center">对话历史</p>
          )}
        </div>
      </aside>
    </>
  );
}
