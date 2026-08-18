"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { DEMO_PASSWORD, DEMO_USERS, isDemoUserEmail } from "@core/auth/demo-users";
import { assertLoginAllowed } from "@core/auth/login-guard";
import { setLoginRequestIp } from "@core/auth/login-context";
import { isValidPhone, normalizePhone } from "@core/shared/phone";

function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const mode = String(formData.get("loginMode") ?? "admin");
  const h = await headers();
  const ip = clientIp(h);

  if (mode === "employee") {
    const phoneRaw = String(formData.get("phone") ?? "").trim();
    const pin = String(formData.get("pin") ?? "").trim();

    if (!phoneRaw || !pin) {
      return { error: "Укажите номер телефона и код." };
    }
    if (!isValidPhone(phoneRaw)) {
      return { error: "Некорректный номер телефона." };
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return { error: "Код должен содержать 4–6 цифр." };
    }

    const phone = normalizePhone(phoneRaw);
    const guard = assertLoginAllowed(ip, phone);
    if (!guard.ok) {
      return { error: guard.error };
    }

    setLoginRequestIp(ip);
    try {
      await signIn("credentials", {
        phone,
        pin,
        redirectTo: "/",
      });
      return {};
    } catch (error) {
      if (error instanceof AuthError) {
        return { error: "Неверный номер или код." };
      }
      throw error;
    }
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Укажите email и пароль." };
  }

  const guard = assertLoginAllowed(ip, email);
  if (!guard.ok) {
    return { error: guard.error };
  }

  setLoginRequestIp(ip);
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
    setLoginRequestIp("dev-local");
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
