import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const body = await request.json().catch(() => ({ forgetDevice: false }));
    const cookieStore = await cookies();
    const trustedCookie = cookieStore.get('trusted_device')?.value;

    if (body.forgetDevice && session?.user && trustedCookie) {
      const deviceId = trustedCookie.split(".")[0];
      if (deviceId) {
        const { revokeTrustedDevice } = await import("@/lib/trusted-device");
        await revokeTrustedDevice(deviceId, session.user.id);
      }
      cookieStore.delete('trusted_device');
    }

    await supabase.auth.signOut({ scope: 'local' });
    return apiResponse({ ok: true });
  } catch {
    return apiResponse({ ok: true });
  }
}

