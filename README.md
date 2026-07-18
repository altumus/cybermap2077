# Cybermap 2077

Interactive map styled after Cyberpunk 2077: address search, IP locate, Overpass POIs, and OSRM routing.

**Live demo:** [cybermap2077.netlify.app](https://cybermap2077.netlify.app)

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- MapLibre GL
- Flux-style unidirectional state for routing

## Features

- Dark cyberpunk basemap (`public/styles/cyberpunk.json`)
- Address search via Nominatim
- Approximate location via IP (`ipwho.is`)
- POIs from Overpass (icons + labels, zoom-gated)
- Car / foot routes via FOSSGIS OSRM

## Architecture

```
Views → routeActions → routeStore → Views
                    ↓
              routeEffects → lib/routing (OSRM)
Map (local) → lib/pois (Overpass)
```

| Layer | Role |
| --- | --- |
| `components/` | Views; dispatch actions, subscribe to store |
| `flux/` | Store, actions, effects, React hook |
| `types/` | Shared TypeScript contracts |
| `utils/` | Pure helpers (format, bbox, html) |
| `lib/` | External API clients |

## Project layout

```text
src/
  components/     # Map, RoutePanel, AddressSearch, LocateButton
  flux/           # routeStore, actions, routeEffects, useRouteStore
  types/          # geo, route, poi
  utils/          # format, bbox, html
  lib/            # routing, pois, poiIcons, geocode, locate
  App.tsx
public/
  styles/cyberpunk.json
```

## Scripts

```bash
npm install
npm run dev      # local server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # oxlint
```

## Notes

- Overpass uses the FR mirror (`overpass.openstreetmap.fr`); the main `overpass-api.de` endpoint may reject browser requests.
- Public OSRM demo ignores profile switching; car/foot go through FOSSGIS `routed-car` / `routed-foot`.
- POIs load from zoom ≥ 14; earlier zoom fades them out.
