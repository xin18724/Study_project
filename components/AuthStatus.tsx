"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const router = useRouter();
  const [account, setAccount] = useState<{ name: string; avatar: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      const email = user?.email ?? "";
      const metadata = user?.user_metadata ?? {};
      setAccount(user ? {
        name: (typeof metadata.username === "string" && metadata.username.trim()) || email.split("@")[0] || "学习者",
        avatar: typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null,
      } : null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const email = user?.email ?? "";
      const metadata = user?.user_metadata ?? {};
      setAccount(user ? {
        name: (typeof metadata.username === "string" && metadata.username.trim()) || email.split("@")[0] || "学习者",
        avatar: typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null,
      } : null);
      setLoading(false);
    });
    function handleUsernameUpdated(event: Event) {
      const username = (event as CustomEvent<string>).detail;
      if (typeof username === "string" && username.trim()) {
        setAccount((current) => current ? { ...current, name: username.trim() } : current);
      }
    }
    window.addEventListener("junior-study:username-updated", handleUsernameUpdated);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("junior-study:username-updated", handleUsernameUpdated);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    setSigningOut(false);
    if (!error) router.refresh();
  }

  return <div className="auth-bar"><div className="auth-bar-inner">
    {loading ? <span className="auth-muted">正在检查登录状态…</span> : account ? <>
      <span className="auth-user">{account.avatar ? <img className="auth-avatar" src={account.avatar} alt="" /> : <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">{account.name.slice(0, 1).toUpperCase()}</span>}<span className="auth-user-copy"><strong>{account.name}</strong><Link href="/profile" className="auth-profile-link">个人设置</Link></span></span>
      <button type="button" className="auth-link-button" onClick={signOut} disabled={signingOut}>{signingOut ? "正在退出…" : "退出登录"}</button>
    </> : <Link className="auth-signin-link" href="/login">登录 / 注册 <span>→</span></Link>}
  </div></div>;
}
