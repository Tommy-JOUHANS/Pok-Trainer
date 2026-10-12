import { getPokemon, getSpecies } from "../pokeapi";
import { state } from "../state";
import { sendJson } from "../utils/http";
import type { Handler } from "./types";

const MAX_POKEMON_ID = 1025;

// GET /wild
export const wild: Handler = async (_req, res) => {
  const id = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
  const pokemon = await getPokemon(id);
  const species = await getSpecies(pokemon.speciesUrl);

  state.lastEncounter = {
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprite,
    captureRate: species.captureRate,
  };

  sendJson(res, 200, {
    pokemon: {
      id: pokemon.id,
      name: pokemon.name,
      sprite: pokemon.sprite,
      types: pokemon.types,
      stats: pokemon.stats,
    },
    captureRate: species.captureRate,
  });
};
