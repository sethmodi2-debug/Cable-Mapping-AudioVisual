# Cable Mapping AudioVisual

Open source desktop app for documenting audio and video cable runs at live events and AV installs: devices, ports, cables, snakes and AV network links (Dante, AES50, Allen & Heath SLink, gigaACE, dSNAKE).

## Status

Early. The app currently shows a built-in sample show: a patch list and a cable pull list generated from the data model in `src/model/`.

## Data model

A show is four lists. Everything the app displays is derived from them.

| Entity | What it is |
| --- | --- |
| Device | Mic, DI, stage box, console, amp, projector |
| Port | A named input or output on a device, with its connector |
| Cable | A physical cable or a network link (Dante, AES50, SLink...), with channel count |
| Connection | A port-to-port patch, optionally on a cable channel |

A network link can point at the physical cable it rides on (`parentCableId`), so an SLink stream over a Cat6 run shows up in the patch list but only the Cat6 goes on the pull list.

Shows save as one JSON file (`formatVersion: 1`).

## Development

Requires Node 22+ and Rust, plus the [Tauri system prerequisites](https://tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev   # run the desktop app
npm test            # run the data model tests
```
