import type { NextRequest } from "next/server";
import { handleAuthCallback } from "@/lib/auth-callback";

export function GET(request: NextRequest) {
  return handleAuthCallback(request, "portal");
}
