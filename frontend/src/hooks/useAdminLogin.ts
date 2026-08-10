"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type MFAState = 'none' | 'enroll' | 'verify';

export function useAdminLogin() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  
  const [mfaState, setMfaState] = useState<MFAState>('none');
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
        setError("Silakan lakukan verifikasi keamanan");
        return;
      }

      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, turnstileToken, returnTo }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Email atau password salah");
        }

        // Check MFA status
        if (data.mfaRequired) {
          if (data.mfaEnrolled) {
            setMfaState('verify');
          } else {
            // Need to enroll
            const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              issuer: 'Pusdatin Kemenag Barito Utara',
              friendlyName: email,
            });

            if (enrollError) {
              throw new Error("Gagal menginisiasi pendaftaran 2FA: " + enrollError.message);
            }

            setMfaFactorId(enrollData.id);
            setQrCode(enrollData.totp.qr_code);
            setMfaState('enroll');
          }
          return;
        }

        // Fallback if no MFA required
        if (data.ssoLink) {
          window.location.href = data.ssoLink;
          return;
        }

      router.push("/dashboard/apps");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [email, password, turnstileToken, router, supabase],
  );

  const handleVerifyOTP = useCallback(async (e?: React.FormEvent) => {
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
      if (mfaState === 'verify' && !currentFactorId) {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw new Error("Gagal mengambil data 2FA");
        
        const totpFactor = factorsData.totp[0];
        if (!totpFactor) throw new Error("Tidak ada 2FA yang terdaftar");
        
        currentFactorId = totpFactor.id;
        setMfaFactorId(currentFactorId);
      }
      
      const challenge = await supabase.auth.mfa.challenge({ factorId: currentFactorId });
      if (challenge.error) {
        throw new Error("Gagal membuat tantangan 2FA: " + challenge.error.message);
      }
      
      const verify = await supabase.auth.mfa.verify({
        factorId: currentFactorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      
      if (verify.error) {
        throw new Error("Kode OTP salah atau kedaluwarsa");
      }
      
      // Verification successful, get SSO link from complete endpoint
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get("returnTo");
      
      const res = await fetch("/api/auth/mfa/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo, trustDevice }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menyelesaikan sesi login");
      }
      
      if (data.ssoLink) {
        window.location.href = data.ssoLink;
        return;
      }
      
      router.push("/dashboard/apps");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memverifikasi OTP");
    } finally {
      setLoading(false);
    }
  }, [verifyCode, mfaFactorId, mfaState, router, supabase, trustDevice]);

  const cancelMfa = () => {
    supabase.auth.signOut();
    setMfaState('none');
    setVerifyCode('');
    setError('');
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
