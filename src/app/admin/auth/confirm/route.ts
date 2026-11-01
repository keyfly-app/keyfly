import type { NextRequest } from "next/server";
import { handleEmailLink } from "@/lib/auth-callback";

export function GET(request: NextRequest) {
  return handleEmailLink(request, "admin");
}
