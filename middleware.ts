import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  },
  pages: {
    signIn: "/sign-in"
  }
});

export const config = {
  matcher: [
    "/this-week",
    "/((?!api/auth|sign-in|sign-up|post-login|_next|favicon.ico).*)"
  ]
};
