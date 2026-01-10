"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("auth-user");
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  return <>{children}</>;
}

