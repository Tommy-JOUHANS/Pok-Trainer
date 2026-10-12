# Pok-Trainer
PokéTrainer — Sujet de TP : API REST Node.js/TypeScript

🎯 Objectif pédagogique

Construire une API REST sans framework (Node.js pur avec le module http, puis migration vers Express) qui simule une mini-aventure de dresseur Pokémon. L'API s'appuie sur PokéAPI pour toutes les données Pokémon (stats, sprites, évolutions) et garde l'état du jeu en mémoire (aucune base de données).

Contraintes techniques :





TypeScript + Node.js (module http natif, pas de framework au départ)



PokéAPI est en lecture seule : votre API est la seule à détenir l'état du jeu (Pokémon capturés)



Le state en mémoire est perdu au redémarrage — c'est accepté pour ce TP



Toutes les réponses sont en JSON avec un code HTTP approprié



📚 Endpoints PokéAPI à utiliser

Vous aurez besoin de ces endpoints de PokéAPI (pas d'API key requise) :







Usage



Endpoint PokéAPI





Pokémon par id (1 à 1025)



GET https://pokeapi.co/api/v2/pokemon/{id}





Espèce : description française, chaîne d'évolution



GET https://pokeapi.co/api/v2/pokemon-species/{id}





Chaîne d'évolution complète



GET https://pokeapi.co/api/v2/evolution-chain/{id}

Champs utiles de GET /pokemon/{id} :

{
  "id": 25,
  "name": "pikachu",
  "sprites": { "front_default": "https://raw.githubusercontent.com/...png" },
  "types": [{ "type": { "name": "electric" } }],
  "stats": [{ "stat": { "name": "hp" }, "base_stat": 35 }]
}

Champs utiles de GET /pokemon-species/{id} :





capture_rate (0–255, utilisé pour le taux de capture)



evolution_chain.url (URL de la chaîne d'évolution)



flavor_text_entries (filtrer sur language.name === "fr" pour la description)



📋 Spécification des routes

Équilibre imposé : 3 GET / 3 POST.

1. GET /wild — Rencontre un Pokémon sauvage

Tire un Pokémon au hasard (id entre 1 et 1025) et le renvoie avec son taux de capture. Le tirage est décorrélé de la capture : on doit d'abord appeler /wild, puis tenter POST /capture sur ce Pokémon.

Réponse 200 :

{
  "pokemon": {
    "id": 25,
    "name": "pikachu",
    "sprite": "https://raw.githubusercontent.com/...png",
    "types": ["electric"],
    "stats": { "hp": 35, "attack": 55, "defense": 40, "speed": 90 }
  },
  "captureRate": 190
}



2. POST /capture — Tente une capture

Body de la requête :

{ "pokemonId": 25 }

Logique imposée :





Vérifier que le Pokémon est bien celui de la dernière rencontre /wild → sinon 400



Calculer la probabilité de capture : proba = captureRate / 255 * 100 (en %)



Lancer un tirage aléatoire (Math.random()), succès si le tirage est inférieur à la proba



En cas de succès : ajouter le Pokémon à l'équipe (max 6, sinon 409) avec un uuid interne, un nickname (le nom de l'espèce par défaut) et un capturedAt



En cas d'échec : le Pokémon s'enfuit, il faut rappeler /wild

Réponse 201 (succès) :

{
  "success": true,
  "captured": {
    "uuid": "a1b2c3d4",
    "pokemonId": 25,
    "name": "pikachu",
    "nickname": "pikachu",
    "capturedAt": "2026-10-12T14:30:00Z"
  }
}

Réponse 200 (échec) :

{ "success": false, "message": "Oh non ! Le Pokémon s'est échappé !" }

Codes d'erreur : 400 (body invalide ou Pokémon non rencontré), 409 (équipe pleine).



3. GET /pokedex — Liste l'équipe

Renvoie les Pokémon capturés, triés du plus récent au plus ancien.

Réponse 200 :

{
  "count": 2,
  "team": [
    { "uuid": "e5f6", "pokemonId": 25, "name": "pikachu", "nickname": "pikachu", "sprite": "..." },
    { "uuid": "a1b2", "pokemonId": 4, "name": "charmander", "nickname": "caleçon", "sprite": "..." }
  ]
}



4. GET /pokedex/:uuid — Détail d'un Pokémon capturé

Renvoie la fiche complète du Pokémon de l'équipe, enrichie à la demande de PokéAPI (types, stats, description française).

Réponse 200 :

{
  "uuid": "a1b2c3d4",
  "name": "pikachu",
  "nickname": "pikachu",
  "types": ["electric"],
  "stats": { "hp": 35, "attack": 55, "defense": 40, "speed": 90 },
  "description": "Quand il est fâché, ce Pokémon libère l'énergie...",
  "evolution": { "canEvolve": true, "nextForm": "raichu" }
}

Codes d'erreur : 404 si le uuid n'est pas dans l'équipe.



5. POST /evolve/:uuid — Fait évoluer un Pokémon

Logique imposée :





Trouver le Pokémon dans l'équipe → sinon 404



Interroger la chaîne d'évolution via pokemon-species → evolution_chain



Si le Pokémon n'a pas de forme suivante → 422 avec message « Ce Pokémon est déjà dans sa forme finale »



Sinon : remplacer le Pokémon dans l'équipe par sa forme suivante (nouvel id PokéAPI, nouveaux stats/sprite), en conservant le même uuid, le nickname et l'historique

Réponse 200 :

{
  "message": "Félicitations ! Votre pikachu a évolué en raichu !",
  "pokemon": { "uuid": "a1b2c3d4", "pokemonId": 26, "name": "raichu", "nickname": "pikachu", "sprite": "..." }
}

Codes d'erreur : 404 (uuid inconnu), 422 (pas d'évolution possible), 502 (PokéAPI injoignable).



6. POST /release/:uuid — Relâche un Pokémon

Libère le Pokémon (le retire de l'équipe définitivement).

Réponse 200 :

{ "message": "pikachu a été relâché. Adieu !", "released": { "uuid": "a1b2c3d4", "name": "pikachu" } }

Codes d'erreur : 404 si le uuid n'est pas dans l'équipe.



✅ Grille de validation (checklist de rendu)





Le projet compile avec tsc et se lance avec node dist/index.js



Les 6 routes répondent en JSON avec les bons codes HTTP (200, 201, 400, 404, 409, 422)



Aucun état du jeu n'est envoyé en écriture à PokéAPI (lecture seule)



Le serveur ne plante pas si PokéAPI est injoignable (gestion d'erreur 502)



L'équipe est limitée à 6 Pokémon



La capture respecte le taux de capture de l'espèce (capture_rate / 255)



Les erreurs de body (JSON invalide, champ manquant) renvoient 400 et non une exception non gérée

🔀 Bonus (facultatif)





Migration vers Express : mêmes routes, avec un routeur, un middleware de parsing JSON et un middleware d'erreurs centralisé



Ajouter un compteur global de rencontres et de captures (GET /stats)



Endpoint GET /pokedex?type=electric avec filtrage par type



Persistance dans un simple fichier JSON (fs/promises) pour survivre au redémarrage