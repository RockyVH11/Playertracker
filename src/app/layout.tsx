import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/layout/app-nav";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Club player tracker",
  description: "Open session evaluations and team placement",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {session && <AppNav session={session} />}
        <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </body>
    </html>
  );
}
