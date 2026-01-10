"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** ile px scrolla w dĂłĹ‚ zanim zaczniemy chowaÄ‡ */
  hideAfter?: number;
  /** ile px â€śdrgaĹ„â€ť ignorowaÄ‡ */
  deadzone?: number;
  /** wysokoĹ›Ä‡ headera, ĹĽeby zrobiÄ‡ spacer i nie skakaĹ‚ layout */
  height?: number;
  /** jeĹ›li chcesz na mobile tylko: className="md:hidden" itd. */
  className?: string;
};

export default function HideOnScrollHeader({
  children,
  hideAfter = 24,
  deadzone = 6,
  height = 64,
  className,
}: Props) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY || 0;

    const onScroll = () => {
      const y = window.scrollY || 0;
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const prev = lastY.current;
        const delta = y - prev;

        // zapamiÄ™taj
        lastY.current = y;

        // zawsze pokaĹĽ gdy jesteĹ›my blisko gĂłry
        if (y < hideAfter) {
          setHidden(false);
          ticking.current = false;
          return;
        }

        // deadzone na mikro scroll
        if (Math.abs(delta) < deadzone) {
          ticking.current = false;
          return;
        }

        // scroll w dĂłĹ‚ -> chowaj, w gĂłrÄ™ -> pokazuj
        if (delta > 0) setHidden(true);
        else setHidden(false);

        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideAfter, deadzone]);

  return (
    <>
      {/* spacer ĹĽeby treĹ›Ä‡ nie â€śpodskakiwaĹ‚aâ€ť */}
      <div style={{ height }} />
      <div
        className={className}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          transform: hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 180ms ease",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </>
  );
}

