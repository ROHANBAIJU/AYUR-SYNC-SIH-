// app/layout.tsx
import "./globals.css";
import { DM_Sans, Quicksand } from "next/font/google";

const dm_sans = DM_Sans({ subsets: ["latin"] });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = {
  title: "AYUR-SYNC - Unifying Ayurveda and Modern Medicine",
  description: "Unifying Ayurveda and Modern Medicine for You",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`${dm_sans.className} ${quicksand.className} min-h-screen`}
        style={{ backgroundColor: "#FAF3E0" }}
      >
        {children}
      </body>
    </html>
  );
}
