"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className="nav-link"
      style={{
        background: active
          ? "var(--green-soft)"
          : "var(--bg-card-soft)",
        borderColor: active
          ? "var(--green-main)"
          : "var(--border-soft)",
        color: "var(--green-main)",
        fontWeight: active ? 800 : 600,
      }}
    >
      {children}
    </Link>
  );
}

