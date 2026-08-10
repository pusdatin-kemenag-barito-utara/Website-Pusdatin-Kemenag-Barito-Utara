
import { useEffect, useRef } from "react";
import { env } from "@/lib/env";

interface TurnstileProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark";
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ onVerify, theme = "light" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !env.turnstileSiteKey) return;

    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !env.turnstileSiteKey) return;

      if (window.turnstile) {
        try {
          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }
          const id = window.turnstile.render(containerRef.current, {
            sitekey: env.turnstileSiteKey,
            theme,
            callback: onVerify,
            "expired-callback": () => onVerify(""),
            "error-callback": () => onVerify(""),
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.error("[Turnstile] Render error:", err);
        }
      } else {
        setTimeout(renderWidget, 150);
      }
    };

    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => renderWidget();
      document.body.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (err) {
          console.debug("[Turnstile] Cleanup note:", err);
        }
      }
    };
  }, [onVerify, theme]);

  if (!env.turnstileSiteKey) return null;

  return <div ref={containerRef} className="my-2 min-h-[65px] flex justify-center" />;
}
