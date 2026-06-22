import "./globals.css";

export const metadata = {
  title: "chekit — Think before you share",
  description: "AI-assisted fact and rhetoric analysis for TikTok videos.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080b10",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
