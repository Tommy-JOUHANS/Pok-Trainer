import { getNextForm, getPokemon, getSpecies } from "../pokeapi";
import { findInTeam } from "../state";
import { HttpError, sendJson } from "../utils/http";
import type { Handler } from "./types";

// POST /evolve/:uuid
export const evolve: Handler = async (_req, res, params) => {
  const member = findInTeam(params.uuid);
  if (!member) throw new HttpError(404, "Ce Pokémon n'est pas dans votre équipe");

  const current = await getPokemon(member.pokemonId);
  const species = await getSpecies(current.speciesUrl);
  const next = await getNextForm(species);

  if (!next) {
    throw new HttpError(422, "Ce Pokémon est déjà dans sa forme finale");
  }

  const evolved = await getPokemon(next.id);
  const oldName = member.name;

  // Même objet modifié sur place : uuid, nickname, capturedAt et historique conservés.
  member.pokemonId = evolved.id;
  member.name = evolved.name;
  member.sprite = evolved.sprite;
  member.history.push(evolved.name);

  sendJson(res, 200, {
    message: `Félicitations ! Votre ${oldName} a évolué en ${evolved.name} !`,
    pokemon: {
      uuid: member.uuid,
      pokemonId: member.pokemonId,
      name: member.name,
      nickname: member.nickname,
      sprite: member.sprite,
    },
  });
};
