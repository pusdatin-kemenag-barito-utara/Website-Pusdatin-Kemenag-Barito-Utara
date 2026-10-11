import { useState, useCallback } from "react";
import { pb } from "@/lib/pocketbase/client";
import { trackAuthEvent } from "@/lib/analytics";

export type MFAState = "none" | "enroll" | "verify";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function useAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState("");

  const [mfaState, setMfaState] = useState<MFAState>("none");
  const [qrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      if (!turnstileToken) {
        console.warn("[AUTH LOG] Turnstile token missing");
        setError("Silakan lakukan verifikasi keamanan");
        return;
      }

      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");

        console.log("[AUTH LOG] Attempting login for:", email);
        trackAuthEvent("login_attempt", { email });
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, turnstileToken, returnTo }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
          console.error("[AUTH LOG ERROR] Login failed:", res.status, data);
          trackAuthEvent("login_failure", { error: data.message || "Invalid credentials" });
          throw new Error(data.message || "Email atau password salah");
        }

        const token = data.token || "";
        setAuthToken(token);
        if (typeof window !== "undefined" && token) {
          localStorage.setItem("pusdatin_token", token);
          try {
            pb.authStore.save(token, data.user as any);
          } catch (e) {
            console.warn("[AUTH LOG] PocketBase authStore save:", e);
          }
        }

        // Check MFA status
        if (data.mfaRequired) {

          if (data.mfaEnrolled) {
            setMfaState("verify");
            return;
          }
          // Direct completion if no enrolled factors
          const mfaRes = await fetch("/api/auth/mfa/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ returnTo, trustDevice: true, accessToken: token }),
          });
          const mfaData = await safeJson(mfaRes);
          if (mfaData.ssoLink) {
            window.location.href = mfaData.ssoLink;
            return;
          }
          window.location.href = "/dashboard/apps";
          return;
        }

        trackAuthEvent("login_success", { mfa_verified: false });

        if (data.ssoLink) {
          window.location.href = data.ssoLink;
          return;
        }

        window.location.href = "/dashboard/apps";
      } catch (err) {
        console.error("[AUTH LOG ERROR] Exception during handleSubmit:", err);
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [email, password, turnstileToken],
  );

  const handleVerifyOTP = useCallback(
    async (e?: React.SyntheticEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
      if (!verifyCode || verifyCode.length !== 6) {
        setError("Kode OTP harus 6 angka");
        return;
      }

      setError("");
      setLoading(true);

      try {
        console.log("[AUTH LOG] Completing login session via MFA endpoint...");
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");

        const res = await fetch("/api/auth/mfa/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({ returnTo, trustDevice, accessToken: authToken }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
          console.error("[AUTH LOG ERROR] mfa/complete failed:", res.status, data);
          throw new Error(data.message || "Gagal menyelesaikan sesi login");
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("pusdatin_token", authToken);
        }

        trackAuthEvent("login_success", { mfa_verified: true });

        if (data.ssoLink) {
          window.location.href = data.ssoLink;
          return;
        }

        window.location.href = "/dashboard/apps";
      } catch (err) {
        console.error("[AUTH LOG ERROR] Exception during handleVerifyOTP:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memverifikasi OTP",
        );
      } finally {
        setLoading(false);
      }
    },
    [verifyCode, authToken, trustDevice],
  );

  const cancelMfa = () => {
    try {
      pb.authStore.clear();
      localStorage.removeItem("pusdatin_token");
    } catch {
      // ignore
    }
    setMfaState("none");
    setVerifyCode("");
    setError("");
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    turnstileToken,
    setTurnstileToken,
    loading,
    error,
    handleSubmit,
    mfaState,
    qrCode,
    verifyCode,
    setVerifyCode,
    trustDevice,
    setTrustDevice,
    handleVerifyOTP,
    cancelMfa,
  };
}
