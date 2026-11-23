"use server";

import { redirect } from "next/navigation";
import { rateLimit, signInAdmin, signOutAdmin, createPasswordResetToken, checkPasswordResetToken, setAdminPassword } from "@/lib/auth";
import { sendAdminPasswordReset } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
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

export async function requestPasswordReset(_prev: string | null, formData: FormData): Promise<string | null> {
  const ip = await clientIp();
  const done = "If that email belongs to the dashboard, a reset link is on its way. Check your inbox (and spam) in a few minutes.";
  if (!rateLimit(`reset:${ip}`, 5, 60 * 60_000)) return done;
  const email = String(formData.get("email") ?? "");
  const r = await createPasswordResetToken(email);
  if (r && rateLimit(`reset-email:${r.email}`, 3, 60 * 60_000)) {
    try {
      await sendAdminPasswordReset(r.email, `${siteUrl()}/admin/reset?token=${encodeURIComponent(r.token)}`);
    } catch {}
  }
  return done;
}

export async function resetPassword(_prev: string | null, formData: FormData): Promise<string | null> {
  const ip = await clientIp();
  if (!rateLimit(`reset-submit:${ip}`, 10, 15 * 60_000)) return "Too many attempts. Please wait 15 minutes and try again.";
  const id = await checkPasswordResetToken(String(formData.get("token") ?? ""));
  if (!id) return "This reset link has expired or has already been used. Please ask for a new one.";
  const next = String(formData.get("next") ?? "");
  if (next.length < 12) return "Choose a password of at least 12 characters.";
  if (next !== String(formData.get("confirm") ?? "")) return "The two passwords don't match.";
  setAdminPassword(id, next);
  redirect("/admin/login?reset=1");
}
