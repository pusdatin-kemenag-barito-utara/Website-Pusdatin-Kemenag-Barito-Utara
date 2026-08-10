import { db } from "@/lib/drizzle";
import { trustedDevices } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { env } from "./env";

function getSecretKey(): string {
  return env.trustedDeviceSecret;
}

function hashToken(rawToken: string): string {
  return crypto.createHmac("sha256", getSecretKey()).update(rawToken).digest("hex");
}

function parseUserAgent(userAgent?: string): string {
  if (!userAgent) return "Unknown Device";
  let os = "Unknown OS";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

  let browser = "Browser";
  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) browser = "Safari";

  return `${browser} on ${os}`;
}

export async function createTrustedDevice(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const deviceName = parseUserAgent(userAgent);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  const [inserted] = await db
    .insert(trustedDevices)
    .values({
      userId,
      tokenHash,
      deviceName,
      ipAddress: ipAddress ?? null,
      lastUsedAt: new Date(),
      expiresAt,
    })
    .returning({ id: trustedDevices.id });

  // Cookie payload format: {id}.{rawToken}
  return `${inserted.id}.${rawToken}`;
}

export async function verifyTrustedDevice(
  userId: string,
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue || !userId) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [deviceId, rawToken] = parts;
  if (!deviceId || !rawToken) return false;

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  try {
    const records = await db
      .select()
      .from(trustedDevices)
      .where(
        and(
          eq(trustedDevices.id, deviceId),
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.tokenHash, tokenHash),
          gt(trustedDevices.expiresAt, now)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return false;
    }

    // Update lastUsedAt asynchronously
    db.update(trustedDevices)
      .set({ lastUsedAt: now })
      .where(eq(trustedDevices.id, deviceId))
      .catch((err) => console.error("[TRUSTED DEVICE] Failed to update lastUsedAt:", err));

    return true;
  } catch (err) {
    console.error("[TRUSTED DEVICE] Verification error:", err);
    return false;
  }
}

export async function revokeTrustedDevice(deviceId: string, userId: string): Promise<boolean> {
  try {
    await db
      .delete(trustedDevices)
      .where(and(eq(trustedDevices.id, deviceId), eq(trustedDevices.userId, userId)));
    return true;
  } catch (err) {
    console.error("[TRUSTED DEVICE] Revoke error:", err);
    return false;
  }
}

export async function revokeAllUserDevices(userId: string): Promise<boolean> {
  try {
    await db.delete(trustedDevices).where(eq(trustedDevices.userId, userId));
    return true;
  } catch (err) {
    console.error("[TRUSTED DEVICE] Revoke all error:", err);
    return false;
  }
}
