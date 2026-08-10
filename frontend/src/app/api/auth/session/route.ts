import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentSessionContext();
    return apiResponse({
      authenticated: session.isAuthenticated,
      user: session.user,
      permissions: {
        isAdmin: session.isAdmin,
        role: session.user?.role ?? null,
      },
    });
  } catch {
    return apiResponse({ authenticated: false, user: null }, 401);
  }
}
