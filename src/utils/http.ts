import type { IncomingMessage, ServerResponse } from "node:http";

/** Erreur métier avec un code HTTP, attrapée par le routeur. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const MAX_BODY_SIZE = 1_000_000; // 1 Mo

/** Lit le body et le parse en JSON. Toute erreur devient un 400. */
export function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
      if (raw.length > MAX_BODY_SIZE) {
        reject(new HttpError(400, "Body trop volumineux"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (raw.trim() === "") {
        return reject(new HttpError(400, "Body JSON manquant"));
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, "JSON invalide"));
      }
    });
    req.on("error", () => reject(new HttpError(400, "Erreur de lecture du body")));
  });
}
