import { beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";

const prismaMock = {
  user: {
    findUnique: async () => null,
    update: async () => null
  },
  passwordResetToken: {
    findFirst: async () => null,
    create: async () => null,
    findUnique: async () => null,
    update: async () => null,
    deleteMany: async () => null
  },
  emailVerificationToken: {
    findUnique: async () => null,
    update: async () => null,
    deleteMany: async () => null
  },
  $transaction: async () => null
};

mock.module("@/server/db/prisma", {
  namedExports: {
    prisma: prismaMock
  }
});

mock.module("bcryptjs", {
  defaultExport: {
    compare: async () => false
  },
  namedExports: {
    compare: async () => false
  }
});

mock.module("@/server/auth/bootstrap", {
  namedExports: {
    ensureParishBootstrap: async () => undefined
  }
});

mock.module("next/headers", {
  namedExports: {
    headers: async () => new Headers([["x-forwarded-for", "203.0.113.1"]])
  }
});

mock.module("@/lib/email/passwordReset", {
  namedExports: {
    sendResetPasswordEmail: async () => undefined
  }
});

mock.module("@/lib/email/verification", {
  namedExports: {
    sendVerificationEmail: async () => undefined
  }
});

let resetRateLimiters: () => void;

beforeEach(async () => {
  const rateLimitModule = await loadModuleFromRoot<typeof import("@/lib/security/authPublicRateLimit")>(
    "lib/security/authPublicRateLimit"
  );
  resetRateLimiters = rateLimitModule.resetAuthPublicRateLimitersForTest;
  resetRateLimiters();
});

test("sign-in authorize applies rate limiting before credential lookup", async () => {
  let lookups = 0;
  prismaMock.user.findUnique = async () => {
    lookups += 1;
    return null;
  };

  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );
  const credentialsProvider = authOptions.providers?.[0] as any;

  const limit = 10;
  for (let i = 0; i < limit + 1; i += 1) {
    await credentialsProvider.options.authorize(
      { email: "rate-limit@example.com", password: "wrong-password" },
      { headers: new Headers([["x-forwarded-for", "198.51.100.11"]]) }
    );
  }

  assert.equal(lookups, limit);
});


test("sign-in limiter handles NextAuth header map shape", async () => {
  let lookups = 0;
  prismaMock.user.findUnique = async () => {
    lookups += 1;
    return null;
  };

  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );
  const credentialsProvider = authOptions.providers?.[0] as any;

  const limit = 10;
  for (let i = 0; i < limit + 1; i += 1) {
    await credentialsProvider.options.authorize(
      { email: "header-map@example.com", password: "wrong-password" },
      { headers: { "x-forwarded-for": "198.51.100.12" } }
    );
  }

  assert.equal(lookups, limit);
});

test("forgot-password request is throttled after threshold", async () => {
  let userLookups = 0;
  prismaMock.user.findUnique = async () => {
    userLookups += 1;
    return null;
  };

  const passwordActions = await loadModuleFromRoot<typeof import("@/app/actions/password")>(
    "app/actions/password"
  );

  const formData = new FormData();
  formData.set("email", "reset-target@example.com");

  const limit = 5;
  for (let i = 0; i < limit + 1; i += 1) {
    const result = await passwordActions.requestPasswordReset({}, formData);
    assert.deepEqual(result, { success: true });
  }

  assert.equal(userLookups, limit);
});

test("verify-email token checks are throttled after threshold", async () => {
  let tokenLookups = 0;
  prismaMock.emailVerificationToken.findUnique = async () => {
    tokenLookups += 1;
    return null;
  };

  const emailVerification = await loadModuleFromRoot<typeof import("@/lib/auth/emailVerification")>(
    "lib/auth/emailVerification"
  );

  const limit = 10;
  for (let i = 0; i < limit + 1; i += 1) {
    const result = await emailVerification.verifyEmailToken("bad-token");
    assert.deepEqual(result, { success: false });
  }

  assert.equal(tokenLookups, limit);
});
