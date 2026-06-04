"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      setError("密码错误");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-lg shadow-md w-80"
    >
      <h1 className="text-xl font-bold mb-6 text-center">📒 笔记问答</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="请输入访问密码"
        className="w-full border border-gray-300 rounded px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        autoFocus
      />
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700"
      >
        登录
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Suspense fallback={<p>加载中...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
