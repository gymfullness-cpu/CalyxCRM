import { Inter } from "next/font/google";
import "./globals.css";
import NavLink from "./NavLink";
import Script from "next/script";
import CalliWidget from "./components/CalliWidget";
import MarketingPixels from "./components/MarketingPixels";
import ThemeSwitcher from "./components/ThemeSwitcher";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  applicationName: "Calyx AI",
  title: "Calyx AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
  other: {
    "link:satoshi": "https://fonts.cdnfonts.com/css/satoshi",
  },
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/satoshi" />
      </head>

      <body className={inter.className}>
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
          }

          #ce-mobile-dropdown {
            max-height: calc(100vh - 120px);
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            padding-right: 4px;
          }

          .ce-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          @media (max-width: 360px) {
            .ce-grid { grid-template-columns: 1fr; }
          }

          @media (min-width: 900px) {
            .ce-grid { grid-template-columns: 1fr; }
          }

          #ce-topnav {
            transform: translateY(0);
            transition: transform 220ms ease;
            will-change: transform;
          }
          #ce-topnav.ce-nav-hidden {
            transform: translateY(-110%);
          }
        `}</style>

        <Script id="ce-nav-behavior" strategy="afterInteractive">{`
          (function () {
            var nav = document.getElementById('ce-topnav');
            var details = document.getElementById('ce-mobile-details');
            if (!nav) return;

            var lastY = window.scrollY || 0;
            var ticking = false;
            var TH = 10;

            function onScroll() {
              if (ticking) return;
              ticking = true;

              window.requestAnimationFrame(function () {
                var y = window.scrollY || 0;
                var delta = y - lastY;

                if (y < 8) {
                  nav.classList.remove('ce-nav-hidden');
                  lastY = y;
                  ticking = false;
                  return;
                }

                if (delta > TH) nav.classList.add('ce-nav-hidden');
                else if (delta < -TH) nav.classList.remove('ce-nav-hidden');

                lastY = y;
                ticking = false;
              });
            }

            window.addEventListener('scroll', onScroll, { passive: true });

            function closeMenu() {
              if (details && details.open) details.open = false;
            }

            document.addEventListener('click', function (e) {
              var t = e.target;
              if (!t) return;
              var a = t.closest ? t.closest('a') : null;
              if (!a) return;

              var inDropdown = a.closest && a.closest('#ce-mobile-dropdown');
              if (inDropdown) closeMenu();
            }, true);

            var _pushState = history.pushState;
            var _replaceState = history.replaceState;

            function notifyRouteChange() {
              try { window.dispatchEvent(new Event('ce-route-change')); } catch (e) {}
            }

            history.pushState = function () {
              _pushState.apply(this, arguments);
              notifyRouteChange();
            };
            history.replaceState = function () {
              _replaceState.apply(this, arguments);
              notifyRouteChange();
            };

            window.addEventListener('popstate', notifyRouteChange);
            window.addEventListener('ce-route-change', function () {
              closeMenu();
            });
          })();
        `}</Script>

        <nav
          id="ce-topnav"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            borderBottom: "1px solid var(--border-soft)",
            background: "rgba(7, 13, 24, 0.72)",
            backdropFilter: "blur(10px)",
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
            {/* LEWA: logo + ThemeSwitcher obok, bez napisu Navy/Mint */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                fontWeight: 900,
                letterSpacing: -0.4,
                fontSize: 16,
                color: "var(--text-main)",
              }}
            >
              <img
                src="/icons/icon-192.png"
                alt="Calyx AI"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  boxShadow: "0 6px 18px rgba(45,212,191,0.25)",
                }}
              />
              <span
                style={{
                  fontFamily:
                    "Satoshi, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Calyx AI
              </span>

              {/* … tu jest przeÄąâ€šć…cznik motywów */}
              <ThemeSwitcher />
            </div>

            {/* MOBILE */}
            <div className="ce-mobile-menu">
              <details id="ce-mobile-details">
                <summary className="ce-hamburger">ÂÂ° Menu</summary>

                <div className="ce-dropdown" id="ce-mobile-dropdown">
                  <div className="ce-grid">
                    <NavLink href="/dashboard">📊 Ĺ  Dashboard</NavLink>
                    <NavLink href="/leads">📊 Ĺľ Leady</NavLink>
                    <NavLink href="/contacts">â€Ä„ Kontakty</NavLink>
                    <NavLink href="/agents">Â§â€â‚¬Ĺ¤’Ä˝ Agenci</NavLink>

                    <NavLink href="/prospects">Ĺ» Pozyski</NavLink>
                    <NavLink href="/prospects/intake">Â§Äľ Pozyski z formularzy</NavLink>
                    <NavLink href="/prospects/ads">📊 Ĺ Reklamy / Social</NavLink>
                    <NavLink href="/prospects/form">📊 ĹĄ Formularz</NavLink>

                    <NavLink href="/properties">ĹąÂ  NieruchomoÄąâ€şci</NavLink>

                    <NavLink href="/calendar">📊 … Kalendarz</NavLink>
                    <NavLink href="/followups">”” Follow-up</NavLink>

                    <NavLink href="/analyzed">Â¤â— AI: Analiza</NavLink>
                    <NavLink href="/assistant/live">Â§ AI: Coach</NavLink>

                    <NavLink href="/news">â—ĹľÄ🏠Â¸Ĺą Prasówka</NavLink>
                    <NavLink href="/newsletter">â€°Ä🏠Â¸Ĺą Newsletter</NavLink>
                    <NavLink href="/market">ĹšĹ¤ Market</NavLink>
                    <NavLink href="/voice-notes">â„˘Ä🏠Â¸Ĺą GÄąâ€šosÄ‚łwki</NavLink>
                    <NavLink href="/documents/sale">📊 â€ž Dokumenty</NavLink>
                  </div>
                </div>
              </details>
            </div>

            {/* DESKTOP */}
            <div
              className="ce-desktop-links"
              style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}
            >
              <NavLink href="/dashboard">📊 Ĺ  Dashboard</NavLink>
              <NavLink href="/leads">📊 Ĺľ Leady</NavLink>
              <NavLink href="/contacts">â€Ä„ Kontakty</NavLink>
              <NavLink href="/agents">Â§â€â‚¬Ĺ¤’Ä˝ Agenci</NavLink>

              <NavLink href="/prospects">Ĺ» Pozyski</NavLink>
              <NavLink href="/properties">ĹąÂ  NieruchomoÄąâ€şci</NavLink>

              <NavLink href="/calendar">📊 … Kalendarz</NavLink>
              <NavLink href="/followups">”” Follow-up</NavLink>

              <NavLink href="/analyzed">Â¤â— AI: Analiza</NavLink>
              <NavLink href="/assistant/live">Â§ AI: Coach</NavLink>

              <NavLink href="/market">ĹšĹ¤ Market</NavLink>
              <NavLink href="/voice-notes">â„˘Ä🏠Â¸Ĺą GÄąâ€šosÄ‚łwki</NavLink>
              <NavLink href="/documents/sale">📊 â€ž Dokumenty</NavLink>
              <NavLink href="/news">â—ĹľÄ🏠Â¸Ĺą Prasówka</NavLink>
              <NavLink href="/newsletter">â€°Ä🏠Â¸Ĺą Newsletter</NavLink>
            </div>
          </div>
        </nav>

        <main
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "18px 18px 28px",
          }}
        >
          {children}
        </main>

        <CalliWidget />
        <MarketingPixels />
      </body>
    </html>
  );
}