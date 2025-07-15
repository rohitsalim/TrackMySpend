import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackMySpend",
  description: "Financial Statement Analysis Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} font-sans antialiased`}
      >
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1">
            <Navbar />
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
