import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const returnTo = request.nextUrl.searchParams.get("returnTo");
    
    if (!returnTo) {
      return NextResponse.json({ message: "Missing returnTo parameter" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with the returnTo parameter
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(loginUrl);
    }

    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminSupabaseClient();
    
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: user.email!,
      options: {
        redirectTo: returnTo,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[SSO JUMP] Generate link error:", linkError);
      return NextResponse.json({ message: "Failed to generate SSO link" }, { status: 500 });
    }

    return NextResponse.redirect(linkData.properties.action_link);
  } catch (error) {
    console.error("[SSO JUMP] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
