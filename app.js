const N = 20;
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");
const clearWallsBtn = document.getElementById("clearWalls");
const resetAllBtn = document.getElementById("resetAll");

let start = { r: 2, c: 2 };
let goal  = { r: 17, c: 17 };
const walls = new Set(); // key: "r,c"

function key(r, c) { return `${r},${c}`; }

function renderStatus() {
  statusEl.textContent = `Start=(${start.r},${start.c})  Goal=(${goal.r},${goal.c})  Walls=${walls.size}`;
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
  renderStatus();
}

function paintAll() {
  const cells = gridEl.querySelectorAll(".cell");
  cells.forEach(cell => {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    cell.classList.toggle("start", r === start.r && c === start.c);
    cell.classList.toggle("goal",  r === goal.r  && c === goal.c);
    cell.classList.toggle("wall",  walls.has(key(r,c)));
  });
}

function setStart(r, c) {
  if (r === goal.r && c === goal.c) return;
  walls.delete(key(r,c));
  start = { r, c };
  paintAll();
  renderStatus();
}
function setGoal(r, c) {
  if (r === start.r && c === start.c) return;
  walls.delete(key(r,c));
  goal = { r, c };
  paintAll();
  renderStatus();
}
function toggleWall(r, c) {
  if ((r === start.r && c === start.c) || (r === goal.r && c === goal.c)) return;
  const k = key(r,c);
  if (walls.has(k)) walls.delete(k);
  else walls.add(k);
  paintAll();
  renderStatus();
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
  paintAll();
  renderStatus();
};

resetAllBtn.onclick = () => {
  walls.clear();
  start = { r: 2, c: 2 };
  goal  = { r: 17, c: 17 };
  paintAll();
  renderStatus();
};

rebuildGrid();
