import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for link preview
  app.post("/api/preview", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 5000,
      });

      const $ = cheerio.load(response.data);
      const title =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text() ||
        $('meta[name="title"]').attr("content");
      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content");
      const image =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content");
      const siteName = $('meta[property="og:site_name"]').attr("content");

      res.json({
        title: title?.trim() || url,
        description: description?.trim(),
        image: image,
        siteName: siteName,
        url,
      });
    } catch (error) {
      console.error("Preview error:", error);
      res.json({
        title: url,
        url,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
