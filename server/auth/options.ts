import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { normalizeEmail } from "@/lib/validation/auth";
import { consumeSignInRateLimit } from "@/lib/security/authPublicRateLimit";

/** How often (ms) the JWT callback re-checks the database for version changes. */
const SESSION_CHECK_TTL_MS = 60_000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const rateLimit = consumeSignInRateLimit({
          email: credentials.email,
          request
        });
        if (!rateLimit.allowed) {
          return null;
        }

        const email = normalizeEmail(credentials.email);
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            activeParishId: true,
            platformRole: true,
            impersonatedParishId: true,
            authSessionVersion: true,
            deletedAt: true
          }
        });

        if (!user || user.deletedAt) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return user;
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          });
        } catch (error) {
          console.error("[auth] failed to update lastLoginAt", error);
        }

        await ensureParishBootstrap(user.id);
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Seed token from the user object on initial sign-in.
      if (user && "activeParishId" in user) {
        token.activeParishId = (user as { activeParishId?: string | null }).activeParishId ?? null;
      }
      if (user && "platformRole" in user) {
        token.platformRole =
          (user as { platformRole?: typeof token.platformRole }).platformRole ?? null;
      }
      if (user && "impersonatedParishId" in user) {
        token.impersonatedParishId = (user as { impersonatedParishId?: string | null }).impersonatedParishId ?? null;
      }
      if (user && "authSessionVersion" in user) {
        token.authSessionVersion =
          (user as { authSessionVersion?: number | null }).authSessionVersion ?? 0;
      }

      if (token.sub) {
        // Skip the DB lookup if we checked recently and the session is not
        // already revoked.  A trigger === "update" (explicit session refresh)
        // always forces a fresh check so the calling tab picks up the new
        // version immediately.
        const now = Date.now();
        const lastCheck = typeof token.lastVersionCheckAt === "number"
          ? token.lastVersionCheckAt
          : 0;
        const forceCheck = trigger === "update";
        const ttlExpired = now - lastCheck >= SESSION_CHECK_TTL_MS;

        if (!forceCheck && !ttlExpired && !token.isSessionRevoked) {
          return token;
        }

        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              activeParishId: true,
              platformRole: true,
              impersonatedParishId: true,
              authSessionVersion: true,
              deletedAt: true
            }
          });

          token.lastVersionCheckAt = now;
          token.isDeleted = Boolean(dbUser?.deletedAt);
          token.activeParishId = dbUser?.activeParishId ?? null;
          token.platformRole = dbUser?.platformRole ?? null;
          token.impersonatedParishId = dbUser?.impersonatedParishId ?? null;

          const tokenSessionVersion = typeof token.authSessionVersion === "number"
            ? token.authSessionVersion
            : 0;
          const dbSessionVersion = dbUser?.authSessionVersion ?? 0;

          if (tokenSessionVersion < dbSessionVersion) {
            // This token is behind the current version. Only allow it to
            // survive if its JTI matches the keep-jti stored during the
            // logout-all call (i.e. this is the session that triggered it).
            let keepJti: string | null = null;
            try {
              const keepRow = await prisma.user.findUnique({
                where: { id: token.sub },
                select: { authSessionKeepJti: true }
              });
              keepJti = keepRow?.authSessionKeepJti ?? null;
            } catch {
              // Column may not exist yet if migration is pending.
            }

            if (token.jti && token.jti === keepJti) {
              token.authSessionVersion = dbSessionVersion;
              token.isSessionRevoked = false;
            } else {
              token.isSessionRevoked = true;
            }
          } else {
            token.isSessionRevoked = false;
          }
        } catch (error) {
          // Graceful degradation: if the DB query fails (e.g. pending
          // migrations, transient connection issue), keep the token values
          // from the last successful check or initial sign-in.
          console.error("[auth] jwt version check failed", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.isDeleted || token.isSessionRevoked) {
          session.user.id = "";
          session.user.activeParishId = null;
          session.user.impersonatedParishId = null;
          session.user.platformRole = null;
          return session;
        }

        session.user.id = token.sub ?? "";
        session.user.impersonatedParishId = (token.impersonatedParishId as string | null) ?? null;
        session.user.platformRole = (token.platformRole as typeof session.user.platformRole) ?? null;
        const resolvedParishId =
          (token.impersonatedParishId as string | null) ??
          (token.activeParishId as string | null) ??
          null;
        session.user.activeParishId = resolvedParishId;
      }
      return session;
    }
  }
};
