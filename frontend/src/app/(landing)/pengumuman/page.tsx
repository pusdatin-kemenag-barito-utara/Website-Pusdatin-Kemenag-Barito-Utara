import { Metadata } from "next";
import { PengumumanClientContent } from "@/components/landing/PengumumanClientContent";

export const metadata: Metadata = {
  title: "Pengumuman Resmi - PUSDATIN Kemenag Barito Utara",
};

const announcements = [
  {
    id: 1,
    tag: "Integrasi SSO",
    date: "23 Juli 2026",
    title: "Pembaruan Portal Autentikasi Single Sign-On (SSO) Pusdatin v2.0",
    desc: "Seluruh aplikasi internal ASN dan portal layanan publik kini telah terhubung secara terpusat. Pengguna dapat berpindah antar-layanan hanya dengan satu akun terverifikasi.",
    isImportant: true
  },
  {
    id: 2,
    tag: "Pemeliharaan",
    date: "15 Juli 2026",
    title: "Jadwal Pemeliharaan Rutin Basis Data Terpusat",
    desc: "Pemberitahuan optimalisasi performa server database terpusat yang dilaksanakan secara berkala untuk menjaga stabilitas dan kecepatan akses layanan.",
    isImportant: false
  },
  {
    id: 3,
    tag: "Helpdesk IT",
    date: "01 Juli 2026",
    title: "Layanan Konsultasi & Layanan Kendala Akun Berbasis WhatsApp",
    desc: "Bagi pegawai maupun masyarakat yang membutuhkan bantuan terkait registrasi akun atau kendala login, silakan hubungi tim Helpdesk IT PUSDATIN.",
    isImportant: false
  }
];

export default function PengumumanPage() {
  return <PengumumanClientContent announcements={announcements} />;
}

