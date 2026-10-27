"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const { data, error: loadError } = await createClient().auth.getUser();
      if (cancelled) return;
      if (loadError || !data.user) {
        setError("暂时无法读取个人资料，请重新登录后再试。");
      } else {
        const storedUsername = data.user.user_metadata?.username;
        setUsername(typeof storedUsername === "string" ? storedUsername : data.user.email?.split("@")[0] ?? "");
      }
      setLoading(false);
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsername = username.trim();
    if (!nextUsername) {
      setError("请输入用户名。");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const { error: updateError } = await createClient().auth.updateUser({
      data: { username: nextUsername },
    });
    setSaving(false);
    if (updateError) {
      setError(updateError.message || "保存失败，请稍后重试。");
      return;
    }
    setUsername(nextUsername);
    setSuccess("修改成功");
    window.dispatchEvent(new CustomEvent("junior-study:username-updated", { detail: nextUsername }));
  }

  return <main className="app-shell auth-page-shell">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></Link><Link className="back-link" href="/">← 返回首页</Link></header>
    <section className="auth-card profile-card">
      <span className="section-kicker">YOUR PROFILE</span>
      <h1>个人设置</h1>
      <p>修改在导航栏显示的用户名。</p>
      {loading ? <div className="profile-loading" role="status">正在读取个人资料…</div> : <form className="auth-form" onSubmit={saveUsername}>
        <label>用户名<input type="text" autoComplete="nickname" minLength={2} maxLength={30} required value={username} onChange={(event) => { setUsername(event.target.value); setSuccess(""); }} placeholder="请输入用户名" /></label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        {success && <p className="auth-feedback auth-success" role="status">{success}</p>}
        <button className="start-button" disabled={saving || !username.trim()}>{saving ? "正在保存…" : "保存修改"} <span>→</span></button>
      </form>}
    </section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>每天一点积累，离目标更近一步。</span></footer>
  </main>;
}
