import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nbt = require("prismarine-nbt");

const root = "C:/Users/Anthony/Downloads/cobble_data/server files";
const players = {
  "94543733-c7cf-42e5-b62c-76e7fd68973b": "ZippyHere",
  "86739f5c-0ab4-43e1-a130-ff2d009dd22c": "b0ngi",
  "e0555f85-6676-43a8-b3d1-d919af22e6db": "UnlikePowerX",
  "1d518db4-6981-4f8a-895e-b5e0e396798e": "xxiumai",
  "5be41d17-f5ca-4fb6-97ee-043f5ba3a0f2": "Dycrp_t",
};

const statKeys = ["hp", "attack", "defence", "special_attack", "special_defence", "speed"];

const clean = (value = "") => String(value).replace(/^cobblemon:/, "").replaceAll("_", " ");
const statValue = (obj, key) => Number(obj?.[`cobblemon:${key}`] || 0);
const ivTotal = (mon) => statKeys.reduce((sum, key) => sum + statValue(mon.IVs?.Base, key), 0);
const evTotal = (mon) => statKeys.reduce((sum, key) => sum + statValue(mon.EVs, key), 0);
const moves = (mon) => (mon.MoveSet || []).map((move) => move.MoveName).filter(Boolean);
const heldItem = (mon) => (mon.HeldItem?.id ? `${clean(mon.HeldItem.id)} x${mon.HeldItem.count || 1}` : "");
const ability = (mon) => mon.Ability?.AbilityName || "";

const features = (mon) =>
  Object.fromEntries((mon.Features || []).map((feature) => [feature["cobblemon:feature_id"], feature]));

async function parseDat(file) {
  const { parsed } = await nbt.parse(fs.readFileSync(file));
  return nbt.simplify(parsed);
}

function extractPokemon(store, type) {
  const out = [];

  if (type === "pc") {
    for (const [boxKey, box] of Object.entries(store)) {
      if (!/^Box\d+$/.test(boxKey) || !box || typeof box !== "object") continue;
      for (const [slotKey, mon] of Object.entries(box)) {
        if (!/^Slot\d+$/.test(slotKey) || !mon?.Species) continue;
        out.push({ box: Number(boxKey.slice(3)), slot: Number(slotKey.slice(4)), mon });
      }
    }
  } else {
    for (const [slotKey, mon] of Object.entries(store)) {
      if (!/^Slot\d+$/.test(slotKey) || !mon?.Species) continue;
      out.push({ slot: Number(slotKey.slice(4)), mon });
    }
  }

  return out
    .map((entry) => {
      const mon = entry.mon;
      const featureMap = features(mon);
      return {
        box: entry.box,
        slot: entry.slot,
        species: clean(mon.Species),
        rawSpecies: mon.Species,
        level: Number(mon.Level || 0),
        shiny: Boolean(mon.Shiny),
        gender: mon.Gender || "",
        form: mon.FormId || "",
        nature: clean(mon.Nature),
        mintedNature: clean(mon.MintedNature),
        ability: ability(mon),
        teraType: clean(mon.TeraType),
        caughtBall: clean(mon.CaughtBall),
        heldItem: heldItem(mon),
        friendship: Number(mon.Friendship || 0),
        health: Number(mon.Health || 0),
        experience: Number(mon.Experience || 0),
        ivTotal: ivTotal(mon),
        evTotal: evTotal(mon),
        moves: moves(mon),
        spawnBucket: featureMap.spawn_bucket?.spawn_bucket || "",
        originalTrainer: mon.PokemonOriginalTrainer || "",
      };
    })
    .sort((a, b) => (a.box ?? 0) - (b.box ?? 0) || a.slot - b.slot);
}

async function readPlayer(uuid) {
  const prefix = uuid.slice(0, 2);
  const pcFile = path.join(root, "pcstore", prefix, `${uuid}.dat`);
  const partyFile = path.join(root, "playerpartystore", prefix, `${uuid}.dat`);
  const pc = fs.existsSync(pcFile) ? extractPokemon(await parseDat(pcFile), "pc") : [];
  const party = fs.existsSync(partyFile) ? extractPokemon(await parseDat(partyFile), "party") : [];
  const all = [...pc, ...party];

  const speciesCounts = all.reduce((acc, mon) => {
    acc[mon.species] = (acc[mon.species] || 0) + 1;
    return acc;
  }, {});

  return {
    uuid,
    name: players[uuid] || uuid,
    counts: {
      pc: pc.length,
      party: party.length,
      total: all.length,
      shiny: all.filter((mon) => mon.shiny).length,
      level100: all.filter((mon) => mon.level >= 100).length,
      rareBucket: all.filter((mon) => /rare/i.test(mon.spawnBucket)).length,
    },
    highestLevel: [...all].sort((a, b) => b.level - a.level || b.ivTotal - a.ivTotal).slice(0, 10),
    shinies: all.filter((mon) => mon.shiny).sort((a, b) => b.level - a.level),
    bestIvs: [...all].sort((a, b) => b.ivTotal - a.ivTotal || b.level - a.level).slice(0, 10),
    topDuplicates: Object.entries(speciesCounts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([species, count]) => ({ species, count })),
    party,
    pc,
  };
}

const playerSummaries = await Promise.all(Object.keys(players).map(readPlayer));
const summary = {
  generatedAt: new Date().toISOString(),
  sourceFolder: root,
  totals: playerSummaries.reduce(
    (acc, player) => {
      acc.pc += player.counts.pc;
      acc.party += player.counts.party;
      acc.total += player.counts.total;
      acc.shiny += player.counts.shiny;
      return acc;
    },
    { pc: 0, party: 0, total: 0, shiny: 0 },
  ),
  players: playerSummaries,
};

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/pokemon-storage-summary.json", `${JSON.stringify(summary, null, 2)}\n`);

console.table(
  playerSummaries.map((player) => ({
    player: player.name,
    pc: player.counts.pc,
    party: player.counts.party,
    total: player.counts.total,
    shinies: player.counts.shiny,
    topLevel: `${player.highestLevel[0]?.species || "none"} L${player.highestLevel[0]?.level || 0}`,
  })),
);
console.log("Wrote data/pokemon-storage-summary.json");
