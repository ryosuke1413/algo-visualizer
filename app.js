const N = 20;
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");

const solveBtn = document.getElementById("solve");
const stepBtn = document.getElementById("step");
const clearPathBtn = document.getElementById("clearPath");
const clearWallsBtn = document.getElementById("clearWalls");
const resetAllBtn = document.getElementById("resetAll");

let start = { r: 2, c: 2 };
let goal  = { r: 17, c: 17 };
const walls = new Set(); // "r,c"

// visualization state
let openSet = null;     // array of node keys
let cameFrom = null;    // Map(key -> parentKey)
let gScore = null;      // Map(key -> number)
let fScore = null;      // Map(key -> number)
let openKeySet = null;  // Set for membership
let closedSet = null;   // Set of visited
let solvedPath = null;  // array of keys
let finished = false;

function key(r, c) { return `${r},${c}`; }
function parseKey(k) { const [r,c] = k.split(",").map(Number); return { r, c }; }
function inBounds(r,c){ return r>=0 && r<N && c>=0 && c<N; }

function renderStatus(extra="") {
  statusEl.textContent =
    `Start=(${start.r},${start.c})  Goal=(${goal.r},${goal.c})  Walls=${walls.size}` +
    (extra ? `  |  ${extra}` : "");
}

function rebuildGrid() {
  gridEl.innerHTML = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.r = String(r);
      div.dataset.c = String(c);
      gridEl.appendChild(div);
    }
  }
  paintAll();
  renderStatus("Ready");
}

function clearSearchVisuals() {
  const cells = gridEl.querySelectorAll(".cell");
  cells.forEach(cell => {
    cell.classList.remove("open", "closed", "path");
  });
}

function paintAll() {
  const cells = gridEl.querySelectorAll(".cell");
  cells.forEach(cell => {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const k = key(r,c);

    cell.classList.toggle("start", r === start.r && c === start.c);
    cell.classList.toggle("goal",  r === goal.r  && c === goal.c);
    cell.classList.toggle("wall",  walls.has(k));
  });

  // overlay search visuals if any
  if (closedSet) {
    for (const k of closedSet) {
      const {r,c} = parseKey(k);
      const cell = gridEl.children[r*N + c];
      if (cell) cell.classList.add("closed");
    }
  }
  if (openKeySet) {
    for (const k of openKeySet) {
      const {r,c} = parseKey(k);
      const cell = gridEl.children[r*N + c];
      if (cell) cell.classList.add("open");
    }
  }
  if (solvedPath) {
    for (const k of solvedPath) {
      const {r,c} = parseKey(k);
      const cell = gridEl.children[r*N + c];
      if (cell) cell.classList.add("path");
    }
  }
}

function setStart(r, c) {
  if (r === goal.r && c === goal.c) return;
  walls.delete(key(r,c));
  start = { r, c };
  resetSearch();
  paintAll();
  renderStatus("Ready");
}
function setGoal(r, c) {
  if (r === start.r && c === start.c) return;
  walls.delete(key(r,c));
  goal = { r, c };
  resetSearch();
  paintAll();
  renderStatus("Ready");
}
function toggleWall(r, c) {
  const k = key(r,c);
  if ((r === start.r && c === start.c) || (r === goal.r && c === goal.c)) return;
  if (walls.has(k)) walls.delete(k);
  else walls.add(k);
  resetSearch();
  paintAll();
  renderStatus("Ready");
}

// Click behavior:
// - normal click: toggle wall
// - Shift+click: set Start
// - Alt(Option)+click: set Goal
gridEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const r = Number(cell.dataset.r);
  const c = Number(cell.dataset.c);

  if (e.shiftKey) setStart(r,c);
  else if (e.altKey) setGoal(r,c);
  else toggleWall(r,c);
});

clearWallsBtn.onclick = () => {
  walls.clear();
  resetSearch();
  paintAll();
  renderStatus("Ready");
};

resetAllBtn.onclick = () => {
  walls.clear();
  start = { r: 2, c: 2 };
  goal  = { r: 17, c: 17 };
  resetSearch();
  paintAll();
  renderStatus("Ready");
};

clearPathBtn.onclick = () => {
  resetSearch();
  paintAll();
  renderStatus("Ready");
};

// ---------- A* (JS version) ----------
function heuristic(aKey, bKey) {
  const a = parseKey(aKey), b = parseKey(bKey);
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); // Manhattan
}

function neighbors(k) {
  const { r, c } = parseKey(k);
  const cand = [
    {r:r-1,c}, {r:r+1,c}, {r,c:c-1}, {r,c:c+1}
  ];
  const out = [];
  for (const p of cand) {
    if (!inBounds(p.r,p.c)) continue;
    const nk = key(p.r,p.c);
    if (walls.has(nk)) continue;
    out.push(nk);
  }
  return out;
}

function initSearch() {
  const s = key(start.r, start.c);
  const g = key(goal.r, goal.c);

  openSet = [s];
  openKeySet = new Set([s]);
  closedSet = new Set();
  cameFrom = new Map();
  gScore = new Map([[s, 0]]);
  fScore = new Map([[s, heuristic(s, g)]]);
  solvedPath = null;
  finished = false;

  renderStatus("A* initialized");
}

function reconstructPath(endKey) {
  const path = [];
  let cur = endKey;
  while (cur) {
    path.push(cur);
    cur = cameFrom.get(cur);
  }
  path.reverse();
  return path;
}

function bestOpenNode() {
  let bestIdx = 0;
  let bestK = openSet[0];
  let bestF = fScore.get(bestK) ?? Infinity;

  for (let i = 1; i < openSet.length; i++) {
    const k = openSet[i];
    const f = fScore.get(k) ?? Infinity;
    if (f < bestF) {
      bestF = f;
      bestK = k;
      bestIdx = i;
    }
  }
  // remove from array
  openSet.splice(bestIdx, 1);
  openKeySet.delete(bestK);
  return bestK;
}

function stepSearch() {
  if (finished) return;

  if (!openSet || !cameFrom) initSearch();

  const s = key(start.r, start.c);
  const g = key(goal.r, goal.c);

  if (openSet.length === 0) {
    finished = true;
    renderStatus("No path");
    return;
  }

  const current = bestOpenNode();
  closedSet.add(current);

  if (current === g) {
    solvedPath = reconstructPath(current);
    finished = true;
    renderStatus(`Solved! path_len=${solvedPath.length}`);
    return;
  }

  const curG = gScore.get(current) ?? Infinity;

  for (const nb of neighbors(current)) {
    if (closedSet.has(nb)) continue;

    const tentative = curG + 1; // grid cost
    const old = gScore.get(nb);

    if (old === undefined || tentative < old) {
      cameFrom.set(nb, current);
      gScore.set(nb, tentative);
      fScore.set(nb, tentative + heuristic(nb, g));

      if (!openKeySet.has(nb)) {
        openSet.push(nb);
        openKeySet.add(nb);
      }
    }
  }

  renderStatus(`Open=${openSet.length} Closed=${closedSet.size}`);
}

function solveAll() {
  initSearch();
  // hard cap to avoid infinite loop in case of bugs
  for (let i = 0; i < 5000 && !finished; i++) stepSearch();
  paintAll();
}

function resetSearch() {
  openSet = null;
  cameFrom = null;
  gScore = null;
  fScore = null;
  openKeySet = null;
  closedSet = null;
  solvedPath = null;
  finished = false;
  clearSearchVisuals();
}

stepBtn.onclick = () => {
  stepSearch();
  paintAll();
};

solveBtn.onclick = () => {
  solveAll();
};

// init
rebuildGrid();
