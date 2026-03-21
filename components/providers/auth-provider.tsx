"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        void supabase.auth.signInAnonymously();
      }
    });
  }, []);

  return children;
}
