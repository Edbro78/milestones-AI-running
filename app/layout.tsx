import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  themeColor: "#002359",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className={`${hanken.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
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
