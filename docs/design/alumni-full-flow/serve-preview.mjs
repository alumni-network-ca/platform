// Local, dependency-free viewer for the exported alumni design proposal.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
const designDir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.ALUMNI_DESIGN_PORT || 4177);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png" };
const server = createServer(async (request,response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:" + port);
    const pathname = decodeURIComponent(url.pathname);
    const file = pathname === "/herzliah-logo.png"
      ? join(designDir,"../../../public/herzliah-logo.png")
      : resolve(designDir, "." + (pathname === "/" ? "/signup-preview.html" : pathname));
    if (pathname !== "/herzliah-logo.png" && !file.startsWith(designDir + sep)) { response.writeHead(403);response.end();return; }
    const type = types[extname(file)];
    if (!type) { response.writeHead(404);response.end();return; }
    const contents = await readFile(file);
    response.writeHead(200, {"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    response.end(contents);
  } catch {
    response.writeHead(404);response.end("Design file not found.");
  }
});
server.listen(port,"127.0.0.1",()=>console.log("Alumni design preview: http://127.0.0.1:" + port + "/#Join"));
