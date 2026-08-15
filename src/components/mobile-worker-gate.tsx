"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MobileWorkerGate() {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      router.replace("/me");
    }
  }, [router]);
  return null;
}
