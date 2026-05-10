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
let currentMetric = "blocksMined";
let currentPlayer = "";
let summary;

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

fetch("data/stats-summary.json")
  .then((response) => response.json())
  .then((data) => {
    summary = data;
    currentPlayer = summary.players[0].uuid;
    renderAggregate();
    renderChampion();
    renderTabs();
    renderPlayerSelect();
    renderChart();
    renderSelectedPlayer();
  });
