const metricTabs = [
  { key: "blocksMined", label: "Mined", title: "Blocks mined", unit: "Total blocks" },
  { key: "captures", label: "Captures", title: "Pokemon captured", unit: "Total captures" },
  { key: "shiniesCaptured", label: "Shinies", title: "Shinies captured", unit: "Total shinies" },
  { key: "playHours", label: "Playtime", title: "Hours played", unit: "Hours" },
  { key: "distanceKm", label: "Travel", title: "Distance traveled", unit: "Kilometers" },
  { key: "raidsCompleted", label: "Raids", title: "Raids completed", unit: "Completed raids" },
  { key: "dexEntries", label: "Dex", title: "Dex entries", unit: "Entries" },
];

const aggregateCards = [
  ["playHours", "Total hours", "hours played"],
  ["blocksMined", "Blocks mined", "blocks"],
  ["captures", "Captures", "Pokemon"],
  ["shiniesCaptured", "Shinies", "rare finds"],
  ["distanceKm", "Distance", "km traveled"],
  ["raidsCompleted", "Raids won", "completed"],
  ["battlesWon", "Battles won", "wins"],
  ["dexEntries", "Dex entries", "registered"],
];

const playerStats = [
  ["playHours", "Hours"],
  ["blocksMined", "Blocks mined"],
  ["captures", "Captures"],
  ["shiniesCaptured", "Shinies"],
  ["battleWinRate", "Battle win rate", "rate"],
  ["eggsHatched", "Eggs hatched"],
  ["fishCaught", "Fish caught"],
  ["waystonesActivated", "Waystones"],
];

const colors = ["#76d06b", "#69c9d1", "#e2b84e", "#e46f64", "#9da3ad"];
const typeColors = {
  normal: "#a8a77a",
  fire: "#ee8130",
  water: "#6390f0",
  electric: "#f7d02c",
  grass: "#7ac74c",
  ice: "#96d9d6",
  fighting: "#c22e28",
  poison: "#a33ea1",
  ground: "#e2bf65",
  flying: "#a98ff3",
  psychic: "#f95587",
  bug: "#a6b91a",
  rock: "#b6a136",
  ghost: "#735797",
  dragon: "#6f35fc",
  dark: "#705746",
  steel: "#b7b7ce",
  fairy: "#d685ad",
  stellar: "#69c9d1",
  unknown: "#9da3ad",
};
let currentMetric = "blocksMined";
let currentPlayer = "";
let summary;
let storageSummary;
let iconManifest = {};
let storagePlayer = "";
let storageView = "all";
let storageSort = "level";
let storageSearch = "";

const formatNumber = (value, suffix = "") => {
  const formatted = Number(value).toLocaleString(undefined, {
    maximumFractionDigits: Number(value) >= 100 ? 0 : 1,
  });
  return `${formatted}${suffix}`;
};

const getMetric = (player, key) => {
  if (key in player.totals) return player.totals[key];
  return player.rates[key] || 0;
};

const avatarText = (name) => name.slice(0, 1).toUpperCase();
const titleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const prettyMove = (value = "") => titleCase(value.replace(/([a-z])([A-Z])/g, "$1 $2"));
const pokemonIcon = (mon) => iconManifest[mon.species] || "assets/cobblemon/caught_icon.png";
const typeColor = (type) => typeColors[type] || typeColors.unknown;

const renderAggregate = () => {
  document.querySelector("#player-count").textContent = summary.players.length;
  const container = document.querySelector("#aggregate-metrics");
  container.innerHTML = aggregateCards
    .map(([key, title, label]) => {
      const leader = summary.leaders[key];
      return `
        <article class="panel metric">
          <p class="section-label">${title}</p>
          <strong>${formatNumber(summary.aggregateTotals[key])}</strong>
          <span>${label}</span><br>
          <small>Leader: ${leader}</small>
        </article>
      `;
    })
    .join("");
};

const renderChampion = () => {
  const champion = summary.players[0];
  document.querySelector("#champion-name").textContent = champion.name;
  document.querySelector("#champion-note").textContent = `${champion.score} weighted score across playtime, mining, travel, raids, captures, shinies, and dex progress.`;
  document.querySelector("#champion-avatar").textContent = avatarText(champion.name);

  const maxScore = Math.max(...summary.players.map((player) => player.score));
  document.querySelector("#score-strip").innerHTML = summary.players
    .map(
      (player) => `
        <div class="score-row">
          <strong>${player.name}</strong>
          <div class="track"><div class="fill" style="--value: ${(player.score / maxScore) * 100}%"></div></div>
          <span>${player.score}</span>
        </div>
      `,
    )
    .join("");
};

