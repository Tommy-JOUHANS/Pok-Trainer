import { randomUUID } from "node:crypto";
import { MAX_TEAM_SIZE, state, type CapturedPokemon } from "../state";
import { HttpError, readJsonBody, sendJson } from "../utils/http";
import type { Handler } from "./types";

function parsePokemonId(body: unknown): number {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Le body doit être un objet JSON");
  }
  const { pokemonId } = body as Record<string, unknown>;
  if (pokemonId === undefined) {
    throw new HttpError(400, "Champ 'pokemonId' manquant");
  }
  if (typeof pokemonId !== "number" || !Number.isInteger(pokemonId) || pokemonId < 1) {
    throw new HttpError(400, "'pokemonId' doit être un entier positif");
  }
  return pokemonId;
}

// POST /capture
export const capture: Handler = async (req, res) => {
  const pokemonId = parsePokemonId(await readJsonBody(req));

  const encounter = state.lastEncounter;
  if (!encounter || encounter.id !== pokemonId) {
    throw new HttpError(400, "Ce Pokémon n'a pas été rencontré. Appelez d'abord GET /wild.");
  }

  // Vérifié avant le tirage : on ne fait pas fuir le Pokémon si l'équipe est pleine.
  if (state.team.length >= MAX_TEAM_SIZE) {
    throw new HttpError(409, `Équipe pleine (${MAX_TEAM_SIZE} Pokémon maximum)`);
  }

  // Une seule tentative par rencontre, réussie ou non.
  state.lastEncounter = null;

  const proba = (encounter.captureRate / 255) * 100; // en %
  const roll = Math.random() * 100;

  if (roll >= proba) {
    return sendJson(res, 200, {
      success: false,
      message: "Oh non ! Le Pokémon s'est échappé !",
    });
  }

  const captured: CapturedPokemon = {
    uuid: randomUUID(),
    pokemonId: encounter.id,
    name: encounter.name,
    nickname: encounter.name,
    sprite: encounter.sprite,
    capturedAt: new Date().toISOString(),
    history: [encounter.name],
  };
  state.team.push(captured);

  sendJson(res, 201, {
    success: true,
    captured: {
      uuid: captured.uuid,
      pokemonId: captured.pokemonId,
      name: captured.name,
      nickname: captured.nickname,
      capturedAt: captured.capturedAt,
    },
  });
};
