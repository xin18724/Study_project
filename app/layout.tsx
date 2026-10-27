import type { Metadata } from "next";
import AuthStatus from "@/components/AuthStatus";
import "./globals.css";

export const metadata: Metadata = { title: "英语Study", description: "用轻量练习积累高中英语高频词" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body><AuthStatus />{children}</body></html>; }
