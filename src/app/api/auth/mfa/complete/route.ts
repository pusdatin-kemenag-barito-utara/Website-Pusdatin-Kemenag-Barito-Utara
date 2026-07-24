import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return apiResponse({ message: "Tidak ada sesi aktif" }, 401);
    }

    // Verify AAL2 level
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== 'aal2') {
      return apiResponse({ message: "Sesi belum divalidasi dengan OTP" }, 403);
    }

    const { returnTo: bodyReturnTo, trustDevice } = await request.json().catch(() => ({ returnTo: null, trustDevice: false }));
    const returnTo = bodyReturnTo || new URL(request.url).searchParams.get('returnTo');

    if (trustDevice) {
      const userAgent = request.headers.get("user-agent") ?? undefined;
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;

      const { createTrustedDevice } = await import("@/lib/trusted-device");
      const cookieValue = await createTrustedDevice(session.user.id, userAgent, ipAddress);

      const cookieStore = await cookies();
      cookieStore.set('trusted_device', cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        sameSite: 'lax',
      });
    }

    if (returnTo) {
      // SSO Magic Link generation
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

    return apiResponse({ success: true });
  } catch (err) {
    console.error("[MFA COMPLETE] Error:", err);
    return apiResponse({ message: "Terjadi kesalahan server" }, 500);
  }
}
