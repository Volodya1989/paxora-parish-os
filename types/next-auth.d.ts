import type { DefaultSession } from "next-auth";
import type { PlatformRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeParishId: string | null;
      impersonatedParishId?: string | null;
      platformRole?: PlatformRole | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeParishId?: string | null;
    impersonatedParishId?: string | null;
    platformRole?: PlatformRole | null;
    isDeleted?: boolean;
    authSessionVersion?: number;
    isSessionRevoked?: boolean;
    lastVersionCheckAt?: number;
  }
}
