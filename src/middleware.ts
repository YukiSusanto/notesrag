/**
 * 简易密码保护中间件
 * 所有页面和 API 路由（除 /login）都需要登录
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD = process.env.ACCESS_PASSWORD;

export function middleware(req: NextRequest) {
  // 未设置密码则跳过
  if (!PASSWORD) return NextResponse.next();

  // 登录页 + 登录接口放行
  if (
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // 公开资源放行
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 检查 cookie
  const auth = req.cookies.get("auth_token");
  if (auth?.value === PASSWORD) return NextResponse.next();

  // API 请求返回 401
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  // 页面请求跳转到登录页
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
