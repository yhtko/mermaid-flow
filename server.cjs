const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 5173);
const distDir = path.join(__dirname, "dist");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  const requestedPath = decodeURIComponent(new URL(request.url || "/", `http://localhost:${port}`).pathname);
  const normalizedPath = requestedPath === "/" ? "index.html" : path.normalize(requestedPath).replace(/^([/\\])+/, "");
  const filePath = path.join(distDir, normalizedPath);
  const finalPath =
    filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(distDir, "index.html");

  fs.readFile(finalPath, (error, data) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(String(error));
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(finalPath)] || "application/octet-stream",
    });
    response.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mermaid Flow Builder: http://127.0.0.1:${port}/`);
});
