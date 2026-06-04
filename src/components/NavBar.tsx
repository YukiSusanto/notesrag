"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "💬 问答" },
    { href: "/upload", label: "📤 导入" },
    { href: "/notes", label: "📋 笔记" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
      <span className="text-lg font-bold text-gray-800">📒 笔记问答</span>
      <nav className="flex gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              pathname === l.href
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
