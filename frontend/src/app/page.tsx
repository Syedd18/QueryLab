import { redirect } from "next/navigation";

// The app opens directly on the dashboard. Guests can browse and practice;
// features that need an account prompt an inline sign-in.
export default function RootPage() {
  redirect("/dashboard");
}
