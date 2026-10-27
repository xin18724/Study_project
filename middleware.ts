import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const isPublicRoute = pathname === "/login" || pathname === "/auth/callback";
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (isPublicRoute) return response;
    return NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (!claims && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (claims && pathname === "/login") {
    const homeResponse = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((cookie) => homeResponse.cookies.set(cookie));
    return homeResponse;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
