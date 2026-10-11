import { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/lib/env";
import { ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ onVerify, theme = "light" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "error" | "bypassed">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const isDev =
    (typeof window !== "undefined" && (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local")
    )) || Boolean(import.meta.env.DEV);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setErrorMessage(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;
    const MAX_POLLS = 60; // 6 seconds max wait

    const siteKey = env.turnstileSiteKey;

    if (!siteKey) {
      if (isDev) {
        console.info("[Turnstile Dev] Site Key belum diset di Infisical EV, mengaktifkan bypass otomatis.");
        setStatus("bypassed");
        onVerifyRef.current?.("XXXX.DEV_BYPASS_NO_KEY");
        return;
      }
      setStatus("error");
      setErrorMessage("Kunci verifikasi Turnstile belum terkonfigurasi di Infisical.");
      return;
    }

    const renderWidget = () => {
      if (!isMounted || !container) return;

      if (window.turnstile && typeof window.turnstile.render === "function") {
        try {
          if (widgetIdRef.current) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch {
              // Ignore widget remove error
            }
            widgetIdRef.current = null;
          }

          container.innerHTML = "";

          const id = window.turnstile.render(container, {
            sitekey: siteKey,
            theme,
            size: "flexible",
            callback: (token: string) => {
              if (!isMounted) return;
              setStatus("verified");
              setErrorMessage(null);
              onVerifyRef.current?.(token);
            },
            "expired-callback": () => {
              if (!isMounted) return;
              setStatus("ready");
              onVerifyRef.current?.("");
            },
            "error-callback": (err: string) => {
              console.warn("[Turnstile] Cloudflare Error:", err);
              if (!isMounted) return;
              if (isDev) {
                // In local development, Cloudflare rejects localhost if not added to widget domains.
                console.info(`[Turnstile Dev] Bypass diaktifkan untuk localhost (Kode CF: ${err}).`);
                setStatus("bypassed");
                onVerifyRef.current?.(`XXXX.DEV_BYPASS_CF_${err}`);
              } else {
                setStatus("error");
                setErrorMessage(`Verifikasi keamanan gagal (${err}). Silakan muat ulang.`);
              }
            },
          });

          widgetIdRef.current = id;
          if (status !== "verified") {
            setStatus("ready");
          }
        } catch (err) {
          console.error("[Turnstile] Render error:", err);
          if (isDev) {
            setStatus("bypassed");
            onVerifyRef.current?.("XXXX.DEV_BYPASS_RENDER_ERR");
          } else {
            setStatus("error");
            setErrorMessage("Gagal memuat widget keamanan Turnstile.");
          }
        }
      } else {
        pollCount++;
        if (pollCount > MAX_POLLS) {
          console.warn("[Turnstile] Timeout menunggu skrip challenges.cloudflare.com");
          if (isDev) {
            setStatus("bypassed");
            onVerifyRef.current?.("XXXX.DEV_BYPASS_TIMEOUT");
          } else {
            setStatus("error");
            setErrorMessage("Koneksi ke verifikasi keamanan Cloudflare timed out.");
          }
          return;
        }
        pollTimer = setTimeout(renderWidget, 100);
      }
    };

    // Check if script is already present in document or loaded globally
    const hasScript =
      typeof window.turnstile !== "undefined" ||
      document.querySelector('script[src*="turnstile"]') !== null;

    if (!hasScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => renderWidget();
      script.onerror = () => {
        if (!isMounted) return;
        if (isDev) {
          setStatus("bypassed");
          onVerifyRef.current?.("XXXX.DEV_BYPASS_SCRIPT_ERR");
        } else {
          setStatus("error");
          setErrorMessage("Gagal mengunduh skrip Cloudflare Turnstile.");
        }
      };
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup error
        }
        widgetIdRef.current = null;
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [theme, retryKey, isDev]);

  return (
    <div className="w-full my-3">
      {status === "loading" && (
        <div className="flex items-center justify-center p-3 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 animate-pulse min-h-[65px]">
          <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin text-emerald-600" />
          <span>Memverifikasi koneksi keamanan...</span>
        </div>
      )}

      {status === "bypassed" && (
        <div className="flex items-center justify-between p-3 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 min-h-[56px]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">Mode Dev: Verifikasi Keamanan Dilewati Otomatis</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 font-mono">
            Localhost
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-between p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50 min-h-[56px]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span>{errorMessage || "Verifikasi keamanan gagal."}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2 ml-2 flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Coba Lagi
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full min-h-[65px] flex items-center justify-center [&>iframe]:w-full [&>iframe]:!w-full [&>div]:w-full ${
          status === "bypassed" || status === "error" ? "hidden" : ""
        }`}
      />
    </div>
  );
}
