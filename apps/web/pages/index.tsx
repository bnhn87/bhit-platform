import { useRouter } from "next/router";
import { useEffect } from "react";

import { supabase } from "../lib/supabaseClient";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) router.replace("/dashboard");
      else router.replace("/login");
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  return null;
}
