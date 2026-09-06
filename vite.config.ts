import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

const APP_BUILD_ID = String(Date.now());

// Génère /version.json dans le build pour la détection de mise à jour
const versionFilePlugin = () => ({
  name: "app-version-file",
  writeBundle(options: { dir?: string }) {
    const dir = options.dir || path.resolve(__dirname, "dist");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "version.json"),
      JSON.stringify({ buildId: APP_BUILD_ID })
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(mode === "development" ? "dev" : APP_BUILD_ID),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    versionFilePlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
}));
