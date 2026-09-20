import { NextResponse } from "next/server";
import { z } from "zod";
import { backend } from "@/lib/config";
import { localSignIn, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { bootstrap } from "@/lib/bootstrap";
import { checkOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await request.json();
    if (input.action === "logout") {
      await signOut();
      return NextResponse.json({ ok: true });
    }
    const { email, password, action } = z
      .object({
        email: z
          .email()
          .max(254)
          .transform((s) => s.toLowerCase().trim()),
        password: z.string().min(8, "密码至少 8 位").max(128),
        action: z.enum(["login", "register"]),
      })
      .parse(input);
    if (backend() === "local") {
      const user = await localSignIn(email, password, action === "register");
      await bootstrap(user);
      return NextResponse.json({ ok: true });
    }
    const client = await supabase();
    if (action === "register") {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL(
            "/auth/confirm",
            process.env.APP_URL || request.url,
          ).toString(),
        },
      });
      if (error) throw new Error(error.message);
      if (!data.session)
        return NextResponse.json({
          message: "注册申请已提交，请到邮箱点击确认链接，再返回登录。",
        });
    } else {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error("登录失败，请检查邮箱、密码以及邮箱确认状态");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
