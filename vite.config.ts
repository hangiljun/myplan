import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages용 리포 이름
const REPO = "myplan";

// Vercel 환경에선 base="/" , GitHub Pages에선 "/<REPO>/"
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

export default defineConfig({
  plugins: [react()],
  base: isVercel ? "/" : `/${REPO}/`
});
