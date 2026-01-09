"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NavLink from "./NavLink";
import { AppBrand } from "../components/AppBrand";
import ThemeSwitcher from "../components/ThemeSwitcher";

export default function TopNav() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current && y > 80) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{
        background: "rgba(7,13,24,0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* LEWA STRONA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AppBrand />
          <ThemeSwitcher />
        </div>

        {/* PRAWA STRONA */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <NavLink href="/dashboard" active={pathname === "/dashboard"}>
            Dashboard
          </NavLink>
          <NavLink href="/contacts" active={pathname.startsWith("/contacts")}>
            Kontakty
          </NavLink>
          <NavLink href="/leads" active={pathname.startsWith("/leads")}>
            Leady
          </NavLink>
          <NavLink href="/calendar" active={pathname.startsWith("/calendar")}>
            Kalendarz
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