const renderTabs = () => {
  document.querySelector("#metric-tabs").innerHTML = metricTabs
    .map(
      (tab) => `
        <button class="tab ${tab.key === currentMetric ? "active" : ""}" data-metric="${tab.key}">
          ${tab.label}
        </button>
      `,
    )
    .join("");

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      currentMetric = button.dataset.metric;
      renderTabs();
      renderChart();
    });
  });
};

const renderPlayerSelect = () => {
  const select = document.querySelector("#player-select");
  select.innerHTML = summary.players
    .map((player) => `<option value="${player.uuid}">${player.name}</option>`)
    .join("");
  select.value = currentPlayer;
  select.addEventListener("change", () => {
    currentPlayer = select.value;
    renderSelectedPlayer();
  });
};

const renderChart = () => {
  const tab = metricTabs.find((item) => item.key === currentMetric);
  const players = [...summary.players].sort((a, b) => getMetric(b, currentMetric) - getMetric(a, currentMetric));
  const max = Math.max(...players.map((player) => getMetric(player, currentMetric)), 1);

  document.querySelector("#chart-title").textContent = tab.title;
  document.querySelector("#chart-unit").textContent = tab.unit;
  document.querySelector("#bar-chart").innerHTML = players
    .map((player, index) => {
      const value = getMetric(player, currentMetric);
      return `
        <div class="bar-row">
          <span class="bar-name">${player.name}</span>
          <div class="bar-track">
            <div class="bar-fill" style="--value: ${(value / max) * 100}%; background: linear-gradient(90deg, ${colors[index]}, #f3f5ec);"></div>
          </div>
          <span class="bar-value">${formatNumber(value, currentMetric === "battleWinRate" ? "%" : "")}</span>
        </div>
      `;
    })
    .join("");
};

const renderSelectedPlayer = () => {
  const player = summary.players.find((item) => item.uuid === currentPlayer) || summary.players[0];
  currentPlayer = player.uuid;

  document.querySelector("#selected-avatar").textContent = avatarText(player.name);
  document.querySelector("#selected-name").textContent = player.name;
  document.querySelector("#mined-title").textContent = `${player.name}'s blocks`;
  document.querySelector("#pickup-title").textContent = `${player.name}'s pickups`;

  document.querySelector("#player-stats").innerHTML = playerStats
    .map(([key, label, type]) => {
      const value = getMetric(player, key);
      const suffix = type === "rate" ? "%" : "";
      return `<div><strong>${formatNumber(value, suffix)}</strong>${label}</div>`;
    })
    .join("");

  renderItemList("#mined-list", player.top.mined);
  renderItemList("#pickup-list", player.top.pickedUp);
};

const renderItemList = (selector, items) => {
  const max = Math.max(...items.map((item) => item.value), 1);
  document.querySelector(selector).innerHTML = items
    .map(
      (item) => `
        <div class="item-row">
          <strong>${item.label}</strong>
          <div class="track"><div class="fill" style="--value: ${(item.value / max) * 100}%"></div></div>
          <span>${formatNumber(item.value)}</span>
        </div>
      `,
    )
    .join("");
};

const renderStorageTotals = () => {
  document.querySelector("#storage-totals").innerHTML = `
    <span><strong>${formatNumber(storageSummary.totals.total)}</strong> total</span>
    <span><strong>${formatNumber(storageSummary.totals.pc)}</strong> PC</span>
    <span><strong>${formatNumber(storageSummary.totals.party)}</strong> party</span>
    <span><strong>${formatNumber(storageSummary.totals.shiny)}</strong> shiny</span>
  `;
};

const renderStoragePlayerSelect = () => {
  const select = document.querySelector("#storage-player-select");
  select.innerHTML = storageSummary.players
    .map((player) => `<option value="${player.uuid}">${player.name}</option>`)
    .join("");
  select.value = storagePlayer;
  select.addEventListener("change", () => {
    storagePlayer = select.value;
    renderStorage();
  });
};

