import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { StorageProvider } from "@/contexts/StorageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/Toaster";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TripLog — Plan & Remember Your Journeys",
  description: "Plan trips, capture memories, track budgets all in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} mesh-bg text-white min-h-screen`}>
        <AuthProvider>
          <StorageProvider>{children}</StorageProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
