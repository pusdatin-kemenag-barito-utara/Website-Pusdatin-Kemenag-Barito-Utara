import { Metadata } from "next";
import { ProfilClientContent } from "@/components/landing/ProfilClientContent";

export const metadata: Metadata = {
  title: "Profil Organisasi - PUSDATIN Kemenag Barito Utara",
};

export default function ProfilPage() {
  return <ProfilClientContent />;
}
