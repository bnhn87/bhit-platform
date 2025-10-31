// apps/web/hooks/useAuth.ts
import { useAuthCtx } from "../lib/AuthProvider";
export function useAuth() {
  return useAuthCtx();
}
