"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import NavLink from "./NavLink";
import { AppBrand } from "./AppBrand";
<ThemeSwitcher />

export default function TopNav() {
  const [hidden, setHidden] = useState(false);

  const lastY = useRef(0);
  const ticking = useRef(false);

  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const pathname = usePathname();

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  // ✅ zamykaj menu po zmianie trasy (klik w link)
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * ✅ ZACHOWANIE:
   * - chowaj topbar gdy użytkownik scrolluje w dół
   * - pokaż dopiero gdy użytkownik wróci na samą górę (y < 8)
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    lastY.current = window.scrollY || 0;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const delta = y - lastY.current;

        if (y < 8) {
          setHidden(false);
          lastY.current = y;
          ticking.current = false;
          return;
        }

        const TH = 10;
        if (delta > TH) setHidden(true);

        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ klik w link w dropdown -> zamknij details
  const onDropdownClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement | null;
    const a = el?.closest?.("a");
    if (a) closeMenu();
  };

  return (
    <>
      {/* ✅ CSS tylko do responsywnego menu (bez zmian wizualnych) */}
      <style>{`
        .ce-desktop-links { display: none; }
        .ce-mobile-menu { display: block; }

        @media (min-width: 900px) {
          .ce-desktop-links { display: flex; }
          .ce-mobile-menu { display: none; }
        }

        .ce-hamburger {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: var(--text-main);
          font-weight: 800;
          cursor: pointer;
          user-select: none;
        }
        .ce-hamburger:active { transform: translateY(1px); }

        summary { list-style: none; }
        summary::-webkit-details-marker { display: none; }

        .ce-dropdown {
          margin-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.10);
          padding-top: 12px;

          max-height: 70vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ce-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        /* delikatne nagłówki sekcji w dropdown (bez wpływu na wygląd linków) */
        .ce-group-title{
          margin-top: 6px;
          padding: 6px 10px 2px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(238,242,255,0.55);
        }
      `}</style>

      {/* TOP NAV */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border-soft)",
          background: "rgba(7, 13, 24, 0.72)",
          backdropFilter: "blur(10px)",

          transform: hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 220ms ease",
          willChange: "transform",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {/* LOGO */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 900,
              letterSpacing: -0.4,
              fontSize: 16,
              color: "var(--text-main)",
            }}
          >
            <AppBrand />
          </div>

          {/* ✅ MOBILE */}
          <div className="ce-mobile-menu">
            <details ref={detailsRef}>
              <summary className="ce-hamburger">☰ Menu</summary>

              <div className="ce-dropdown" onClick={onDropdownClick}>
                <div className="ce-grid">
                  <div className="ce-group-title">CRM</div>
                  <NavLink href="/dashboard">📊 Dashboard</NavLink>
                  <NavLink href="/leads">📞 Leady</NavLink>
                  <NavLink href="/contacts">👥 Kontakty</NavLink>
                  <NavLink href="/agents">🧑‍💼 Agenci</NavLink>

                  <div className="ce-group-title">Oferty i pozyski</div>
                  <NavLink href="/prospects">🎯 Pozyski</NavLink>
                  <NavLink href="/properties">🏠 Nieruchomości</NavLink>

                  <div className="ce-group-title">Realizacja</div>
                  <NavLink href="/calendar">📅 Kalendarz</NavLink>
                  <NavLink href="/followups">🔔 Follow-up</NavLink>

                  <div className="ce-group-title">AI</div>
                  <NavLink href="/analyzed">🤖 AI: Analiza</NavLink>
                  <NavLink href="/assistant/live">🎧 AI: Coach</NavLink>

                  <div className="ce-group-title">Pozostałe</div>
                  <NavLink href="/market">🌍 Market</NavLink>
                  <NavLink href="/voice-notes">🎙️ Głosówki</NavLink>
                  <NavLink href="/documents/sale">📄 Dokumenty (sprzedaż)</NavLink>
                </div>
              </div>
            </details>
          </div>

          {/* ✅ DESKTOP */}
          <div
            className="ce-desktop-links"
            style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}
          >
            {/* CRM */}
            <NavLink href="/dashboard">📊 Dashboard</NavLink>
            <NavLink href="/leads">📞 Leady</NavLink>
            <NavLink href="/contacts">👥 Kontakty</NavLink>
            <NavLink href="/agents">🧑‍💼 Agenci</NavLink>

            {/* Oferty i pozyski */}
            <NavLink href="/prospects">🎯 Pozyski</NavLink>
            <NavLink href="/properties">🏠 Nieruchomości</NavLink>

            {/* Realizacja */}
            <NavLink href="/calendar">📅 Kalendarz</NavLink>
            <NavLink href="/followups">🔔 Follow-up</NavLink>

            {/* AI razem */}
            <NavLink href="/analyzed">🤖 AI: Analiza</NavLink>
            <NavLink href="/assistant/live">🎧 AI: Coach</NavLink>

            {/* Pozostałe */}
            <NavLink href="/market">🌍 Market</NavLink>
            <NavLink href="/voice-notes">🎙️ Głosówki</NavLink>
            <NavLink href="/documents/sale">📄 Dokumenty</NavLink>
          </div>
        </div>
      </nav>
    </>
  );
}
