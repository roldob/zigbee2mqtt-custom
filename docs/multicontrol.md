# Zigbee2MQTT MultiControl

Synchronize two physical Zigbee switches in both directions and expose a virtual switch through Home Assistant MQTT discovery. Multiple independent pairs can run in one extension. Changing either device to ON or OFF commands its peer when needed; commanding a virtual switch commands that pair's devices individually through Zigbee2MQTT's existing MQTT incoming-message path. No Zigbee group commands are used.

The extension has been validated in real use with BSEED stock-firmware Zigbee switches. This real-use statement describes the original implementation and is supplied by its operator; this generic staging version has been checked with automated tests, not deployed for additional hardware validation. The implementation is not intentionally limited to BSEED devices. Other devices may also work if they report top-level `state` as `ON`/`OFF` and accept `{"state":"ON"}` / `{"state":"OFF"}` via their Zigbee2MQTT `/set` topic. Compatibility with non-BSEED devices has not been validated. There are no device model or manufacturer restrictions. Endpoint-specific state fields, brightness, and other properties are not synchronized.

## Installation

This directory is a publication staging package. Creating it does not install or enable the extension.

For a Home Assistant add-on whose Zigbee2MQTT data directory is `/config/zigbee2mqtt`, install these two files together:

- `/config/zigbee2mqtt/external_extensions/zigbee2mqtt-multicontrol.mjs`
- `/config/zigbee2mqtt/external_extensions/zigbee2mqtt-multicontrol.config.json`

For other installations, use `<Zigbee2MQTT data directory>/external_extensions/`. Copy the extension there and copy `extensions/zigbee2mqtt-multicontrol.config.example.json` beside it under the real configuration filename above. Edit that copy with your device IEEE addresses and exact Zigbee2MQTT friendly names. Configuration is resolved relative to `import.meta.url`, independent of the process working directory.

Do not run another synchronization extension for the same devices concurrently. Plan any migration from an existing extension before enabling this one. Restart Zigbee2MQTT after installation or configuration changes; configuration is read during initialization. Invalid or missing configuration fails initialization with a clear error.

## Configuration

```json
{
  "pairs": [
    {
      "devices": [
        {"ieee": "0x00124b0000000001", "name": "Switch A"},
        {"ieee": "0x00124b0000000002", "name": "Switch B"}
      ],
      "virtual": {
        "id": "example_multicontrol",
        "name": "Example multicontrol",
        "deviceId": "example_multicontrol_device",
        "deviceName": "Example MultiControl"
      }
    }
  ]
}
```

`pairs` must be a non-empty array. Each pair must have exactly two devices with non-empty `ieee` and `name` strings. IEEE addresses are normalized to lowercase and must be distinct throughout the configuration, including within a pair. Each of the four virtual fields must be a non-empty string. Both `virtual.id` and `virtual.deviceId` must be unique across pairs. Names are used exactly as provided. Use stable, MQTT-safe identifiers, such as the example's letters, digits, and underscores, and avoid IDs already used by other discovery entities.

To add another independent pair, append another object to `pairs` with two different devices, its own virtual ID and device ID, and its display names. Reports and virtual commands affect only the selected pair. The example addresses and names are placeholders.

**Do not commit the real `zigbee2mqtt-multicontrol.config.json` publicly.** It contains installation-specific addresses and names. Keep it excluded in your publishing workflow and share only the example configuration. This package adds no license or author attribution; confirm redistribution rights for the original implementation before public distribution.

## Synchronization and suppression

Only physical reports whose top-level state is exactly `ON` or `OFF` are processed. Virtual commands accept plain `ON` or `OFF` text, with surrounding whitespace and letter case normalized.

The last reported physical state is cached before suppression and duplicate checks. Before injecting a device command, the extension records an expected report for **5000 ms**. During that window, a matching report clears the expectation without propagating back to the peer. An intermediate contrary report updates the cache and virtual aggregate but is also suppressed from propagation. This conservative behavior can suppress a real manual change while a command is pending. Expired expectations are removed when another report is processed; there is no retry or timeout-triggered command.

Repeated unchanged reports do not propagate. An additional **300 ms** same-state debounce follows the unchanged-state check. These fixed timings are not user configuration. Physical-device state is never updated optimistically, and commands are skipped when the cached real state already matches. No initial physical state query is added.

The virtual state is published only after both devices have reported known states: `ON` if both are ON, otherwise `OFF`. State publications and discovery are retained. The extension does not publish a new virtual state merely because a virtual command was received; subsequent physical reports drive updates. Cached state is in memory and resets on restart; an earlier retained MQTT state may remain visible until fresh reports arrive.

## MQTT and Home Assistant

The extension uses Zigbee2MQTT's configured MQTT base topic and Home Assistant discovery prefix (`homeassistant.discovery_topic`, default `homeassistant`):

| Purpose | Topic |
| --- | --- |
| Virtual command | `${baseTopic}/virtual/${virtual.id}/set` |
| Virtual state | `${baseTopic}/virtual/${virtual.id}/state` |
| Discovery | `${discoveryPrefix}/switch/${virtual.id}/config` |
| Physical command | `${baseTopic}/${device.name}/set` |

Home Assistant must have MQTT discovery enabled on the same broker and discovery prefix. Each pair publishes a non-optimistic switch whose unique ID is `virtual.id`, display name is `virtual.name`, device identifier is `virtual.deviceId`, and device display name is `virtual.deviceName`. Generic metadata uses manufacturer `Custom Zigbee2MQTT extension`, model `Virtual MultiControl`, and icon `mdi:light-switch`. Renaming IDs can leave old retained discovery entries requiring manual cleanup; automatic discovery cleanup is not added.

All virtual state publishions use the selected pair's derived state topic. Zigbee2MQTT's publish API prepends its base topic, so the implementation passes the derived topic's relative part with an explicit base topic to avoid duplicating the prefix. See the [upstream MQTT implementation](https://github.com/Koenkk/zigbee2mqtt/blob/master/lib/mqtt.ts).

## Changes and validation

The synchronization decision order, expectation boundary, debounce boundary, command injection, and aggregate semantics are preserved from the original single-pair implementation. Intentional differences are external configuration with initialization validation, lowercase configured IEEE addresses, multiple independent pairs, generic names and discovery metadata, and replacing the fixed state publication suffix with each pair's derived topic. Duplicate device entries within one pair are also rejected because a pair requires two distinct devices.

Staging validation covers JavaScript syntax, example JSON, valid single and multiple pairs, duplicate IEEE addresses and virtual identifiers, malformed pairs, malformed JSON, and mocked synchronization regression comparisons with the original. No live device commands or Home Assistant restart are needed for these checks. Automated checks do not constitute hardware validation of this generic package.
