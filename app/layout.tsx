import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Milestones AI Running",
  description: "Personlig løpetrener med Garmin Connect og Google Gemini",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Milestones",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="device-viewport">
          <div className="device">
            <div className="device-screen">
              <span className="device-island" aria-hidden="true" />
              <div className="device-scroll app-surface">{children}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
