"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { DEMO_PASSWORD, DEMO_USERS, isDemoUserEmail } from "@/lib/demo-users";
import { rateLimit } from "@/lib/rate-limit";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limited = rateLimit(`login:${ip}:${email}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: "Слишком много попыток входа. Подождите несколько минут." };
  }

  if (!email || !password) {
    return { error: "Укажите email и пароль." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный email или пароль." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

/** One-click login for demo accounts — only in development. */
export async function devQuickLoginAction(email: string) {
  if (process.env.NODE_ENV === "production") {
    return { error: "Недоступно." };
  }

  const normalized = email.trim().toLowerCase();
  if (!isDemoUserEmail(normalized)) {
    return { error: "Неизвестный демо-пользователь." };
  }

  const password = process.env.OWNER_PASSWORD ?? DEMO_PASSWORD;

  try {
    await signOut({ redirect: false });
    await signIn("credentials", {
      email: normalized,
      password,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Не удалось войти. Запустите npm run db:seed." };
    }
    throw error;
  }
}
