import { getNextForm, getPokemon, getSpecies } from "../pokeapi";
import { findInTeam, state } from "../state";
import { HttpError, sendJson } from "../utils/http";
import type { Handler } from "./types";

// GET /pokedex
export const listTeam: Handler = async (_req, res) => {
  const team = [...state.team]
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    .map(({ uuid, pokemonId, name, nickname, sprite }) => ({
      uuid,
      pokemonId,
      name,
      nickname,
      sprite,
    }));

  sendJson(res, 200, { count: team.length, team });
};

// GET /pokedex/:uuid
export const getTeamMember: Handler = async (_req, res, params) => {
  const member = findInTeam(params.uuid);
  if (!member) throw new HttpError(404, "Ce Pokémon n'est pas dans votre équipe");

  const pokemon = await getPokemon(member.pokemonId);
  const species = await getSpecies(pokemon.speciesUrl);
  const next = await getNextForm(species);

  sendJson(res, 200, {
    uuid: member.uuid,
    pokemonId: member.pokemonId,
    name: member.name,
    nickname: member.nickname,
    types: pokemon.types,
    stats: pokemon.stats,
    description: species.description,
    evolution: {
      canEvolve: next !== null,
      nextForm: next?.name ?? null,
    },
  });
};
