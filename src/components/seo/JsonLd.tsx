import React from "react";

export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "name": "PUSDATIN Kementerian Agama Kabupaten Barito Utara",
    "alternateName": "PUSDATIN Kemenag Barito Utara",
    "url": "https://pusdatin.kemenag-baritoutara.com",
    "logo": "https://pusdatin.kemenag-baritoutara.com/branding/pusdatin.png",
    "image": "https://pusdatin.kemenag-baritoutara.com/branding/pusdatin.png",
    "description": "Pusat Data dan Teknologi Informasi — portal pengelolaan data master dan layanan aplikasi terpadu Kementerian Agama Kabupaten Barito Utara.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Jl. Ahmad Yani No. 126",
      "addressLocality": "Muara Teweh",
      "addressRegion": "Kalimantan Tengah",
      "addressCountry": "ID"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+62-851-1749-1212",
      "contactType": "customer service",
      "email": "baritoutara@kemenag.go.id",
      "availableLanguage": ["Indonesian"]
    },
    "sameAs": [
      "https://baritoutara.kemenag.go.id",
      "https://youtube.com",
      "https://instagram.com",
      "https://facebook.com"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
