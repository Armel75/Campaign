import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";

  return {
    plugins: [react()],
    base: isBuild ? "/campagne/" : "/",
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        "/api/campagne": {
          target: "http://localhost:3004",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/campagne/, "/api/v1"),
        },
        "/uploads": {
          target: "http://localhost:3004",
          changeOrigin: true,
        },
      },
    },
  };
});
