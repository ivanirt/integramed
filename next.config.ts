import type { NextConfig } from "next";

const fhir = process.env.FHIR_PROXY_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/patients", destination: "/pacientes", permanent: false },
      { source: "/patient/:id", destination: "/pacientes/:id", permanent: false },
      { source: "/home", destination: "/", permanent: false },
      { source: "/inicio", destination: "/", permanent: false },
      { source: "/settings", destination: "/config/horario", permanent: false },
      { source: "/configuracion", destination: "/config/horario", permanent: false },
      { source: "/labs", destination: "/pacientes", permanent: false },
      { source: "/laboratorios", destination: "/pacientes", permanent: false },
      { source: "/recetas", destination: "/pacientes", permanent: false },
      { source: "/prescriptions", destination: "/pacientes", permanent: false },
      { source: "/encounters", destination: "/agenda", permanent: false },
      { source: "/consultation", destination: "/agenda", permanent: false },
      { source: "/inventario", destination: "/farmacia", permanent: false },
      { source: "/medicamentos", destination: "/farmacia", permanent: false },
      { source: "/pharmacy", destination: "/farmacia", permanent: false },
      { source: "/practitioners", destination: "/personal", permanent: false },
      { source: "/medicos", destination: "/personal", permanent: false },
      { source: "/planteles", destination: "/config/sedes", permanent: false },
      { source: "/facilities", destination: "/config/sedes", permanent: false },
      { source: "/locations", destination: "/config/sedes", permanent: false },
      { source: "/vault", destination: "/boveda", permanent: false },
      { source: "/profile", destination: "/perfil", permanent: false },
      { source: "/login", destination: "/acceso", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/fhir/:path*", destination: `${fhir}/api/fhir/:path*` },
      { source: "/api/health", destination: `${fhir}/api/health` },
      { source: "/api/config", destination: `${fhir}/api/config` },
      { source: "/api/vault/:path*", destination: `${fhir}/api/vault/:path*` },
      { source: "/api/ai/:path*", destination: `${fhir}/api/ai/:path*` },
      { source: "/fhir/:path*", destination: `${fhir}/fhir/:path*` }
    ];
  }
};

export default nextConfig;
