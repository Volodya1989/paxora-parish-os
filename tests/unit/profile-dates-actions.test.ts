// import { test, mock } from "node:test";
// import assert from "node:assert/strict";
// import { loadModuleFromRoot } from "../_helpers/load-module";

// let sessionValue: { user: { id: string } } | null = null;

// mock.module("next-auth", {
//   namedExports: {
//     getServerSession: async () => sessionValue
//   }
// });

// mock.module("@/server/auth/options", {
//   namedExports: {
//     authOptions: {}
//   }
// });

// mock.module("@/server/db/prisma", {
//   namedExports: {
//     prisma: {
//       user: {
//         update: async () => ({
//           birthdayMonth: null,
//           birthdayDay: null,
//           anniversaryMonth: null,
//           anniversaryDay: null,
//           greetingsOptIn: false
//         })
//       }
//     }
//   }
// });

// mock.module("next/cache", {
//   namedExports: {
//     revalidatePath: () => undefined
//   }
// });

// test("updateProfileDates throws when not logged in", async () => {
//   sessionValue = null;
//   const actions = await loadModuleFromRoot<typeof import("@/app/actions/profile")>(
//     "app/actions/profile"
//   );

//   await assert.rejects(
//     () =>
//       actions.updateProfileDates({
//         birthdayMonth: null,
//         birthdayDay: null,
//         anniversaryMonth: null,
//         anniversaryDay: null,
//         greetingsOptIn: false
//       }),
//     /Unauthorized/
//   );
// });
