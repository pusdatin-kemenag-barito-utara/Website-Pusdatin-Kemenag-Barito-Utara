import { useEffect, useRef } from "react";
import { env } from "@/lib/env";

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

export function Turnstile({ onVerify, theme = "auto" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use configured sitekey or interactive challenge key
    const siteKey = env.turnstileSiteKey || "0x4AAAAAADR1O_LSp1lgc3km";

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const render = () => {
      if (!isMounted || !container) return;

      if (window.turnstile && typeof window.turnstile.render === "function") {
        try {
          if (widgetIdRef.current) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch (e) {
              console.debug("[Turnstile] Remove widget note:", e);
            }
            widgetIdRef.current = null;
          }

          container.innerHTML = "";

          const id = window.turnstile.render(container, {
            sitekey: siteKey,
            theme,
            size: "normal",
            callback: (token: string) => {
              if (isMounted && onVerifyRef.current) {
                onVerifyRef.current(token);
              }
            },
            "expired-callback": () => {
              if (isMounted && onVerifyRef.current) {
                onVerifyRef.current("");
              }
            },
            "error-callback": (err: string) => {
              console.warn("[Turnstile] Error callback:", err);
              // If domain error 110200 in localhost, fallback to interactive test key
              if (err === "110200" || err === "110100") {
                if (siteKey !== "3x00000000000000000000FF") {
                  console.info("[Turnstile] Localhost domain mismatch detected. Switching to interactive testing key...");
                  try {
                    container.innerHTML = "";
                    const testId = window.turnstile?.render(container, {
                      sitekey: "3x00000000000000000000FF",
                      theme,
                      size: "normal",
                      callback: (t: string) => {
                        if (isMounted && onVerifyRef.current) onVerifyRef.current(t);
                      },
                    });
                    if (testId) widgetIdRef.current = testId;
                  } catch (renderErr) {
                    console.error("[Turnstile] Fallback render error:", renderErr);
                  }
                }
              }
            },
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.error("[Turnstile] Render error:", err);
        }
      } else {
        pollInterval = setTimeout(render, 100);
      }
    };

    const scriptId = "cf-turnstile-script";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => render();
      document.head.appendChild(script);
    } else {
      render();
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearTimeout(pollInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {
          console.debug("[Turnstile] Cleanup note:", e);
        }
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [theme]);

  return (
    <div 
      ref={containerRef} 
      className="my-3 min-h-[65px] flex items-center justify-center" 
    />
  );
}
