# PokéTrainer API

API REST en **Node.js pur** (module `http`, sans framework) et **TypeScript** qui simule une mini-aventure de dresseur Pokémon. Les données Pokémon (stats, sprites, descriptions, évolutions) viennent de [PokéAPI](https://pokeapi.co), utilisée **en lecture seule**. L'état du jeu (équipe, dernière rencontre) est gardé **en mémoire** : il est perdu au redémarrage, ce qui est accepté par le sujet.

---

## Démarrage

```bash
npm install
npm run build     # compile src/ → dist/ avec tsc
npm start         # node dist/index.js → http://localhost:3000
```

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port d'écoute | `3000` |
| `POKEAPI_BASE_URL` | URL de PokéAPI (pour tester avec un faux serveur) | `https://pokeapi.co/api/v2` |

---

## Architecture

```
src/
  index.ts          Serveur http + routeur maison (méthode + regex) + gestion d'erreurs centralisée
  state.ts          État en mémoire : équipe (max 6) et dernière rencontre
  pokeapi.ts        Client PokéAPI : fetch natif, timeout 5 s, erreur PokeApiError → 502
  routes/
    wild.ts         GET  /wild
    capture.ts      POST /capture
    pokedex.ts      GET  /pokedex  et  GET /pokedex/:uuid
    evolve.ts       POST /evolve/:uuid
    release.ts      POST /release/:uuid
    types.ts        Type commun des handlers
  utils/http.ts     sendJson, readJsonBody, HttpError
```

**Principe de la gestion d'erreurs** : les routes ne renvoient jamais elles-mêmes un code d'erreur. Elles lèvent une exception (`HttpError(404, …)`, `PokeApiError`…) et le routeur de `index.ts` la convertit en réponse JSON avec le bon code. Toute erreur imprévue donne un 500 au lieu de faire planter le serveur.

---

## Routes (3 GET / 3 POST)

| Méthode | Route | Rôle | Succès | Erreurs |
|---|---|---|---|---|
| GET | `/wild` | Rencontre un Pokémon au hasard (id 1 à 1025) | 200 | 502 |
| POST | `/capture` | Tente de capturer le Pokémon rencontré | 201 (capturé) / 200 (échappé) | 400, 409 |
| GET | `/pokedex` | Liste l'équipe, du plus récent au plus ancien | 200 | — |
| GET | `/pokedex/:uuid` | Fiche complète (types, stats, description FR, évolution) | 200 | 404, 502 |
| POST | `/evolve/:uuid` | Fait évoluer vers la forme suivante | 200 | 404, 422, 502 |
| POST | `/release/:uuid` | Relâche le Pokémon | 200 | 404 |

En plus : route inconnue → **404**, mauvaise méthode (ex. `DELETE /wild`) → **405**, erreur inattendue → **500**.

### Fonctionnement de la capture

1. `GET /wild` tire un Pokémon et le mémorise comme **dernière rencontre**.
2. `POST /capture` avec `{ "pokemonId": <id> }` vérifie que l'id correspond à cette rencontre, sinon **400**.
3. Si l'équipe a déjà 6 Pokémon → **409**.
4. Probabilité : `captureRate / 255 × 100` %. Un tirage `Math.random()` décide du succès.
5. Succès → **201**, le Pokémon rejoint l'équipe avec un `uuid`, un `nickname` (nom de l'espèce) et un `capturedAt`.
   Échec → **200** avec `"success": false`, le Pokémon s'enfuit.
6. Dans les deux cas, la rencontre est consommée : il faut rappeler `/wild`.

Exemples de taux : Pikachu (190) ≈ 74,5 %, Quaxly (45) ≈ 17,6 %, Kyurem (3) ≈ 1,2 %.

### Fonctionnement de l'évolution

1. Récupération de l'espèce (`pokemon-species`) puis de sa chaîne d'évolution (`evolution-chain`).
2. Parcours **récursif** de l'arbre pour trouver l'espèce actuelle, puis lecture de `evolves_to[0]` (première branche si plusieurs, ex. Évoli).
3. Pas de forme suivante → **422** « Ce Pokémon est déjà dans sa forme finale ».
4. Sinon le Pokémon est mis à jour **sur place** : nouvel id, nom et sprite, mais `uuid`, `nickname` et `capturedAt` conservés. Le champ interne `history` garde les espèces successives.

