"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    setSigningOut(false);
    if (!error) router.refresh();
  }

  return <div className="auth-bar"><div className="auth-bar-inner">
    {loading ? <span className="auth-muted">正在检查登录状态…</span> : email ? <>
      <span className="auth-user"><i aria-hidden="true"/> {email}</span>
      <button type="button" className="auth-link-button" onClick={signOut} disabled={signingOut}>{signingOut ? "正在退出…" : "退出登录"}</button>
    </> : <Link className="auth-signin-link" href="/login">登录 / 注册 <span>→</span></Link>}
  </div></div>;
}
