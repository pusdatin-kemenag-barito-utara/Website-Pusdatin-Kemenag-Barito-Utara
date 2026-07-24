import { Plus_Jakarta_Sans } from "next/font/google";
import { Metadata, Viewport } from "next";
import "./tailwind.css";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { JsonLd } from "@/components/seo/JsonLd";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://pusdatin.kemenag-baritoutara.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default:
      "PUSDATIN - Pusat Data dan Teknologi Informasi Kemenag Kabupaten Barito Utara",
    template: "%s | PUSDATIN Kemenag Barito Utara",
  },
  description:
    "Portal Pusat Data dan Teknologi Informasi — manajemen data master terpadu, layanan publik digital, dan sistem autentikasi Single Sign-On (SSO) Kementerian Agama Kabupaten Barito Utara.",
  keywords: [
    "PUSDATIN",
    "Kemenag Barito Utara",
    "Pusat Data dan Teknologi Informasi Kemenag",
    "Kementerian Agama Barito Utara",
    "Muara Teweh Kemenag",
    "SSO Kemenag Barito Utara",
    "Layanan Digital Kemenag",
    "PTSP Kemenag Barito Utara",
    "Data Keagamaan Barito Utara",
  ],
  authors: [{ name: "PUSDATIN Kemenag Barito Utara" }],
  creator: "PUSDATIN Kemenag Barito Utara",
  publisher: "Kementerian Agama Kabupaten Barito Utara",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: baseUrl,
    siteName: "PUSDATIN Kemenag Barito Utara",
    title:
      "PUSDATIN - Pusat Data dan Teknologi Informasi Kemenag Kabupaten Barito Utara",
    description:
      "Portal resmi pengelolaan data master dan ekosistem aplikasi terpadu Kementerian Agama Kabupaten Barito Utara.",
    images: [
      {
        url: "/branding/pusdatin.png",
        width: 800,
        height: 800,
        alt: "Logo PUSDATIN Kemenag Kabupaten Barito Utara",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PUSDATIN - Pusat Data dan Teknologi Informasi Kemenag Barito Utara",
    description:
      "Portal resmi pengelolaan data master dan ekosistem aplikasi terpadu Kementerian Agama Kabupaten Barito Utara.",
    images: ["/branding/pusdatin.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/branding/pusdatin.png",
    apple: "/branding/pusdatin.png",
  },
  appleWebApp: {
    capable: true,
    title: "PUSDATIN Kemenag",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <body className={`${jakarta.className} font-sans antialiased`}>
        <JsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