---

## Grille de validation

| Critère du sujet | Statut | Où / comment |
|---|---|---|
| Compile avec `tsc`, se lance avec `node dist/index.js` | ✅ | `npm run build` puis `npm start` |
| 6 routes en JSON avec les bons codes (200, 201, 400, 404, 409, 422) | ✅ | Voir tableau des routes |
| Aucune écriture vers PokéAPI | ✅ | `pokeapi.ts` ne fait que des `GET` |
| Pas de crash si PokéAPI est injoignable → 502 | ✅ | Timeout 5 s + `PokeApiError` |
| Équipe limitée à 6 | ✅ | `MAX_TEAM_SIZE` dans `state.ts`, vérifié avant le tirage |
| Capture selon `capture_rate / 255` | ✅ | `routes/capture.ts` |
| Body invalide → 400, pas d'exception non gérée | ✅ | `readJsonBody` + validation de `pokemonId` |

Cas d'erreur testés : JSON invalide, body vide, champ manquant, `pokemonId` en texte (`"25"`), Pokémon non rencontré, équipe pleine, uuid inconnu, forme finale, PokéAPI coupée.

---

## Tester avec curl (Linux / WSL)

Astuce : pour que chaque réponse finisse par un retour à la ligne (sinon le prompt se colle à la réponse) :

```bash
echo 'write-out = "\n"' >> ~/.curlrc
```

Parcours complet :

```bash
# 1. Rencontrer un Pokémon (noter son "id")
curl http://localhost:3000/wild

# 2. Le capturer (remplacer 912 par l'id obtenu)
curl -X POST http://localhost:3000/capture -H 'Content-Type: application/json' -d '{"pokemonId": 912}'

# 3. Voir l'équipe (noter un "uuid")
curl http://localhost:3000/pokedex

# 4. Détail, évolution, relâche
curl http://localhost:3000/pokedex/<uuid>
curl -X POST http://localhost:3000/evolve/<uuid>
curl -X POST http://localhost:3000/release/<uuid>
```

Boucle rencontre + capture jusqu'au succès :

```bash
until curl -s http://localhost:3000/wild | node -pe 'JSON.parse(require("fs").readFileSync(0)).pokemon.id' > /tmp/id && curl -s -X POST http://localhost:3000/capture -H 'Content-Type: application/json' -d "{\"pokemonId\": $(cat /tmp/id)}" | tee /dev/stderr | grep -q '"success":true'; do echo; done
```

Les routes **POST** ne sont pas testables en tapant l'URL dans un navigateur : utiliser curl, Postman ou Thunder Client (VS Code). La racine `http://localhost:3000/` renvoie volontairement un 404, aucune route n'y est définie.

---

## Choix d'implémentation

- **Routeur maison** : un tableau `{ méthode, regex, handler }`, les groupes nommés de la regex (`(?<uuid>…)`) deviennent les paramètres. Distingue 404 (route inconnue) et 405 (mauvaise méthode).
- **`fetch` natif** (Node 18+) avec `AbortSignal.timeout` : aucune dépendance externe.
- **`crypto.randomUUID()`** pour les uuid, natif aussi.
- **Équipe pleine vérifiée avant le tirage** : on ne fait pas fuir un Pokémon si la capture est de toute façon impossible.
- **Id de la forme suivante lu dans l'URL de l'espèce**, pas déduit du nom (plus fiable pour les formes particulières).
- **Description française nettoyée** : les `\n` et `\f` de PokéAPI sont remplacés par des espaces.
- **Message de relâche avec le surnom** : plus naturel après une évolution.

## Pistes bonus (non réalisées)

- Migration vers Express (routeur, middleware JSON, middleware d'erreurs) : la gestion d'erreurs étant déjà centralisée, la migration est directe.
- `GET /stats` : compteur global de rencontres et de captures.
- `GET /pokedex?type=electric` : filtrage par type.
- Persistance dans un fichier JSON avec `fs/promises`.