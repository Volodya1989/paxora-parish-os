// import { test, mock } from "node:test";
// import assert from "node:assert/strict";
// import { loadModuleFromRoot } from "../_helpers/load-module";

// let sessionValue: { user: { id: string; activeParishId?: string | null } } | null = null;
// let inviteRecord: {
//   id: string;
//   parishId: string;
//   email: string;
//   role: "MEMBER";
//   expiresAt: Date;
//   acceptedAt: Date | null;
//   revokedAt: Date | null;
// } | null = null;

// mock.module("next-auth", {
//   namedExports: {
//     getServerSession: async () => sessionValue
//   }
// });

// mock.module("@/server/db/prisma", {
//   namedExports: {
//     prisma: {
//       parishInvite: {
//         findUnique: async () => inviteRecord
//       },
//       user: {
//         findUnique: async () => ({ id: "user", email: "invitee@example.com", activeParishId: null })
//       },
//       membership: {
//         findUnique: async () => null
//       },
//       $transaction: async () => undefined
//     }
//   }
// });

// mock.module("@/server/auth/permissions", {
//   namedExports: {
//     requireAdminOrShepherd: async () => {
//       throw new Error("Forbidden");
//     }
//   }
// });

// mock.module("next/cache", {
//   namedExports: {
//     revalidatePath: () => undefined
//   }
// });

// mock.module("@/lib/email/parishInvites", {
//   namedExports: {
//     sendParishInviteEmail: async () => ({ status: "SENT" })
//   }
// });

// test.skip("createParishInvite returns not authorized without session", async () => {
//   sessionValue = null;
//   const actions = await loadModuleFromRoot<typeof import("@/app/actions/parishInvites")>(
//     "app/actions/parishInvites"
//   );
//   const result = await actions.createParishInvite({
//     parishId: "parish",
//     email: "test@example.com",
//     role: "MEMBER"
//   });

//   assert.equal(result.status, "error");
//   assert.equal(result.error, "NOT_AUTHORIZED");
// });

// test("revokeParishInvite returns not authorized without session", async () => {
//   sessionValue = null;
//   const actions = await loadModuleFromRoot<typeof import("@/app/actions/parishInvites")>(
//     "app/actions/parishInvites"
//   );
//   const result = await actions.revokeParishInvite({ inviteId: "invite" });

//   assert.equal(result.status, "error");
//   assert.equal(result.error, "NOT_AUTHORIZED");
// });

// test("acceptParishInvite rejects invalid token", async () => {
//   sessionValue = { user: { id: "user", activeParishId: null } };
//   inviteRecord = null;
//   const actions = await loadModuleFromRoot<typeof import("@/app/actions/parishInvites")>(
//     "app/actions/parishInvites"
//   );
//   const result = await actions.acceptParishInvite({ token: "bad" });

//   assert.equal(result.status, "error");
//   assert.equal(result.error, "INVALID_TOKEN");
// });

// test("acceptParishInvite rejects revoked token", async () => {
//   sessionValue = { user: { id: "user", activeParishId: null } };
//   inviteRecord = {
//     id: "invite",
//     parishId: "parish",
//     email: "invitee@example.com",
//     role: "MEMBER",
//     expiresAt: new Date(Date.now() + 1000 * 60),
//     acceptedAt: null,
//     revokedAt: new Date()
//   };
//   const actions = await loadModuleFromRoot<typeof import("@/app/actions/parishInvites")>(
//     "app/actions/parishInvites"
//   );
//   const result = await actions.acceptParishInvite({ token: "revoked" });

//   assert.equal(result.status, "error");
//   assert.equal(result.error, "REVOKED");
// });

// test("acceptParishInvite rejects expired token", async () => {
//   sessionValue = { user: { id: "user", activeParishId: null } };
//   inviteRecord = {
//     id: "invite",
//     parishId: "parish",
//     email: "invitee@example.com",
//     role: "MEMBER",
//     expiresAt: new Date(Date.now() - 1000),
//     acceptedAt: null,
//     revokedAt: null
//   };
//   const actions = await loadModuleFromRoot<typeof import("@/app/actions/parishInvites")>(
//     "app/actions/parishInvites"
//   );
//   const result = await actions.acceptParishInvite({ token: "expired" });

//   assert.equal(result.status, "error");
//   assert.equal(result.error, "EXPIRED");
// });
