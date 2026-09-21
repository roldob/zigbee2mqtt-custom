# Custom Zigbee2MQTT converters and extensions

This repository provides custom device converters and an optional group-control extension for Zigbee2MQTT. Device documentation covers features, installation, and compatibility considerations.

Available converters and extensions:

- [TS0505B custom converter and group extension](docs/ts0505b.md): RGBCW bulb controls for `TS0505B` with manufacturers `_TZ3210_bfwvfyx1` and `_TZ3210_ifga63rg`, plus an optional group-state and Home Assistant discovery extension.
- [BSEED TS0003 converter](docs/ts0003-qkixdnon.md): three-gang relay control and independent per-channel inching for `TS0003` with manufacturer `_TZ3000_qkixdnon`.

**Support is limited to the exact fingerprints documented for each device.** A matching model name alone does not establish compatibility.

Installation-specific configuration files are intentionally excluded. Follow the device documentation to configure your own installation and keep private configuration out of public distribution.
