import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  async onCallback(error, context, session) {
    if (error) {
      console.error("Auth0 callback error:", error);
      return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL));
    }

    const loginsCount = session?.user?.['https://accounts.slew.uk/logins_count'];

    if (loginsCount === 1) {
      return NextResponse.redirect(new URL("/login/onboard", process.env.APP_BASE_URL));
    }

    return NextResponse.redirect(new URL(context.returnTo || "/", process.env.APP_BASE_URL));
  }
});
