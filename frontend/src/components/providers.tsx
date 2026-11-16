"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModalProvider } from "@/components/auth-modal";
import { ProfileModalProvider } from "@/components/profile-modal";
import { useState } from "react";
import { easeOut } from "@/lib/motion";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <MotionConfig
          reducedMotion="user"
          transition={{ duration: 0.16, ease: easeOut }}
        >
          <AuthProvider>
            <AuthModalProvider>
              <ProfileModalProvider>{children}</ProfileModalProvider>
            </AuthModalProvider>
          </AuthProvider>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
