
const URL_BASE = "https://observatorio-saude-unica.vercel.app";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/login",
        "/cadastro",
        "/redefinir-senha",
      ],
    },
    sitemap: `${URL_BASE}/sitemap.xml`,
  };
}
