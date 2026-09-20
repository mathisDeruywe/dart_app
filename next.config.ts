import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  disable: process.env.NODE_ENV === "development", // Désactive le cache en dev
});

export default withPWA({
  // Tes autres configurations Next.js ici si tu en as
});