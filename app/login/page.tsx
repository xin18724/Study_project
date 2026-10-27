"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    if (mode === "signup" && !result.data.session) {
      setMessage("注册成功，请查看邮箱并点击确认链接，然后返回登录。");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return <main className="app-shell auth-page-shell">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></Link><Link className="back-link" href="/">← 返回首页</Link></header>
    <section className="auth-card">
      <span className="section-kicker">YOUR STUDY ACCOUNT</span>
      <h1>{mode === "login" ? "欢迎回来" : "创建学习账户"}</h1>
      <p>登录后，你的单词学习进度会保存到云端。</p>
      <div className="auth-mode-tabs"><button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>登录</button><button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>注册</button></div>
      <form className="auth-form" onSubmit={submit}>
        <label>邮箱<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label>密码<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" /></label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
        <button className="start-button" disabled={busy}>{busy ? "请稍候…" : mode === "login" ? "邮箱登录" : "创建账户"} <span>→</span></button>
      </form>
      <small className="auth-privacy-note">你的学习数据仅对你的账户可见。</small>
    </section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>每天一点积累，离目标更近一步。</span></footer>
  </main>;
}
