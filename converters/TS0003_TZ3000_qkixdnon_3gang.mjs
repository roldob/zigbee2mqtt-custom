import * as exposes from "zigbee-herdsman-converters/lib/exposes";
import * as reporting from "zigbee-herdsman-converters/lib/reporting";
import * as tuya from "zigbee-herdsman-converters/lib/tuya";

const e = exposes.presets;
const ea = exposes.access;

/*
 * BSEED TS0003 / _TZ3000_qkixdnon
 *
 * 3-gang switch with custom 3-channel inching implementation.
 *
 * Capture-derived inching format:
 *
 * Each channel uses a 3-byte raw record:
 *
 *   byte 0:
 *      bits 7..1 = channel index
 *      bit 0     = enabled
 *
 *   byte 1..2:
 *      timeout in seconds, big-endian
 *
 * Example:
 *
 *   CH1 ENABLE 2s: 01 00 02 -> "AQAC"
 *   CH2 ENABLE 2s: 03 00 02 -> "AwAC"
 *   CH3 ENABLE 2s: 05 00 02 -> "BQAC"
 *
 * The device expects each 3-byte record to be Base64 encoded
 * separately, then concatenated and sent as ASCII:
 *
 *   "AQACAwACBQAC"
 *
 * It does NOT accept the raw 9-byte buffer for all three channels.
 */

/*
 * Zigbee2MQTT may send a partial composite object when one field
 * is changed. Keep a per-device cache so a change to one channel
 * does not destroy the other channel settings.
 *
 * Safe startup defaults:
 *   all inching disabled
 *   timeout = 2 seconds
 */
const inchingCache = new Map();

function defaultInchingConfig() {
    return {
        inching_control_1: "DISABLE",
        inching_time_1: 2,

        inching_control_2: "DISABLE",
        inching_time_2: 2,

        inching_control_3: "DISABLE",
        inching_time_3: 2,
    };
}

function getDeviceKey(meta) {
    return meta.device?.ieeeAddr ?? "default";
}

function mergeDefined(target, source) {
    if (
        source === null ||
        typeof source !== "object" ||
        Array.isArray(source)
    ) {
        return target;
    }

    for (const key of Object.keys(source)) {
        const value = source[key];

        /*
         * Ignore undefined/null/empty values.
         * The Z2M frontend may include empty fields in a partial
         * composite update.
         */
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            continue;
        }

        target[key] = value;
    }

    return target;
}

function normalizeControl(value, fallback) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    if (value === "ENABLE" || value === true || value === 1 || value === "ON") {
        return "ENABLE";
    }

    if (value === "DISABLE" || value === false || value === 0 || value === "OFF") {
        return "DISABLE";
    }

    throw new Error(
        `Invalid inching control value: ${value}`,
    );
}

function normalizeTime(value, fallback, key) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    const seconds = Number(value);

    if (
        !Number.isInteger(seconds) ||
        seconds < 1 ||
        seconds > 65535
    ) {
        throw new Error(
            `${key} must be an integer between 1 and 65535 seconds`,
        );
    }

    return seconds;
}

function encodeInchingRecord(channel, enabled, seconds) {
    const controlByte =
        ((channel - 1) << 1) |
        (enabled ? 1 : 0);

    const raw = Buffer.from([
        controlByte,
        (seconds >> 8) & 0xff,
        seconds & 0xff,
    ]);

    /*
     * Important:
     * Base64 each 3-byte channel record separately.
     */
    return raw.toString("base64");
}

function inchingExpose() {
    const x = e
        .composite(
            "inching_control_set",
            "inching_control_set",
            ea.SET,
        )
        .withDescription(
            "Device inching settings. Each relay can be enabled/disabled independently and can use its own auto-off time.",
        );

    const names = [
        "left",
        "center",
        "right",
    ];

    for (let i = 1; i <= 3; i++) {
        const name = names[i - 1];

        x.withFeature(
            e
                .binary(
                    "inching_control",
                    ea.SET,
                    "ENABLE",
                    "DISABLE",
                )
                .withProperty(
                    `inching_control_${i}`,
                )
                .withLabel(
                    `Inching ${name}`,
                )
                .withDescription(
                    `Enable or disable inching for the ${name} relay.`,
                ),
        );

        x.withFeature(
            e
                .numeric(
                    "inching_time",
                    ea.SET,
                )
                .withProperty(
                    `inching_time_${i}`,
                )
                .withLabel(
                    `Inching time ${name}`,
                )
                .withDescription(
                    `Auto-off delay for the ${name} relay.`,
                )
                .withUnit("s")
                .withValueMin(1)
                .withValueMax(65535)
                .withValueStep(1),
        );
    }

    return x;
}

