"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export function ClerkThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorBackground: "var(--background)",
          colorText: "var(--foreground)",
          colorPrimary: "var(--primary)",
          colorTextOnPrimaryBackground: "var(--primary-foreground)",
          colorInputBackground: "var(--card)",
          colorInputText: "var(--foreground)",
          colorDanger: "var(--destructive)",
          borderRadius: "var(--radius)",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
