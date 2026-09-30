# Custom Zigbee2MQTT converters and extensions

This repository provides custom device converters and extensions for Zigbee2MQTT. Device documentation covers features, installation, and compatibility considerations.

Available converters and extensions:

- [BEOK TRV-705ZB converter](docs/beok-trv705zb.md): capture-derived support for `TS0601 / _TZE284_ltwbm23f`, including schedules, presets, calibration, hysteresis, vacation, boost, reset-all, and automatic detection of an enhanced variant with Temporary Mode, critical-low-battery behavior, enhanced child lock, Auto/Normal/Turbo thrust mode, and valve-calibration status.
- [BEOK TRV-705ZB Home Assistant cards](docs/beok-trv705zb-card.md): reusable status and full-control Lovelace cards with touch controls, icon-based presets, conditional Vacation/Boost controls, enhanced-variant support, and a 7-day schedule editor.
- [TS0505B Home Assistant cards](docs/ts0505b-card.md): reusable status and full-control Lovelace cards with compact touch controls, brightness, color temperature, XY, color presets, and Startup, Scene, and Rhythm editors.
- [TS0505B custom converter and group extension](docs/ts0505b.md): RGBCW bulb controls for `TS0505B` with manufacturers `_TZ3210_bfwvfyx1` and `_TZ3210_ifga63rg`, plus an optional group-state and Home Assistant discovery extension.
- [BSEED TS0003 converter](docs/ts0003-qkixdnon.md): three-gang relay control and independent per-channel inching for `TS0003` with manufacturer `_TZ3000_qkixdnon`.
- [Zigbee2MQTT MultiControl](docs/multicontrol.md): generic two-way ON/OFF synchronization for pairs of Zigbee switches, with Home Assistant MQTT discovery and support for multiple independent pairs. Validated in real use with BSEED stock-firmware switches.

**Support is limited to the exact fingerprints documented for device-specific converters.** A matching model name alone does not establish compatibility. MultiControl is intentionally generic, but non-BSEED compatibility has not been hardware-validated.

Installation-specific configuration files are intentionally excluded. Follow the documentation to configure your own installation and keep private configuration out of public distribution.
