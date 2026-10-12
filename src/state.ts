// État du jeu, uniquement en mémoire (perdu au redémarrage).

export interface CapturedPokemon {
  uuid: string;
  pokemonId: number;
  name: string;
  nickname: string;
  sprite: string | null;
  capturedAt: string;
  history: string[]; // espèces successives (ex. ["pikachu", "raichu"])
}

export interface WildEncounter {
  id: number;
  name: string;
  sprite: string | null;
  captureRate: number;
}

export const MAX_TEAM_SIZE = 6;

export const state = {
  team: [] as CapturedPokemon[],
  lastEncounter: null as WildEncounter | null,
};

export function findInTeam(uuid: string): CapturedPokemon | undefined {
  return state.team.find((p) => p.uuid === uuid);
}
