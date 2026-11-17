"use server";

import { redirect } from "next/navigation";
import { rateLimit, signInAdmin, signOutAdmin } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000)) return "Too many sign-in attempts. Please wait 15 minutes and try again.";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await signInAdmin(email, password);
  if (!user) return "That email and password don't match.";
  redirect(user.must_change_password ? "/admin/settings?tab=account&first=1" : "/admin");
}

export async function logout() {
  await signOutAdmin();
  redirect("/admin/login");
}
