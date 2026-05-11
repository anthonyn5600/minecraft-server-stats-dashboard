# Minecraft Server Stats Dashboard

A static GitHub Pages dashboard generated from Minecraft per-player stats JSON files.

## Update Data

Run:

```bash
npm run build:stats
npm run build:storage
npm run build:types
npm run fetch:icons
```

Then commit and push the updated files in `data/`.

## Assets

Cobblemon Pokédex UI icons are sourced from the upstream Cobblemon project:

https://gitlab.com/cable-mc/cobblemon

Pokemon sprite icons are resolved from the Cobblemon species folders and downloaded from the PokeAPI sprite repository when a matching National Dex number is available.
