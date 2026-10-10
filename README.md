# Cable Mapping AudioVisual

Open source desktop app for documenting audio and video cable runs at live events and AV installs: devices, ports, cables, snakes and AV network links (Dante, AES50, Allen & Heath SLink, gigaACE, dSNAKE).

## Status

Early. The main view is a map: add devices from generic types or a product list (Allen & Heath, DiGiCo, Avid, Yamaha, Behringer, Midas, plus mics and DIs), drag them around, and draw cables between ports, picking each cable's type as you go. Grab a used input to move or unplug its cable. Click any device or cable to label and edit it. Cables are coloured by type and can animate signal flow. Export PDF produces the map plus patch list, cable schedule and pull list. A Lists tab turns the map into show paperwork: a card per device with every port and what it plugs into, the patch list by destination device, the cable schedule, and the pull list. Shows save and open as `.cablemap.json` files. The patch list and cable pull list are generated from the data model in `src/model/`.

Cables route around devices rather than through them, and cables sharing a channel are spread apart. Each device can be flipped so its inputs are on the right and outputs on the left.

### Looking devices up online

Gear that isn't in the product list can be looked up from the Add device search: Claude searches the web for the product's spec sheet and adds it, with its inputs, outputs and network ports, to a "Found online" section of the list. This needs an Anthropic API key, which the app asks for the first time and keeps on that computer only (browser storage). Each lookup is a paid API call on that key.

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
