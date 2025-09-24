"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, user, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}

