#include <emscripten/emscripten.h>
#include <stdlib.h>
#include <string.h>

// walls: int array size n*n (0=free, 1=wall)
// out_path: int array size max_len (stores cell index r*n+c)
// return: path length (0 if no path)
EMSCRIPTEN_KEEPALIVE
int solve(int n,
          int sr, int sc,
          int gr, int gc,
          const int* walls,
          int* out_path,
          int max_len)
{
    if (n <= 0) return 0;
    if (sr < 0 || sr >= n || sc < 0 || sc >= n) return 0;
    if (gr < 0 || gr >= n || gc < 0 || gc >= n) return 0;

    int start = sr * n + sc;
    int goal  = gr * n + gc;

    if (walls[start] || walls[goal]) return 0;

    int size = n * n;

    // parent[index] = previous index, -1 means unvisited
    int* parent = (int*)malloc(sizeof(int) * size);
    int* queue  = (int*)malloc(sizeof(int) * size);
    if (!parent || !queue) {
        free(parent); free(queue);
        return 0;
    }

    for (int i = 0; i < size; i++) parent[i] = -1;

    int qh = 0, qt = 0;
    queue[qt++] = start;
    parent[start] = start;

    const int dr[4] = {-1, 1, 0, 0};
    const int dc[4] = {0, 0, -1, 1};

    int found = 0;

    while (qh < qt) {
        int cur = queue[qh++];
        if (cur == goal) { found = 1; break; }

        int r = cur / n;
        int c = cur % n;

        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

            int ni = nr * n + nc;
            if (walls[ni]) continue;
            if (parent[ni] != -1) continue;

            parent[ni] = cur;
            queue[qt++] = ni;
        }
    }

    int path_len = 0;

    if (found) {
        // reconstruct reverse
        int cur = goal;
        while (1) {
            path_len++;
            if (cur == start) break;
            cur = parent[cur];
            if (cur < 0) { path_len = 0; break; } // safety
        }

        if (path_len > 0 && path_len <= max_len) {
            // fill forward
            cur = goal;
            for (int i = path_len - 1; i >= 0; i--) {
                out_path[i] = cur;
                if (cur == start) break;
                cur = parent[cur];
            }
        } else {
            path_len = 0; // too long for buffer
        }
    }

    free(parent);
    free(queue);
    return path_len;
}
