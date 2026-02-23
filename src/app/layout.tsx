import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkThemeProvider } from "@/components/clerk-theme-provider";

export const metadata: Metadata = {
  title: "NextICron Tiling Engine Documentation",
  description: "Documentation for the NextICron SRAM Tiling Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
