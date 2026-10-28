import type { Metadata, Viewport } from "next";
import { CONTENT } from "@/content/config";
import "./globals.css";

export const metadata: Metadata = {
  title: CONTENT.site.title,
  description: CONTENT.site.description,
  applicationName: CONTENT.site.shortName,
  icons: CONTENT.site.icons,
  appleWebApp: {
    capable: true,
    title: CONTENT.site.shortName,
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  formatDetection: { telephone: false },
};

// The room is one full-screen canvas; zooming the page would move its edges
// out from under the touch controls.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: CONTENT.site.themeColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* Self-hosted so the typeface and the 3D wall text also work offline. */}
      <link
        rel="preload"
        href="/fonts/montenegrin-gothic-one-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/montenegrin-gothic-one-latin-ext.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <body className="h-full overscroll-none bg-[#10101a] text-[#f6ebdd]">
        {children}
      </body>
    </html>
  );
}
