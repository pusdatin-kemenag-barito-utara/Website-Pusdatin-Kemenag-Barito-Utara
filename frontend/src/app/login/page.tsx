"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Turnstile } from "@/components/ui/Turnstile";
import { useAdminLogin } from "@/hooks/useAdminLogin";
import { Lock, Mail, Eye, EyeOff, QrCode, KeyRound, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const {
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
  } = useAdminLogin();

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left Section - Branding/Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 overflow-hidden items-center justify-center">
        {/* Decorative background shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-900 to-green-950"></div>

        {/* Glowing orbs */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/20 blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-green-400/10 blur-[100px] mix-blend-screen pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center px-12 animate-fade-in-up">
          <div className="rounded-full bg-white/10 p-6 backdrop-blur-md border border-white/20 mb-8 shadow-2xl">
            <img
              src="/branding/pusdatin.png"
              alt="PUSDATIN"
              className="h-24 w-auto drop-shadow-lg object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight drop-shadow-sm">
            PUSDATIN (Pusat Data & Informasi)
          </h1>
          <p className="text-emerald-50 text-lg max-w-md font-light leading-relaxed opacity-90">
            Sistem Informasi Manajemen dan Integrasi Data Terpadu Kementerian
            Agama Kabupaten Barito Utara
          </p>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white dark:bg-slate-900 relative">
        {/* Back to Web Button */}
        <a 
          href="/" 
          className="absolute top-6 left-6 lg:top-8 lg:left-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Halaman Utama</span>
        </a>

        <div className="mx-auto w-full max-w-sm animate-fade-in-up mt-12 lg:mt-0">
          {/* Mobile Header */}
          <div className="mb-10 lg:hidden text-center flex flex-col items-center">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 p-4 mb-4">
              <img
                src="/branding/pusdatin.png"
                alt="PUSDATIN"
                className="h-16 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Pusdatin Kemenag
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto">
              Portal Pusat Data dan Teknologi Informasi Kemenag Barito Utara
            </p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Selamat Datang
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Silakan masuk ke akun Anda untuk melanjutkan.
            </p>
          </div>

          {mfaState === 'none' && (
            <div className="bg-white dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent lg:shadow-none shadow-xl lg:border-none border border-slate-100 dark:border-slate-800 rounded-2xl p-6 lg:p-0 animate-fade-in-up">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <Input
                    id="email"
                    label="Alamat Email"
                    type="email"
                    placeholder="admin@kemenag.go.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                    required
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  />
                </div>

                <div className="space-y-1 relative">
                  <Input
                    id="password"
                    label="Kata Sandi"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                    required
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="pt-2 flex justify-center">
                  <Turnstile onVerify={setTurnstileToken} />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <svg className="h-4 w-4 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 py-6 text-base font-medium rounded-xl transition-all hover:-translate-y-0.5 mt-4"
                >
                  Masuk ke Dasbor
                </Button>
              </form>
            </div>
          )}

          {mfaState !== 'none' && (
            <div className="bg-white dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent lg:shadow-none shadow-xl lg:border-none border border-slate-100 dark:border-slate-800 rounded-2xl p-6 lg:p-0 animate-fade-in-up">
              <div className="mb-6">
                <button 
                  onClick={cancelMfa}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 mb-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </button>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Verifikasi 2-Langkah
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {mfaState === 'enroll' 
                    ? "Pindai kode QR ini menggunakan aplikasi Google Authenticator, lalu masukkan 6 angka yang muncul." 
                    : "Masukkan 6 angka dari aplikasi Google Authenticator Anda."}
                </p>
              </div>

              {mfaState === 'enroll' && qrCode && (
                <div className="flex justify-center mb-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                  <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="space-y-1">
                  <Input
                    id="totp"
                    label="Kode OTP"
                    type="text"
                    placeholder="******"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    icon={<KeyRound className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                    required
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 text-center tracking-[0.75em] font-mono text-2xl py-6 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 pb-1 ml-1">
                  <input 
                    type="checkbox" 
                    id="trustDevice" 
                    checked={trustDevice} 
                    onChange={(e) => setTrustDevice(e.target.checked)} 
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-800"
                  />
                  <label htmlFor="trustDevice" className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    Percayai perangkat ini selama 30 hari
                  </label>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <svg className="h-4 w-4 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  disabled={verifyCode.length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 py-6 text-base font-medium rounded-xl transition-all hover:-translate-y-0.5 mt-4"
                >
                  Verifikasi & Masuk
                </Button>
              </form>
            </div>
          )}

          <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-emerald-700 dark:text-emerald-500">
              Pusdatin Kemenag Barito Utara
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
