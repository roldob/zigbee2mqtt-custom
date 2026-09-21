# TS0505B custom converter and group extension

Custom Zigbee2MQTT controls for Tuya TS0505B RGBCW bulbs, with an optional group-state and Home Assistant discovery extension.

## Supported devices

Zigbee model: `TS0505B`.

Supported manufacturer identifiers:

- `_TZ3210_bfwvfyx1`
- `_TZ3210_ifga63rg`

The converter identifies itself as `TS0505B_custom`. Support for other manufacturer identifiers is not claimed. No minimum Zigbee2MQTT version has been established for this package.

## Converter features

- On/off, brightness, XY color, and color temperature (153–500 mireds).
- Initial, previous, or customized power-on behavior, with a virtual Startup light editor and temporary preview.
- Do Not Disturb control.
- Eight scenes with static, flash, or breath effects, speed, and up to eight editable color/white points. Includes a virtual Scene point light editor and save, discard, and reset actions.
- Rhythm scheduling with weekday selection, two modes, and up to eight slots for time, brightness, and color temperature. At least two slots must remain enabled. Includes slot names, previews, and save, discard, and reset actions.
- Startup and Rhythm previews restore the previous light state after two seconds. Scene editing sends scene previews to the bulb.
- State recovery from persisted editor state and device reports.
- Standard group light commands use group addressing; proprietary controls are sent individually to group members.

## Extension purpose

The extension synchronizes custom group properties for Startup, Do Not Disturb, Rhythm, Scene, and the Scene point virtual light. It publishes Home Assistant MQTT discovery for the associated controls and virtual lights.

The converter sends the Zigbee commands. The extension does not replace Zigbee2MQTT's normal group light entity. Individual-device converter features do not require the extension; the custom group discovery/state functionality uses both files and their shared property names.

Group state is optimistic and incorporates updates from individual members; it does not verify that every member agrees. The extension resolves configured groups by name and does not check their members' manufacturer identifiers.

## Installation

Use your Zigbee2MQTT data directory as the root for these paths. In a Home Assistant installation where that directory is `/config/zigbee2mqtt`, the destination paths are:

| Package file | Destination |
| --- | --- |
| `converters/ts0505b-custom.js` | `/config/zigbee2mqtt/external_converters/ts0505b-custom.js` |
| `extensions/ts0505b-group-state-extension.mjs` | `/config/zigbee2mqtt/external_extensions/ts0505b-group-state-extension.mjs` |
| `extensions/ts0505b-group-state-extension.config.example.json` | `/config/zigbee2mqtt/external_extensions/ts0505b-group-state-extension.config.json` |

1. Copy the converter into `external_converters/` in the Zigbee2MQTT data directory.
2. For the custom group controls, copy the extension into `external_extensions/`.
3. Copy the example configuration and rename it to **`ts0505b-group-state-extension.config.json`**, beside the extension. The `.example.json` filename is not loaded by the extension.
4. Edit the configuration to identify your existing Zigbee2MQTT group or groups. Use supported bulbs for these controls.
5. Enable Zigbee2MQTT's Home Assistant integration if you want the extension's Home Assistant discovery entities.
6. Restart Zigbee2MQTT after installation. Check its logs for converter/extension loading and configuration errors. Restart again after changing the group configuration.

The extension reads its JSON file relative to its own module location, not the process working directory. If your Zigbee2MQTT data directory differs, use the same relative destination directories there.

## Required group configuration

```json
{
  "targetGroups": [
    {
      "name": "Example light group",
      "objectId": "example_light_group"
    }
  ]
}
```

Add another object to `targetGroups` for each additional group.

- `name` must exactly match the Zigbee2MQTT group friendly name, including case, spaces, and accents. It is also used in MQTT topic paths.
- `objectId` should remain stable because it affects Home Assistant device identifiers, discovery topics, unique IDs, and default entity IDs. It is not automatically derived from the group name.
- `targetGroups` must be an array. Every entry must have nonempty string `name` and `objectId` values. Names must be unique, and objectIds must be unique.
- An empty array targets no groups. Missing, unreadable, malformed, or invalid configuration prevents the extension from initializing with a clear error.

MQTT base and Home Assistant discovery/status topics come from Zigbee2MQTT settings. The extension retains its existing discovery timing: seven seconds after extension startup and 500 ms after an observed Home Assistant online status message.

The installation-specific configuration is not included in this package. Keep your real configuration out of public distribution.

## Package contents

```text
converters/ts0505b-custom.js
extensions/ts0505b-group-state-extension.mjs
extensions/ts0505b-group-state-extension.config.example.json
README.md
```