const tzBseedInching = {
    key: [
        "inching_control_set",
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        if (
            value === null ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            throw new Error(
                "inching_control_set must be an object",
            );
        }

        const deviceKey =
            getDeviceKey(meta);

        /*
         * Start with defaults.
         */
        const config =
            defaultInchingConfig();

        /*
         * Merge our last known per-device values.
         */
        const cached =
            inchingCache.get(deviceKey);

        mergeDefined(
            config,
            cached,
        );

        /*
         * Merge Z2M state if it contains previous values.
         */
        mergeDefined(
            config,
            meta.state?.inching_control_set,
        );

        /*
         * Finally merge the current partial update.
         */
        mergeDefined(
            config,
            value,
        );

        /*
         * Normalize all 3 channels.
         */
        for (
            let channel = 1;
            channel <= 3;
            channel++
          ) {
            const controlKey =
                `inching_control_${channel}`;

            const timeKey =
                `inching_time_${channel}`;

            config[controlKey] =
                normalizeControl(
                    config[controlKey],
                    "DISABLE",
                );

            config[timeKey] =
                normalizeTime(
                    config[timeKey],
                    2,
                    timeKey,
                );
        }

        /*
         * Build:
         *
         * Base64(CH1 raw)
         * + Base64(CH2 raw)
         * + Base64(CH3 raw)
         */
        const encodedRecords = [];

        for (
            let channel = 1;
            channel <= 3;
            channel++
        ) {
            const controlKey =
                `inching_control_${channel}`;

            const timeKey =
                `inching_time_${channel}`;

            encodedRecords.push(
                encodeInchingRecord(
                    channel,
                    config[controlKey] === "ENABLE",
                    config[timeKey],
                ),
             );
        }

        const encoded =
            encodedRecords.join("");

        /*
         * The concatenated Base64 text itself is the command payload.
         */
        const payload =
            Buffer.from(
                encoded,
                "ascii",
            );

        /*
         * Inching is controlled through endpoint 1,
         * Tuya private cluster 0xE000.
         */
        const endpoint =
            meta.device.getEndpoint(1);

        await endpoint.command(
            "manuSpecificTuya4",
            "setInchingSwitch",
            {
                payload,
            },
        );

        /*
         * Save only after a successful Zigbee command.
         */
        inchingCache.set(
            deviceKey,
            {
                ...config,
            },
        );

        return {
            state: {
                inching_control_set: {
                    ...config,
                },
            },
        };
    },
};

export default {
    fingerprint: [
        {
            modelID: "TS0003",
            manufacturerName:
                "_TZ3000_qkixdnon",
        },
    ],

    model:
        "TS0003_qkixdnon",

    vendor:
        "BSEED",

    description:
        "3 gang switch with backlight, countdown and independent 3-channel inching",

    extend: [
        tuya.modernExtend.tuyaBase(),

        tuya.modernExtend.tuyaOnOff({
            endpoints: [
                "left",
                "center",
                "right",
            ],

            switchType:
                true,

            powerOnBehavior2:
                true,

            backlightModeOffOn:
                true,

            indicatorMode:
                true,

            onOffCountdown:
                true,

            /*
             * Do NOT enable:
             *
             * inchingSwitch: true
             *
             * This device needs the custom capture-derived
             * encoding above.
             */
        }),

        /*
         * Registers Tuya private cluster 0xE000
         * as manuSpecificTuya4 and adds
         * setInchingSwitch.
         */
        tuya.clusters.addTuyaCommonPrivateCluster(),
    ],

    endpoint: () => ({
        left: 1,
        center: 2,
        right: 3,
    }),

    exposes: [
        inchingExpose(),
    ],

    toZigbee: [
        tzBseedInching,
    ],

    meta: {
        multiEndpoint: true,
    },

    configure: async (
        device,
        coordinatorEndpoint,
    ) => {
        await tuya.configureMagicPacket(
            device,
            coordinatorEndpoint,
        );

        for (
            const endpointID
            of [1, 2, 3]
        ) {
            await reporting.bind(
                device.getEndpoint(
                    endpointID,
                ),
                coordinatorEndpoint,
                [
                    "genOnOff",
                ],
            );
        }
    },
};
