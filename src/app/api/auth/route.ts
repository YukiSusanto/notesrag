import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.ACCESS_PASSWORD;

  if (!correct || password !== correct) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  // 设置 cookie（浏览器关闭后清除）
  response.cookies.set("auth_token", password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
