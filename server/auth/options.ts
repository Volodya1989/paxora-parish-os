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
        await ensureParishBootstrap(user.id);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && "activeParishId" in user) {
        token.activeParishId = (user as { activeParishId?: string | null }).activeParishId ?? null;
      }

      if (!token.activeParishId && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { activeParishId: true }
        });
        token.activeParishId = dbUser?.activeParishId ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.activeParishId = (token.activeParishId as string | null) ?? null;
      }
      return session;
    }
  }
};
