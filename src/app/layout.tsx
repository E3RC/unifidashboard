import {ClerkProvider, SignInButton, SignUpButton, Show, UserButton} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ubuquity — Network Dashboard",
  description: "Live UniFi network monitoring dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <nav className="flex items-center justify-end gap-4 p-4 pb-0 text-sm">
            <Show when="signed-out">
              <SignInButton>
                <button className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors cursor-pointer">Sign In</button>
              </SignInButton>
              <SignUpButton>
                <button className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer">Sign Up</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </nav>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}