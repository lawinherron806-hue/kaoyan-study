import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url),
    client = await supabase();
  const code = url.searchParams.get("code"),
    token_hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url));
  }
  if (token_hash && type === "signup") {
    const { error } = await client.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (!error) return NextResponse.redirect(new URL("/", url));
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", url));
}
