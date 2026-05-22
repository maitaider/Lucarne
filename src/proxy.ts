import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const handleIntl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleIntl(request);

  // Skip Supabase work if env not configured (Sprint 0 — pre-Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return response;
  }

  return updateSupabaseSession(request, response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