const renderStorageControls = () => {
  document.querySelectorAll("[data-storage-view]").forEach((button) => {
    button.addEventListener("click", () => {
      storageView = button.dataset.storageView;
      document.querySelectorAll("[data-storage-view]").forEach((item) => {
        item.classList.toggle("active", item.dataset.storageView === storageView);
      });
      renderStorage();
    });
  });

  document.querySelector("#storage-sort").addEventListener("change", (event) => {
    storageSort = event.target.value;
    renderStorage();
  });

  document.querySelector("#storage-search").addEventListener("input", (event) => {
    storageSearch = event.target.value.trim().toLowerCase();
    renderStorage();
  });
};

const currentStoragePlayer = () => storageSummary.players.find((player) => player.uuid === storagePlayer) || storageSummary.players[0];

const storageCollection = (player) => {
  const withSource = [
    ...player.party.map((mon) => ({ ...mon, source: "party" })),
    ...player.pc.map((mon) => ({ ...mon, source: "pc" })),
  ];

  return withSource
    .filter((mon) => {
      if (storageView === "party") return mon.source === "party";
      if (storageView === "pc") return mon.source === "pc";
      if (storageView === "shiny") return mon.shiny;
      return true;
    })
    .filter((mon) => {
      if (!storageSearch) return true;
      const haystack = [
        mon.species,
        mon.ability,
        mon.nature,
        mon.teraType,
        mon.caughtBall,
        mon.heldItem,
        ...(mon.moves || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(storageSearch);
    })
    .sort((a, b) => {
      if (storageSort === "species") return a.species.localeCompare(b.species);
      if (storageSort === "ivTotal") return b.ivTotal - a.ivTotal || b.level - a.level;
      if (storageSort === "box") return (a.source === "party" ? -1 : a.box) - (b.source === "party" ? -1 : b.box) || a.slot - b.slot;
      return b.level - a.level || b.ivTotal - a.ivTotal;
    });
};

const renderStorageFeatures = (player) => {
  const topLevel = player.highestLevel[0];
  const bestIv = player.bestIvs[0];
  const shiny = player.shinies[0];

  document.querySelector("#storage-feature-grid").innerHTML = [
    ["Collection", `${player.counts.total}`, `${player.counts.pc} PC + ${player.counts.party} party`],
    ["Shinies", `${player.counts.shiny}`, shiny ? `${titleCase(shiny.species)} L${shiny.level}` : "No shinies found"],
    ["Highest level", topLevel ? `L${topLevel.level}` : "0", topLevel ? titleCase(topLevel.species) : "No Pokemon"],
    ["Best IV total", bestIv ? `${bestIv.ivTotal}/186` : "0/186", bestIv ? titleCase(bestIv.species) : "No Pokemon"],
  ]
    .map(
      ([label, value, detail]) => `
        <article>
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${detail}</small>
        </article>
      `,
    )
    .join("");
};

const donutSegments = (typeCounts = {}) => {
  const entries = Object.entries(typeCounts).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  let offset = 0;

  return entries
    .map(([type, count]) => {
      const dash = total ? (count / total) * 100 : 0;
      const percentage = total ? ((count / total) * 100).toFixed(1) : "0.0";
      const circle = `
        <circle
          class="donut-segment"
          cx="21"
          cy="21"
          r="15.9155"
          pathLength="100"
          fill="none"
          stroke="${typeColor(type)}"
          stroke-width="7"
          stroke-dasharray="${dash} ${100 - dash}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 21 21)"
        >
          <title>${titleCase(type)}: ${count} (${percentage}%)</title>
        </circle>
      `;
      offset += dash;
      return circle;
    })
    .join("");
};

const renderTypeInfographics = () => {
  const player = currentStoragePlayer();
  const topTypes = player.topTypes || [];
  const bestIv = player.bestIvs?.[0];
  const typeEntries = player.typeSummary?.typeEntries || 0;
  const fallbackCount = player.typeSummary?.fallbackPokemon || 0;

  document.querySelector("#type-card-grid").innerHTML = `
    <article class="type-card">
      <div class="type-card-head">
        <div>
          <h3>${player.name}</h3>
          <p>${player.counts.pc} PC &middot; ${player.counts.party} party</p>
        </div>
        <span>${player.counts.shiny} shiny</span>
      </div>
      <div class="donut-layout">
        <div class="donut-wrap" aria-label="${player.name} type distribution">
          <svg class="donut-chart" viewBox="0 0 42 42" role="img">
            <title>${player.name} species type distribution</title>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="7" />
            ${donutSegments(player.typeCounts)}
          </svg>
          <div class="donut-center">
            <strong>${player.counts.total}</strong>
            <span>Pokemon</span>
          </div>
        </div>
        <div class="type-legend">
          ${topTypes
            .map((entry) => {
              const percentage = typeEntries ? ((entry.count / typeEntries) * 100).toFixed(1) : "0.0";
              return `
                <div title="${titleCase(entry.type)}: ${entry.count} (${percentage}%)">
                  <i style="background:${typeColor(entry.type)}"></i>
                  <span>${titleCase(entry.type)}</span>
                  <strong>${entry.count} <small>${percentage}%</small></strong>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
      <div class="type-card-stats">
        <div><span>Type entries</span><strong>${typeEntries}</strong></div>
        <div><span>Level 100s</span><strong>${player.counts.level100}</strong></div>
        <div><span>Rare bucket</span><strong>${player.counts.rareBucket}</strong></div>
        <div><span>Best IV</span><strong>${bestIv ? `${titleCase(bestIv.species)} ${bestIv.ivTotal}/186` : "None"}</strong></div>
      </div>
      ${
        fallbackCount
          ? `<p class="type-note">${fallbackCount} custom/form species use tera type fallback.</p>`
          : `<p class="type-note">All species resolved to normal type data.</p>`
      }
    </article>
  `;
};

const renderStorage = () => {
  const player = currentStoragePlayer();
  storagePlayer = player.uuid;
  document.querySelector("#storage-title").textContent = `${player.name}'s Pokemon collection`;
  renderStorageFeatures(player);
  renderTypeInfographics();

  const collection = storageCollection(player);
  document.querySelector("#storage-count").textContent = `Showing ${collection.length.toLocaleString()} of ${player.counts.total.toLocaleString()} Pokemon`;
  document.querySelector("#pokemon-grid").innerHTML = collection
    .map(
      (mon) => `
        <article class="pokemon-card ${mon.shiny ? "is-shiny" : ""}">
          <div class="pokemon-card-top">
            <div class="pokedex-icon">
              <img src="${pokemonIcon(mon)}" alt="" onerror="this.src='assets/cobblemon/caught_icon.png'" />
              <span class="dex-badge"><img src="${mon.shiny ? "assets/cobblemon/button_shiny.png" : "assets/cobblemon/caught_icon.png"}" alt="" /></span>
            </div>
            <div>
              <h3>${titleCase(mon.species)}</h3>
              <p>${mon.source === "party" ? "Party" : `Box ${mon.box + 1}`} · Slot ${mon.slot + 1}</p>
            </div>
            <strong>L${mon.level}</strong>
          </div>
          <div class="pokemon-tags">
            ${mon.shiny ? "<span>Shiny</span>" : ""}
            ${mon.gender ? `<span>${titleCase(mon.gender.toLowerCase())}</span>` : ""}
            ${mon.form && mon.form !== "normal" ? `<span>${titleCase(mon.form)}</span>` : ""}
            ${mon.spawnBucket ? `<span>${titleCase(mon.spawnBucket)}</span>` : ""}
          </div>
          <dl>
            <div><dt>Ability</dt><dd>${titleCase(mon.ability)}</dd></div>
            <div><dt>Nature</dt><dd>${titleCase(mon.mintedNature || mon.nature)}</dd></div>
            <div><dt>Tera</dt><dd>${titleCase(mon.teraType)}</dd></div>
            <div><dt>IV total</dt><dd>${mon.ivTotal}/186</dd></div>
          </dl>
          <p class="moves">${(mon.moves || []).map(prettyMove).join(" · ") || "No moves listed"}</p>
          ${mon.heldItem ? `<p class="held">Held: ${titleCase(mon.heldItem)}</p>` : ""}
        </article>
      `,
    )
    .join("");
};

Promise.all([
  fetch("data/stats-summary.json").then((response) => response.json()),
  fetch("data/pokemon-storage-summary.json").then((response) => response.json()),
  fetch("assets/pokemon/icon-manifest.json").then((response) => response.json()).catch(() => ({})),
]).then(([statsData, storageData, iconData]) => {
  summary = statsData;
  storageSummary = storageData;
  iconManifest = iconData;
  currentPlayer = summary.players[0].uuid;
  storagePlayer = storageSummary.players[0].uuid;
  renderAggregate();
  renderChampion();
  renderTabs();
  renderPlayerSelect();
  renderChart();
  renderSelectedPlayer();
  renderStorageTotals();
  renderStoragePlayerSelect();
  renderStorageControls();
  renderStorage();
});
