import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const players = [
  {
    uuid: "94543733-c7cf-42e5-b62c-76e7fd68973b",
    name: "ZippyHere",
    file: "C:/Users/Anthony/Downloads/94543733-c7cf-42e5-b62c-76e7fd68973b.json",
  },
  {
    uuid: "86739f5c-0ab4-43e1-a130-ff2d009dd22c",
    name: "b0ngi",
    file: "C:/Users/Anthony/Downloads/86739f5c-0ab4-43e1-a130-ff2d009dd22c.json",
  },
  {
    uuid: "e0555f85-6676-43a8-b3d1-d919af22e6db",
    name: "UnlikePowerX",
    file: "C:/Users/Anthony/Downloads/e0555f85-6676-43a8-b3d1-d919af22e6db.json",
  },
  {
    uuid: "1d518db4-6981-4f8a-895e-b5e0e396798e",
    name: "xxiumai",
    file: "C:/Users/Anthony/Downloads/1d518db4-6981-4f8a-895e-b5e0e396798e.json",
  },
  {
    uuid: "5be41d17-f5ca-4fb6-97ee-043f5ba3a0f2",
    name: "Dycrp_t",
    file: "C:/Users/Anthony/Downloads/5be41d17-f5ca-4fb6-97ee-043f5ba3a0f2.json",
  },
];

const cmStats = [
  "minecraft:walk_one_cm",
  "minecraft:sprint_one_cm",
  "minecraft:fly_one_cm",
  "minecraft:aviate_one_cm",
  "minecraft:swim_one_cm",
  "minecraft:boat_one_cm",
  "minecraft:walk_on_water_one_cm",
  "minecraft:walk_under_water_one_cm",
  "minecraft:climb_one_cm",
  "minecraft:crouch_one_cm",
  "minecraft:fall_one_cm",
  "cobblemon:riding_land",
  "cobblemon:riding_air",
  "cobblemon:riding_liquid",
];

const sumValues = (obj = {}) =>
  Object.values(obj).reduce((total, value) => total + Number(value || 0), 0);

const valueOf = (obj, key) => Number(obj?.[key] || 0);

const topEntries = (obj = {}, count = 8) =>
  Object.entries(obj)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id, value]) => ({ id, label: cleanId(id), value }));

const cleanId = (id) => {
  const [, rawName = id] = id.split(":");
  return rawName
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const playHours = (ticks) => ticks / 20 / 60 / 60;
const kilometers = (centimeters) => centimeters / 100000;

const rawPlayers = await Promise.all(
  players.map(async (player) => {
    const raw = JSON.parse(await readFile(player.file, "utf8"));
    const stats = raw.stats || {};
    const custom = stats["minecraft:custom"] || {};
    const distanceCm = cmStats.reduce((total, key) => total + valueOf(custom, key), 0);
    const playTicks = valueOf(custom, "minecraft:play_time");
    const captures = valueOf(custom, "cobblemon:captured");
    const battlesWon = valueOf(custom, "cobblemon:battles_won");
    const battlesTotal = valueOf(custom, "cobblemon:battles_total");
    const raidsCompleted = valueOf(custom, "cobblemonraiddens:raids_completed");
    const shiniesCaptured = valueOf(custom, "cobblemon:shinies_captured");
    const mined = stats["minecraft:mined"] || {};
    const pickedUp = stats["minecraft:picked_up"] || {};
    const used = stats["minecraft:used"] || {};
    const crafted = stats["minecraft:crafted"] || {};
    const dropped = stats["minecraft:dropped"] || {};

    return {
      uuid: player.uuid,
      name: player.name,
      totals: {
        playHours: Number(playHours(playTicks).toFixed(1)),
        distanceKm: Number(kilometers(distanceCm).toFixed(1)),
        deaths: valueOf(custom, "minecraft:deaths"),
        jumps: valueOf(custom, "minecraft:jump"),
        blocksMined: sumValues(mined),
        itemsUsed: sumValues(used),
        itemsPickedUp: sumValues(pickedUp),
        itemsCrafted: sumValues(crafted),
        itemsDropped: sumValues(dropped),
        chestsOpened: valueOf(custom, "minecraft:open_chest"),
        barrelsOpened: valueOf(custom, "minecraft:open_barrel"),
        fishCaught: valueOf(custom, "minecraft:fish_caught"),
        captures,
        shiniesCaptured,
        eggsHatched: valueOf(custom, "cobblemon:eggs_hatched"),
        dexEntries: valueOf(custom, "cobblemon:dex_entries"),
        battlesWon,
        battlesTotal,
        raidsCompleted,
        raidsJoined: valueOf(custom, "cobblemonraiddens:raids_joined"),
        waystonesActivated: valueOf(custom, "minecraft:waystone_activated"),
      },
      rates: {
        battleWinRate: battlesTotal ? Number(((battlesWon / battlesTotal) * 100).toFixed(1)) : 0,
        capturesPerHour: playTicks ? Number((captures / playHours(playTicks)).toFixed(2)) : 0,
        shinyRate: captures ? Number(((shiniesCaptured / captures) * 100).toFixed(1)) : 0,
      },
      top: {
        mined: topEntries(mined),
        pickedUp: topEntries(pickedUp),
        used: topEntries(used),
        crafted: topEntries(crafted),
      },
    };
  }),
);

const aggregateTotals = rawPlayers.reduce(
  (totals, player) => {
    for (const [key, value] of Object.entries(player.totals)) {
      totals[key] = Number(((totals[key] || 0) + value).toFixed(2));
    }
    return totals;
  },
  {},
);

const leaders = {};
for (const key of Object.keys(rawPlayers[0].totals)) {
  leaders[key] = rawPlayers.reduce((leader, player) =>
    player.totals[key] > leader.totals[key] ? player : leader,
  ).name;
}

for (const key of Object.keys(rawPlayers[0].rates)) {
  leaders[key] = rawPlayers.reduce((leader, player) =>
    player.rates[key] > leader.rates[key] ? player : leader,
  ).name;
}

const categoryScore = (player) => {
  const keys = [
    "playHours",
    "blocksMined",
    "itemsPickedUp",
    "captures",
    "shiniesCaptured",
    "raidsCompleted",
    "dexEntries",
    "distanceKm",
  ];

  return keys.reduce((score, key) => {
    const max = Math.max(...rawPlayers.map((candidate) => candidate.totals[key]));
    return score + (max ? player.totals[key] / max : 0);
  }, 0);
};

const rankedPlayers = rawPlayers
  .map((player) => ({
    ...player,
    score: Number(categoryScore(player).toFixed(2)),
  }))
  .sort((a, b) => b.score - a.score);

const summary = {
  generatedAt: new Date().toISOString(),
  source: "Minecraft server stats JSON files",
  aggregateTotals,
  leaders,
  players: rankedPlayers,
};

await mkdir(path.resolve("data"), { recursive: true });
await writeFile(path.resolve("data/stats-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Wrote data/stats-summary.json for ${rankedPlayers.length} players.`);
