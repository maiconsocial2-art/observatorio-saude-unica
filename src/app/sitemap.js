
const URL_BASE = "https://observatorio-saude-unica.vercel.app";

export default function sitemap() {
  return [
    {
      url: URL_BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
