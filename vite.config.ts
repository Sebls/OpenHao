import { defineConfig } from "vite";
import { scan } from "./src/server/catalog.ts";
import { handleRequest } from "./src/server/handler.ts";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1" },
  plugins: [
    {
      name: "local-study-library",
      configureServer(server) {
        scan();
        const timer = setInterval(scan, 2000);
        timer.unref();
        server.httpServer?.once("close", () => clearInterval(timer));
        server.middlewares.use((req, res, next) => {
          const pathname = new URL(req.url || "/", "http://localhost").pathname;
          if (/^\/(api|pdf|content|pdfjs|hanzi-data)(\/|$)/.test(pathname))
            handleRequest(req, res);
          else next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { pdf: ["pdfjs-dist"], hanzi: ["hanzi-writer"] },
      },
    },
  },
});
