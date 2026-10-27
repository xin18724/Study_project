import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, origin: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const destination = new URL(value, origin);
    return destination.origin === origin ? `${destination.pathname}${destination.search}${destination.hash}` : "/";
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), request.nextUrl.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next || "/", request.url));
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
}
