// =========================
// Grid + A* Visualizer
// Step: JS A* (visualize open/closed)
// Solve: WASM solver (path only)
// ClearPath: clears search/path overlays
// =========================

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
const walls = new Set(); // key: "r,c"

// --- search / viz state (JS A*) ---
let openSet = null;     // array of node keys
let openKeySet = null;  // Set membership for openSet
let closedSet = null;   // Set visited
let cameFrom = null;    // Map(child -> parent)
let gScore = null;      // Map(key -> cost)
let fScore = null;      // Map(key -> cost+heuristic)
let solvedPath = null;  // array of keys
let finished = false;

// ---------- helpers ----------
function key(r, c) { return `${r},${c}`; }
function parseKey(k) { const [r,c] = k.split(",").map(Number); return { r, c }; }
function inBounds(r,c){ return r>=0 && r<N && c>=0 && c<N; }

// ---------- UI ----------
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
  cells.forEach(cell => cell.classList.remove("open", "closed", "path"));
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

  // overlays
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

function resetSearch() {
  openSet = null;
  openKeySet = null;
  closedSet = null;
  cameFrom = null;
  gScore = null;
  fScore = null;
  solvedPath = null;
  finished = false;
  clearSearchVisuals();
}

// ---------- click controls ----------
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
  if ((r === start.r && c === start.c) || (r === goal.r && c === goal.c)) return;
  const k = key(r,c);
  if (walls.has(k)) walls.delete(k);
  else walls.add(k);
  resetSearch();
  paintAll();
  renderStatus("Ready");
}

// normal click=wall, Shift=Start, Alt/Option=Goal
gridEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const r = Number(cell.dataset.r);
  const c = Number(cell.dataset.c);

  if (e.shiftKey) setStart(r,c);
  else if (e.altKey) setGoal(r,c);
  else toggleWall(r,c);
});

// ---------- JS A* (step visualization) ----------
function heuristic(aKey, bKey) {
  const a = parseKey(aKey), b = parseKey(bKey);
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
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

  openSet.splice(bestIdx, 1);
  openKeySet.delete(bestK);
  return bestK;
}

function stepSearch() {
  if (finished) return;

  if (!openSet) initSearch();

  const g = key(goal.r, goal.c);

  if (openSet.length === 0) {
    finished = true;
    renderStatus("No path (JS)");
    return;
  }

  const current = bestOpenNode();
  closedSet.add(current);

  if (current === g) {
    solvedPath = reconstructPath(current);
    finished = true;
    renderStatus(`Solved (JS)! path_len=${solvedPath.length}`);
    return;
  }

  const curG = gScore.get(current) ?? Infinity;

  for (const nb of neighbors(current)) {
    if (closedSet.has(nb)) continue;

    const tentative = curG + 1;
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

// ---------- WASM loader (lazy) ----------
let AstarModulePromise = null;
async function getAstarModule() {
  if (!AstarModulePromise) {
    AstarModulePromise = import("./wasm/astar.js").then(m => m.default());
  }
  return AstarModulePromise;
}

async function solveWithWasm() {

console.log("Calling _solve with:", {
  n,
  start,
  goal,
  wallsPtr,
  outPtr,
  size
});
  
console.log("WASM loaded. exports:", {
  solve: typeof AstarModule._solve,
  malloc: typeof AstarModule._malloc,
  free: typeof AstarModule._free,
});

  
  let AstarModule;
  try {
    AstarModule = await getAstarModule();
  } catch (e) {
    console.error(e);
    renderStatus("WASM load failed (see Console)");
    return;
  }

  const n = N;
  const size = n * n;

  const wallsArr = new Int32Array(size);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      wallsArr[r*n + c] = walls.has(`${r},${c}`) ? 1 : 0;
    }
  }

  const wallsPtr = AstarModule._malloc(wallsArr.byteLength);
  AstarModule.HEAP32.set(wallsArr, wallsPtr >> 2);

  const outPtr = AstarModule._malloc(size * 4);

  const len = AstarModule._solve(
    n,
    start.r, start.c,
    goal.r,  goal.c,
    wallsPtr,
    outPtr,
    size
  );

  solvedPath = null;
  finished = true;
  clearSearchVisuals(); // show only path for wasm solve

  if (len > 0) {
    const HEAP32 = AstarModule.HEAP32 || AstarModule.HEAP32View;
    HEAP32.set(wallsArr, wallsPtr >> 2);
    solvedPath = Array.from(out, idx => {
      const r = Math.floor(idx / n);
      const c = idx % n;
      return `${r},${c}`;
    });
    renderStatus(`Solved by WASM! path_len=${len}`);
  } else {
    renderStatus("No path (WASM)");
  }

  AstarModule._free(wallsPtr);
  AstarModule._free(outPtr);

  paintAll();
}

// ---------- buttons wiring ----------
if (!solveBtn || !stepBtn || !clearPathBtn || !clearWallsBtn || !resetAllBtn) {
  console.error("Missing buttons:", { solveBtn, stepBtn, clearPathBtn, clearWallsBtn, resetAllBtn });
}

solveBtn.onclick = async () => {
  await solveWithWasm();
};

stepBtn.onclick = () => {
  stepSearch();
  paintAll();
};

clearPathBtn.onclick = () => {
  resetSearch();
  paintAll();
  renderStatus("Ready");
};

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

// init
rebuildGrid();
