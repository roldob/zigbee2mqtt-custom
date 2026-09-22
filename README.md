# Custom Zigbee2MQTT converters and extensions

This repository provides custom device converters and extensions for Zigbee2MQTT. Device documentation covers features, installation, and compatibility considerations.

Available converters and extensions:

- [TS0505B custom converter and group extension](docs/ts0505b.md): RGBCW bulb controls for `TS0505B` with manufacturers `_TZ3210_bfwvfyx1` and `_TZ3210_ifga63rg`, plus an optional group-state and Home Assistant discovery extension.
- [BSEED TS0003 converter](docs/ts0003-qkixdnon.md): three-gang relay control and independent per-channel inching for `TS0003` with manufacturer `_TZ3000_qkixdnon`.
- [Zigbee2MQTT MultiControl](docs/multicontrol.md): generic two-way ON/OFF synchronization for pairs of Zigbee switches, with Home Assistant MQTT discovery and support for multiple independent pairs. Validated in real use with BSEED stock-firmware switches.

**Support is limited to the exact fingerprints documented for device-specific converters.** A matching model name alone does not establish compatibility. MultiControl is intentionally generic, but non-BSEED compatibility has not been hardware-validated.

Installation-specific configuration files are intentionally excluded. Follow the documentation to configure your own installation and keep private configuration out of public distribution.
