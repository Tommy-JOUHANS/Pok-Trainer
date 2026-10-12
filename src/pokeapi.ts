// Client PokéAPI : lecture seule, avec timeout et erreur typée (→ 502).

const BASE_URL = process.env.POKEAPI_BASE_URL ?? "https://pokeapi.co/api/v2";
const TIMEOUT_MS = 5000;

export class PokeApiError extends Error {}

export interface PokemonData {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
  stats: { hp: number; attack: number; defense: number; speed: number };
  speciesUrl: string;
}

export interface SpeciesData {
  name: string;
  captureRate: number;
  description: string | null;
  evolutionChainUrl: string;
}

interface ChainLink {
  species: { name: string; url: string };
  evolves_to: ChainLink[];
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new PokeApiError("PokéAPI injoignable");
  }
  if (!res.ok) {
    throw new PokeApiError(`PokéAPI a répondu ${res.status}`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new PokeApiError("Réponse PokéAPI illisible");
  }
}

/** Récupère l'id numérique à la fin d'une URL PokéAPI (".../pokemon-species/26/"). */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) throw new PokeApiError(`URL PokéAPI inattendue : ${url}`);
  return Number(match[1]);
}

export async function getPokemon(id: number): Promise<PokemonData> {
  const raw = await getJson<any>(`${BASE_URL}/pokemon/${id}`);
  const stat = (name: string): number =>
    raw.stats.find((s: any) => s.stat.name === name)?.base_stat ?? 0;
  return {
    id: raw.id,
    name: raw.name,
    sprite: raw.sprites?.front_default ?? null,
    types: raw.types.map((t: any) => t.type.name),
    stats: {
      hp: stat("hp"),
      attack: stat("attack"),
      defense: stat("defense"),
      speed: stat("speed"),
    },
    speciesUrl: raw.species.url,
  };
}

export async function getSpecies(url: string): Promise<SpeciesData> {
  const raw = await getJson<any>(url);
  const fr = raw.flavor_text_entries.find((e: any) => e.language.name === "fr");
  return {
    name: raw.name,
    captureRate: raw.capture_rate,
    description: fr ? fr.flavor_text.replace(/[\n\f\r]+/g, " ").trim() : null,
    evolutionChainUrl: raw.evolution_chain.url,
  };
}

/** Parcours récursif de l'arbre d'évolution pour trouver le nœud d'une espèce. */
function findLink(link: ChainLink, speciesName: string): ChainLink | null {
  if (link.species.name === speciesName) return link;
  for (const child of link.evolves_to) {
    const found = findLink(child, speciesName);
    if (found) return found;
  }
  return null;
}

/**
 * Renvoie la forme suivante (première branche) ou null si forme finale.
 * L'id renvoyé est celui de l'espèce, qui correspond au Pokémon par défaut.
 */
export async function getNextForm(
  species: SpeciesData
): Promise<{ id: number; name: string } | null> {
  const chain = await getJson<{ chain: ChainLink }>(species.evolutionChainUrl);
  const node = findLink(chain.chain, species.name);
  const next = node?.evolves_to[0];
  if (!next) return null;
  return { id: idFromUrl(next.species.url), name: next.species.name };
}
