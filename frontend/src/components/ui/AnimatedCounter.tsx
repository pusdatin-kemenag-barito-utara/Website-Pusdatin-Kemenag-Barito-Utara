import { useEffect, useState, useRef } from "react";

export function AnimatedCounter({ value, duration = 600 }: { value: number; duration?: number }) {
  const targetValue = Number(value) || 0;
  // Initialize with targetValue for SSR so HTML immediately has the real number
  const [count, setCount] = useState(targetValue);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * targetValue));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        setCount(targetValue);
      }
    };
    frameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frameId);
  }, [targetValue, duration]);

  return <span ref={ref}>{count}</span>;
}
