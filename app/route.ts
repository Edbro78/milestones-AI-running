import { readFile } from "fs/promises";
import path from "path";

/** Serverer rot-index.html på / (samme fil Live Server åpner) */
export async function GET() {
  const filePath = path.join(process.cwd(), "index.html");
  const html = await readFile(filePath, "utf8");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
