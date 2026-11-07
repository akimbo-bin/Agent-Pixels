# Official illustrated world

The official entry point is **https://akimb0-pc-1.sphinx-scylla.ts.net:8443/**.
It is private to the Tailscale network, hosted on AKIMB0-PC (not CT125).
The existing Tailscale HTTPS service on port 443 is unchanged.

## Everyday updates

From this worktree run `npm run world:deploy`. It rebuilds from readable source,
packages a versioned release, and atomically changes `C:/NebulaWorld/current.json`.
The existing Node host reads this pointer for each request, so artwork/UI changes
need no restart. A failed build leaves the active release alone. Previous releases
are retained. `npm run world:rollback` restores the prior version.

The current map defaults are `dev/engine/approved-map.json`. Browser saves and
exports are never overwritten by deploying a release. **Browser storage is tied
to the address:** export your latest edits from the old localhost page and use
Edit → Load map on the official address if you have newer unsynchronized edits.
Phone and desktop saves are separate; exports transfer them. Deployment does not
add shared server-side editing or synchronization.

## Host setup and lifecycle

`scripts/install-illustrated-world.ps1` creates the release root, installs the
**Nebula Illustrated World** scheduled task at the current user's logon, starts
it, and adds Tailscale Serve on HTTPS 8443. The task restarts the host if it fails.
It runs under the existing user so the restricted read-only SSH status key works.
It does not alter training, ComfyUI, Paperclip agents, or other Tailscale services.
AKIMB0-PC must be powered on and the user session logged in; this is not an
always-on server migration. After changing the Node host or live adapter code,
restart this specific task. UI-only updates do not require that restart.

Local server: http://127.0.0.1:8791/. Diagnostics: `/health` and `/release.json`.
The server exposes only GET/HEAD for the release and `/live`. Development write
APIs, files outside the release, and asset-generation tools are not exposed.
HTML is gzip-compressed in the release for faster phone loading.

## Portable server deployment

`npm run world:release -- --root <directory>` creates a portable directory with
`server.mjs`, `live/`, `live.config.json`, `current.json`, and `releases/`.
Copy the whole directory to the chosen server and run Node 22+:

```
node /srv/nebula-world/server.mjs --root /srv/nebula-world --port 8791
```

Install that command under the server's service manager, and expose it with
`tailscale serve --bg --https=8443 http://127.0.0.1:8791` on that server. No front-end
build tools or Python are needed on the receiving server. For later updates copy
the new release directory first, then replace `current.json` atomically.

`live.config.json` is host-specific and preserved by subsequent local deployments.
The included adapters read the actual training queue, GPU telemetry and the
restricted read-only Paperclip snapshot. On a different server, configure local
sources or use `--live-upstream https://<authorized-source>/live` to proxy a
reachable trusted host. AKIMB0-only file paths/GPU probes do not work on Linux.
No SSH private keys are packaged. Unavailable sources remain unavailable/stale.

## Phone controls

Hold/drag the pixel direction pad to walk, including diagonals. **A / USE** handles
chairs and elevator calls. **ME** follows your character at a useful zoom. Drag
the map to pan, pinch to zoom, or use ± and Fit. Controls release on touch cancel,
focus loss, or leaving the page. Editor tools open as a scrollable bottom sheet;
Move camera switches between touch camera gestures and drawing; Done editing returns to walking. The saved geometry, masks, seats and screens
use the same map on every device.

## Checks

`node scripts/check-mobile-world.cjs` checks portrait/landscape, actual touch
movement and release, camera controls, menus, editing, and saved-map preservation.
Set `WORLD_URL=http://127.0.0.1:8791/` to check the deployed host.
`node scripts/check-world-server.cjs` checks release identity, gzip, old URL
redirect, read-only routes and live telemetry on the running official host.
