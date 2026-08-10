
import { useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

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

function formatQrCode(qr: string): string {
  if (!qr) return "";
  if (qr.startsWith("data:") || qr.startsWith("http://") || qr.startsWith("https://")) {
    return qr;
  }
  if (qr.startsWith("<svg") || qr.includes("<svg")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
  }
  return qr;
}

export function useAdminLogin() {
  const supabase = createBrowserSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState("");

  const [mfaState, setMfaState] = useState<MFAState>("none");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, turnstileToken, returnTo }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
          console.error("[AUTH LOG ERROR] Login failed:", res.status, data);
          throw new Error(data.message || "Email atau password salah");
        }

        const token = data.token || "";
        setAuthToken(token);
        if (typeof window !== "undefined" && token) {
          localStorage.setItem("pusdatin_token", token);
        }

        // Sync session in browser Supabase client
        if (token) {
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: data.refreshToken || "",
          });
        }

        // Check MFA status
        if (data.mfaRequired) {
          if (data.mfaFactorId) {
            console.log("[AUTH LOG] Factor ID received from login response:", data.mfaFactorId);
            setMfaFactorId(data.mfaFactorId);
          }

          if (data.mfaEnrolled) {
            console.log("[AUTH LOG] User already has a verified 2FA factor. Switching to OTP verify...");
            if (!data.mfaFactorId) {
              try {
                const factorsRes = await fetch(`${env.supabaseUrl}/auth/v1/factors`, {
                  headers: {
                    "apikey": env.supabaseAnonKey,
                    "Authorization": `Bearer ${token}`,
                  },
                });
                const factorsData = await safeJson(factorsRes);
                const rawList = Array.isArray(factorsData)
                  ? factorsData
                  : Array.isArray(factorsData?.totp)
                  ? factorsData.totp
                  : Array.isArray(factorsData?.all)
                  ? factorsData.all
                  : [];
                const verifiedFactor = rawList.find((f: any) => f.status === "verified") || rawList[0];
                if (verifiedFactor?.id) {
                  setMfaFactorId(verifiedFactor.id);
                }
              } catch (e) {
                console.warn("[AUTH LOG] Pre-fetching factor ID warning:", e);
              }
            }
            setMfaState("verify");
            return;
          }

          // User does not have a verified factor yet: clean up stale unverified factors & enroll
          console.log("[AUTH LOG] Checking unverified factors for fresh enrollment...");
          try {
            const factorsRes = await fetch(`${env.supabaseUrl}/auth/v1/factors`, {
              headers: {
                "apikey": env.supabaseAnonKey,
                "Authorization": `Bearer ${token}`,
              },
            });
            const factorsData = await safeJson(factorsRes);
            const rawList = Array.isArray(factorsData)
              ? factorsData
              : Array.isArray(factorsData?.totp)
              ? factorsData.totp
              : Array.isArray(factorsData?.all)
              ? factorsData.all
              : [];

            const unverifiedFactors = rawList.filter((f: any) => f.status === "unverified");
            for (const uf of unverifiedFactors) {
              if (uf?.id) {
                console.log("[AUTH LOG] Deleting stale unverified factor:", uf.id);
                await fetch(`${env.supabaseUrl}/auth/v1/factors/${uf.id}`, {
                  method: "DELETE",
                  headers: {
                    "apikey": env.supabaseAnonKey,
                    "Authorization": `Bearer ${token}`,
                  },
                });
              }
            }
          } catch (e) {
            console.warn("[AUTH LOG] Cleanup stale factors warning:", e);
          }

          console.log("[AUTH LOG] Enrolling new TOTP factor for:", email);
          const uniqueFriendlyName = `${email}-${Date.now()}`;
          const enrollRes = await fetch(`${env.supabaseUrl}/auth/v1/factors`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": env.supabaseAnonKey,
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              factor_type: "totp",
              friendly_name: uniqueFriendlyName,
              issuer: "Pusdatin Kemenag Barito Utara",
            }),
          });

          const enrollData = await safeJson(enrollRes);
          if (!enrollRes.ok) {
            console.error("[AUTH LOG ERROR] MFA Enroll Failed:", enrollRes.status, enrollData);
            throw new Error(
              "Gagal menginisiasi pendaftaran 2FA: " + (enrollData.msg || enrollData.error_description || enrollData.message || JSON.stringify(enrollData)),
            );
          }

          console.log("[AUTH LOG] TOTP Factor created successfully:", enrollData.id);
          setMfaFactorId(enrollData.id);
          setQrCode(formatQrCode(enrollData.totp?.qr_code || ""));
          setMfaState("enroll");
          return;
        }

        // Fallback if no MFA required
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
    [email, password, turnstileToken, supabase],
  );

  const handleVerifyOTP = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!verifyCode || verifyCode.length !== 6) {
        setError("Kode OTP harus 6 angka");
        return;
      }

      setError("");
      setLoading(true);

      try {
        let currentFactorId = mfaFactorId;

        // If we are in 'verify' state and don't have factorId, fetch it
        if (mfaState === "verify" && !currentFactorId) {
          console.log("[AUTH LOG] Fetching factors list for verify...");
          const factorsRes = await fetch(`${env.supabaseUrl}/auth/v1/factors`, {
            headers: {
              "apikey": env.supabaseAnonKey,
              "Authorization": `Bearer ${authToken}`,
            },
          });
          const factorsData = await safeJson(factorsRes);
          const rawList = Array.isArray(factorsData)
            ? factorsData
            : Array.isArray(factorsData?.totp)
            ? factorsData.totp
            : Array.isArray(factorsData?.all)
            ? factorsData.all
            : [];
          const targetFactor = rawList.find((f: any) => f.status === "verified") || rawList[0];
          if (!factorsRes.ok || !targetFactor || !targetFactor.id) {
            console.error("[AUTH LOG ERROR] Failed to fetch factors:", factorsData);
            throw new Error("Gagal mengambil data 2FA");
          }
          currentFactorId = targetFactor.id;
          setMfaFactorId(currentFactorId);
        }

        console.log("[AUTH LOG] Creating MFA challenge for factor:", currentFactorId);
        const challengeRes = await fetch(
          `${env.supabaseUrl}/auth/v1/factors/${currentFactorId}/challenge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": env.supabaseAnonKey,
              "Authorization": `Bearer ${authToken}`,
            },
          },
        );
        const challengeData = await safeJson(challengeRes);
        if (!challengeRes.ok) {
          console.error("[AUTH LOG ERROR] MFA Challenge failed:", challengeData);
          throw new Error("Gagal membuat tantangan 2FA: " + (challengeData.msg || challengeData.message || "Unknown error"));
        }

        console.log("[AUTH LOG] Verifying MFA code...");
        const verifyRes = await fetch(
          `${env.supabaseUrl}/auth/v1/factors/${currentFactorId}/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": env.supabaseAnonKey,
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              challenge_id: challengeData.id,
              code: verifyCode,
            }),
          },
        );
        const verifyData = await safeJson(verifyRes);
        if (!verifyRes.ok) {
          console.error("[AUTH LOG ERROR] MFA Verify failed:", verifyData);
          throw new Error("Kode OTP salah atau kedaluwarsa");
        }

        const aal2Token = verifyData.access_token || authToken;

        if (verifyData.access_token) {
          await supabase.auth.setSession({
            access_token: verifyData.access_token,
            refresh_token: verifyData.refresh_token || "",
          });
        }

        console.log("[AUTH LOG] MFA verification succeeded. Completing login session with AAL2 token...");
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");

        const res = await fetch("/api/auth/mfa/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aal2Token}`,
          },
          body: JSON.stringify({ returnTo, trustDevice, accessToken: aal2Token }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
          console.error("[AUTH LOG ERROR] mfa/complete failed:", res.status, data);
          throw new Error(data.message || "Gagal menyelesaikan sesi login");
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("pusdatin_token", aal2Token);
        }

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
    [verifyCode, mfaFactorId, mfaState, authToken, trustDevice, supabase],
  );

  const cancelMfa = () => {
    supabase.auth.signOut();
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
