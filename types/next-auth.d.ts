import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeParishId: string | null;
      isPaxoraSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeParishId?: string | null;
    isPaxoraSuperAdmin?: boolean;
  }
}
