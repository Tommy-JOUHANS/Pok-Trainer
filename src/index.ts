import { createServer } from "node:http";
import { PokeApiError } from "./pokeapi";
import { capture } from "./routes/capture";
import { evolve } from "./routes/evolve";
import { getTeamMember, listTeam } from "./routes/pokedex";
import { release } from "./routes/release";
import type { Handler } from "./routes/types";
import { wild } from "./routes/wild";
import { HttpError, sendJson } from "./utils/http";

interface Route {
  method: string;
  pattern: RegExp; // les groupes nommés deviennent les params
  handler: Handler;
}

const routes: Route[] = [
  { method: "GET", pattern: /^\/wild$/, handler: wild },
  { method: "POST", pattern: /^\/capture$/, handler: capture },
  { method: "GET", pattern: /^\/pokedex$/, handler: listTeam },
  { method: "GET", pattern: /^\/pokedex\/(?<uuid>[^/]+)$/, handler: getTeamMember },
  { method: "POST", pattern: /^\/evolve\/(?<uuid>[^/]+)$/, handler: evolve },
  { method: "POST", pattern: /^\/release\/(?<uuid>[^/]+)$/, handler: release },
];

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  try {
    const matching = routes.filter((r) => r.pattern.test(path));
    if (matching.length === 0) {
      throw new HttpError(404, `Route inconnue : ${req.method} ${path}`);
    }
    const route = matching.find((r) => r.method === req.method);
    if (!route) {
      res.setHeader("Allow", matching.map((r) => r.method).join(", "));
      throw new HttpError(405, `Méthode ${req.method} non autorisée sur ${path}`);
    }

    const params = { ...(path.match(route.pattern)?.groups ?? {}) };
    for (const key in params) params[key] = decodeURIComponent(params[key]);

    await route.handler(req, res, params);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
    } else if (err instanceof PokeApiError) {
      sendJson(res, 502, { error: err.message });
    } else {
      console.error(err);
      sendJson(res, 500, { error: "Erreur interne du serveur" });
    }
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`PokéTrainer API sur http://localhost:${PORT}`);
});
