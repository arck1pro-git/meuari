import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Existe um package-lock.json solto na pasta do usuario, acima daqui. Sem
    // fixar a raiz, o Turbopack elege aquela pasta como raiz do workspace.
    root: import.meta.dirname,
  },
};

export default nextConfig;
