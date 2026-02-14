import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { normalizeEmail } from "@/lib/validation/auth";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = normalizeEmail(credentials.email);
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
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
    async jwt({ token, user }) {
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

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { activeParishId: true, platformRole: true, impersonatedParishId: true }
        });
        token.activeParishId = dbUser?.activeParishId ?? null;
        token.platformRole = dbUser?.platformRole ?? null;
        token.impersonatedParishId = dbUser?.impersonatedParishId ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
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
