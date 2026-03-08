import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "mfeAgents",
      filename: "remoteEntry.js",
      exposes: {
        "./AgentsPage": "./src/pages/agents-page.tsx",
      },
      shared: ["react", "react-dom", "zustand", "@tanstack/react-query"],
    }),
  ],
  server: {
    port: 3005,
  },
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
});
