import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentSessionContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = await rateLimit(`login:${ip}`, 5, 60_000);
    if (!success) {
      return apiResponse({ message: "Terlalu banyak percobaan login. Silakan coba lagi nanti." }, 429);
    }

    const { email, password, turnstileToken, returnTo: bodyReturnTo } = await request.json();

    if (!email || !password || !turnstileToken) {
      return apiResponse({ message: "Email, password, dan verifikasi keamanan wajib diisi" }, 400);
    }

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.turnstileSecretKey,
        response: turnstileToken,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const verifyJson = await verifyRes.json();
    if (!verifyJson.success) {
      return apiResponse({ message: "Verifikasi keamanan gagal. Silakan coba lagi." }, 400);
    }

    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return apiResponse({ message: "Email atau password salah" }, 401);
    }

    const session = await getCurrentSessionContext(authData.user);
    if (!session.isAdmin || !session.user) {
      await supabase.auth.signOut({ scope: "local" });
      return apiResponse({ message: "Akun ini tidak memiliki akses ke portal Pusdatin" }, 403);
    }

    await recordAudit({
      action: "INSERT",
      target: `login:${authData.user.email}`,
      targetSchema: "kemenag_pusdatin",
      performedBy: authData.user.email ?? "unknown",
      ip,
    });

    const mfaEnrolled = authData.user.factors && authData.user.factors.some(f => f.factor_type === 'totp' && f.status === 'verified');

    let isTrusted = false;
    const cookieStore = await cookies();
    const trustedCookie = cookieStore.get('trusted_device')?.value;
    
    if (trustedCookie) {
      const { verifyTrustedDevice } = await import("@/lib/trusted-device");
      isTrusted = await verifyTrustedDevice(authData.user.id, trustedCookie);
    }

    const returnTo = bodyReturnTo || new URL(request.url).searchParams.get('returnTo');

    if (!isTrusted) {
      return apiResponse({
        user: session.user,
        token: authData.session?.access_token ?? "",
        mfaRequired: true,
        mfaEnrolled: mfaEnrolled,
      });
    }

    // Generate SSO link directly if MFA is skipped/not required
    if (returnTo) {
      const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminSupabaseClient();
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: session.user.email!,
        options: {
          redirectTo: returnTo
        }
      });

      if (!linkError && linkData?.properties?.action_link) {
        return apiResponse({
          ssoLink: linkData.properties.action_link
        });
      }
    }

    return apiResponse({
      user: session.user,
      token: authData.session?.access_token ?? "",
      mfaRequired: false,
      mfaEnrolled: mfaEnrolled,
    });
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    return apiResponse({ message: "Terjadi kesalahan server" }, 500);
  }
}
