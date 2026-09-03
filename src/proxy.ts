import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionValue } from "@/lib/admin-auth";

export const config = {
  matcher: ["/admin/:path*", "/install/:token"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Non-browser clients hitting the human install page get the JSON manifest.
  if (pathname.startsWith("/install/")) {
    const accept = request.headers.get("accept") ?? "";
    if (!accept.includes("text/html")) {
      const url = request.nextUrl.clone();
      url.pathname = `/api${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const secret = process.env.ADMIN_SESSION_SECRET;
    const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
    const ok = secret ? await verifySessionValue(secret, cookie) : false;
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
