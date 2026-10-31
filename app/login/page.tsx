"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function explainAuthError(error: { message: string; code?: string }) {
  const details = `${error.code ?? ""} ${error.message}`.toLowerCase();
  const minimumLength = details.match(/at least\s+(\d+)\s+characters?/);
  if (minimumLength || details.includes("weak_password") || details.includes("password should")) {
    return minimumLength
      ? `密码至少需要 ${minimumLength[1]} 位，请检查后重试。`
      : "密码不符合安全要求，请检查密码长度和字符规则。";
  }
  if (details.includes("user already registered") || details.includes("email_exists") || details.includes("user_already_exists")) {
    return "该邮箱已被注册，请直接登录。";
  }
  if (details.includes("invalid login credentials") || details.includes("invalid_credentials")) {
    return "邮箱或密码错误，请检查后重试。";
  }
  if (details.includes("email not confirmed") || details.includes("email_not_confirmed")) {
    return "邮箱尚未验证，请先点击邮件中的确认链接。";
  }
  if (details.includes("rate limit") || details.includes("too many requests")) {
    return "操作太频繁，请稍后再试。";
  }
  if (details.includes("fetch") || details.includes("network")) {
    return "网络连接失败，请检查网络后重试。";
  }
  return "操作失败，请检查邮箱和密码后重试。";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup" && !username.trim()) {
      setMessage("");
      setError("请输入用户名。");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const supabase = createClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
      if (result.error) {
        setError(explainAuthError(result.error));
        return;
      }
      if (mode === "signup" && !result.data.session) {
        setMessage("注册成功，请查看邮箱并点击确认链接完成登录。");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("暂时无法连接登录服务，请检查网络后重试。");
    } finally {
      setBusy(false);
    }
  }

  return <main className="app-shell auth-page-shell">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></Link><Link className="back-link" href="/">← 返回首页</Link></header>
    <section className="auth-card">
      <span className="section-kicker">YOUR STUDY ACCOUNT</span>
      <h1>{mode === "login" ? "欢迎回来" : "创建学习账户"}</h1>
      <p>登录后，你的单词学习进度会保存到云端。</p>
      <div className="auth-mode-tabs"><button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>登录</button><button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>注册</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && <label>用户名<input type="text" autoComplete="nickname" minLength={2} maxLength={30} required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="设置一个昵称" /></label>}
        <label>邮箱<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label>密码<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 6 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "至少 6 位" : "请输入密码"} /></label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
        <button className="start-button" disabled={busy}>{busy ? "请稍候…" : mode === "login" ? "邮箱登录" : "创建账户"} <span>→</span></button>
      </form>
      <small className="auth-privacy-note">你的学习数据仅对你的账户可见。</small>
    </section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>每天一点积累，离目标更近一步。</span></footer>
  </main>;
}
