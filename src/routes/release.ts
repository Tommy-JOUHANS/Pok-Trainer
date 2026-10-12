import { state } from "../state";
import { HttpError, sendJson } from "../utils/http";
import type { Handler } from "./types";

// POST /release/:uuid
export const release: Handler = async (_req, res, params) => {
  const index = state.team.findIndex((p) => p.uuid === params.uuid);
  if (index === -1) throw new HttpError(404, "Ce Pokémon n'est pas dans votre équipe");

  const [released] = state.team.splice(index, 1);

  sendJson(res, 200, {
    message: `${released.nickname} a été relâché. Adieu !`,
    released: { uuid: released.uuid, name: released.name },
  });
};
