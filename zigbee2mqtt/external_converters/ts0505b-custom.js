const exposes = require('zigbee-herdsman-converters/lib/exposes');
const m = require('zigbee-herdsman-converters/lib/modernExtend');
const {Zcl} = require('zigbee-herdsman');

const e = exposes.presets;
const ea = exposes.access;

/*
 * ============================================================================
 * Constants
 * ============================================================================
 */

const COLOR_TEMP_MIN = 153;
const COLOR_TEMP_MAX = 500;

const PREVIEW_RESTORE_MS = 2000;

const STARTUP_MODE = {
    initial: 0x0000,
    previous: 0x0100,
    customized: 0x0200,
};

const STARTUP_MODE_REVERSE = {
    0x0000: 'initial',
    0x0100: 'previous',
    0x0200: 'customized',
};

const ZIGBEE_COLOR_MODE = {
    hs: 0,
    xy: 1,
    colorTemp: 2,
};

const TUYA_COLOR_MODE = {
    white: 0,
    color: 1,
};

const RHYTHM_MODE = {
    linear_1: 0x00,
    linear_2: 0x0f,
};

const RHYTHM_MODE_REVERSE = {
    0x00: 'linear_1',
    0x0f: 'linear_2',
};

const RHYTHM_DAY = {
    sunday: 0x01,
    monday: 0x02,
    tuesday: 0x04,
    wednesday: 0x08,
    thursday: 0x10,
    friday: 0x20,
    saturday: 0x40,
};

const RHYTHM_ALL_DAYS = 0x7f;

const RHYTHM_MIN_ENABLED = 2;
const RHYTHM_MAX_SLOTS = 8;


const SCENE_SUPPORTED_MANUFACTURERS = new Set([
    '_TZ3210_bfwvfyx1',
    '_TZ3210_ifga63rg',
]);

const SCENE_NAMES = [
    'Night',
    'Read',
    'Working',
    'Leisure',
    'Soft',
    'Colorful',
    'Dazzling',
    'Gorgeous',
];

const SCENE_EFFECT = {
    static: 0,
    flash: 1,
    breath: 2,
};

const SCENE_EFFECT_REVERSE = {
    0: 'static',
    1: 'flash',
    2: 'breath',
};

const SCENE_MAX_POINTS = 8;
const SCENE_MIN_POINTS = 1;

function createScenePoint({
    enabled = false,
    mode = 'color',
    hue = 0,
    saturation = 100,
    brightness = 100,
    colorTemp = 50,
} = {}) {
    return {
        enabled,
        mode,
        hue,
        saturation,
        brightness,
        colorTemp,
    };
}

function createScenePreset(
    name,
    effect,
    speed,
    points,
) {
    const result = {
        name,
        effect,
        speed,
        points: [],
    };

    for (
        let index = 0;
        index < SCENE_MAX_POINTS;
        index++
    ) {
        result.points.push(
            createScenePoint(
                points[index] ?? {},
            ),
        );
    }

    return result;
}

/*
 * Tuya standard eight-scene baseline.
 *
 * These values are used only by the local Reset Scene action. The actual
 * saved scene is always learned from the bulb through F003 and takes
 * precedence over this baseline.
 */
const DEFAULT_SCENES = [
    createScenePreset(
        'Night',
        'static',
        20,
        [
            {
                enabled: true,
                mode: 'white',
                brightness: 20,
                colorTemp: 0,
            },
        ],
    ),
    createScenePreset(
        'Read',
        'static',
        20,
        [
            {
                enabled: true,
                mode: 'white',
                brightness: 100,
                colorTemp: 100,
            },
        ],
    ),
    createScenePreset(
        'Working',
        'static',
        20,
        [
            {
                enabled: true,
                mode: 'white',
                brightness: 100,
                colorTemp: 50,
            },
        ],
    ),
    createScenePreset(
        'Leisure',
        'static',
        20,
        [
            {
                enabled: true,
                mode: 'white',
                brightness: 50,
                colorTemp: 50,
            },
        ],
    ),
    createScenePreset(
        'Soft',
        'breath',
        76,
        [
            {
                enabled: true,
                mode: 'color',
                hue: 210,
                saturation: 66,
                brightness: 57,
            },
        ],
    ),
    createScenePreset(
        'Colorful',
        'flash',
        80,
        [
            {enabled: true, mode: 'color', hue: 0, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 120, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 240, saturation: 100, brightness: 100},
        ],
    ),
    createScenePreset(
        'Dazzling',
        'flash',
        76,
        [
            {
                enabled: true,
                mode: 'color',
                hue: 210,
                saturation: 66,
                brightness: 57,
            },
        ],
    ),
    createScenePreset(
        'Gorgeous',
        'breath',
        80,
        [
            {enabled: true, mode: 'color', hue: 0, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 120, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 240, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 300, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 240, saturation: 100, brightness: 100},
            {enabled: true, mode: 'color', hue: 0, saturation: 100, brightness: 100},
        ],
    ),
];

const DEFAULT_RHYTHM_SLOTS = [
    {
        name: 'Wake',
        enabled: true,
        hour: 6,
        minute: 30,
        reserved: [0, 0, 0, 0],
        brightness: 20,
        colorTemp: 25,
    },
    {
        name: 'Sunlight',
        enabled: true,
        hour: 10,
        minute: 30,
        reserved: [0, 0, 0, 0],
        brightness: 100,
        colorTemp: 100,
    },
    {
        name: 'Comfortable',
        enabled: true,
        hour: 20,
        minute: 0,
        reserved: [0, 0, 0, 0],
        brightness: 80,
        colorTemp: 50,
    },
    {
        name: 'Night light',
        enabled: true,
        hour: 23,
        minute: 0,
        reserved: [0, 0, 0, 0],
        brightness: 5,
        colorTemp: 0,
    },
    {
        name: 'Rhythm 5',
        enabled: false,
        hour: 12,
        minute: 0,
        reserved: [0, 0, 0, 0],
        brightness: 100,
        colorTemp: 50,
    },
    {
        name: 'Rhythm 6',
        enabled: false,
        hour: 13,
        minute: 0,
        reserved: [0, 0, 0, 0],
        brightness: 100,
        colorTemp: 50,
    },
    {
        name: 'Rhythm 7',
        enabled: false,
        hour: 14,
        minute: 0,
        reserved: [0, 0, 0, 0],
        brightness: 100,
        colorTemp: 50,
    },
    {
        name: 'Rhythm 8',
        enabled: false,
        hour: 15,
        minute: 0,
        reserved: [0, 0, 0, 0],
        brightness: 100,
        colorTemp: 50,
    },
];

/*
 * ============================================================================
 * Light state
 * ============================================================================
 */

function createLightState() {
    return {
        state: undefined,
        brightness: undefined,
        mode: undefined,
        colorTemp: undefined,
        color: undefined,
    };
}

function cloneColor(color) {
    if (!color) {
        return undefined;
    }

    const x = Number(color.x);
    const y = Number(color.y);

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        return undefined;
    }

    return {x, y};
}

function cloneLightState(value) {
    if (!value) {
        return createLightState();
    }

    return {
        state: value.state,
        brightness: value.brightness,
        mode: value.mode,
        colorTemp: value.colorTemp,
        color: cloneColor(value.color),
    };
}

/*
 * ============================================================================
 * Runtime
 * ============================================================================
 */

const lampRuntimeMap = new Map();

function createLampRuntime(ieeeAddr) {
    return {
        ieeeAddr,

        cache: createLightState(),

        startupValue: {
            state: 'ON',
            brightness: 254,
            mode: 'white',
            colorTemp: COLOR_TEMP_MIN,
            color: undefined,
        },

        startupBehavior: 'initial',

        preview: undefined,

        xyAccumulator: {
            x: undefined,
            y: undefined,
        },

        rhythm: undefined,

        scene: undefined,
    };
}

function getLampRuntimeByIeee(ieeeAddr) {
    if (
        typeof ieeeAddr !== 'string' ||
        ieeeAddr.length === 0
    ) {
        throw new Error(
            'TS0505B: IEEE address is missing',
        );
    }

    let runtime =
        lampRuntimeMap.get(ieeeAddr);

    if (!runtime) {
        runtime =
            createLampRuntime(ieeeAddr);

        lampRuntimeMap.set(
            ieeeAddr,
            runtime,
        );
    }

    return runtime;
}

function getRuntimeFromMsg(msg) {
    const ieee =
        msg?.device?.ieeeAddr ??
        msg?.endpoint?.device?.ieeeAddr;

    return getLampRuntimeByIeee(ieee);
}

function getRuntimeFromMeta(meta, entity) {
    const ieee =
        meta?.device?.ieeeAddr ??
        meta?.endpoint?.device?.ieeeAddr ??
        entity?.device?.ieeeAddr ??
        entity?.endpoint?.device?.ieeeAddr;

    return getLampRuntimeByIeee(ieee);
}

/*
 * Zigbee groups do not have a single IEEE address.
 *
 * Normal light commands can be sent directly to a group, so for those
 * commands the per-device runtime is optional.
 */
function tryGetRuntimeFromMeta(meta, entity) {
    const ieee =
        meta?.device?.ieeeAddr ??
        meta?.endpoint?.device?.ieeeAddr ??
        entity?.device?.ieeeAddr ??
        entity?.endpoint?.device?.ieeeAddr;

    if (
        typeof ieee !== 'string' ||
        ieee.length === 0
    ) {
        return undefined;
    }

    return getLampRuntimeByIeee(ieee);
}


function isGroupEntity(entity) {
    return Array.isArray(
        entity?.members,
    );
}

function getDeviceFromEndpoint(endpoint) {
    if (
        endpoint &&
        typeof endpoint.getDevice ===
            'function'
    ) {
        return endpoint.getDevice();
    }

    return endpoint?.device;
}


function getManufacturerName(
    meta,
    entity,
) {
    return (
        meta?.device?.manufacturerName ??
        meta?.endpoint?.device?.manufacturerName ??
        entity?.device?.manufacturerName ??
        entity?.endpoint?.device?.manufacturerName ??
        getDeviceFromEndpoint(entity)?.manufacturerName
    );
}

function isSceneSupported(
    meta,
    entity,
) {
    return SCENE_SUPPORTED_MANUFACTURERS.has(
        getManufacturerName(
            meta,
            entity,
        ),
    );
}

function createMemberMeta(
    meta,
    member,
) {
    const device =
        getDeviceFromEndpoint(
            member,
        );

    return {
        ...meta,

        device,

        endpoint:
            member,

        /*
         * Keep the group state as fallback. This is sufficient for the
         * optimistic editor/runtime state used by Startup and Rhythm.
         */
        state:
            meta?.state ?? {},
    };
}

async function runForGroupMembers(
    entity,
    meta,
    callback,
) {
    if (!isGroupEntity(entity)) {
        return callback(
            entity,
            meta,
        );
    }

    if (
        entity.members.length ===
        0
    ) {
        throw new Error(
            'TS0505B: Zigbee group has no members',
        );
    }

    let result;

    /*
     * Send proprietary Tuya commands as individual unicasts.
     *
     * These bulbs accept normal Zigbee light commands as groupcasts, but
     * vendor-specific Startup / DND / Rhythm commands are not reliably
     * processed when group-addressed.
     */
    for (
        const member of
        entity.members
    ) {
        result =
            await callback(
                member,
                createMemberMeta(
                    meta,
                    member,
                ),
            );
    }

    return result;
}

function isStartupEndpoint(meta) {
    return (
        meta?.endpoint_name === 'startup' ||
        meta?.endpointName === 'startup'
    );
}

function isScenePointEndpoint(meta) {
    return (
        meta?.endpoint_name === 'scene_point' ||
        meta?.endpointName === 'scene_point'
    );
}

function syncStartupBehaviorFromMeta(
    runtime,
    meta,
) {
    const behavior =
        meta?.state?.startup_behavior;

    if (
        behavior === 'initial' ||
        behavior === 'previous' ||
        behavior === 'customized'
    ) {
        runtime.startupBehavior =
            behavior;
    }
}

/*
 * ============================================================================
 * Helpers
 * ============================================================================
 */

function clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.max(
        min,
        Math.min(max, number),
    );
}

function uint16BE(value) {
    const v =
        Math.round(
            clamp(
                value,
                0,
                0xffff,
            ),
        );

    return [
        (v >> 8) & 0xff,
        v & 0xff,
    ];
}

function readUInt16BE(
    buffer,
    offset,
) {
    if (
        !Buffer.isBuffer(buffer) ||
        offset < 0 ||
        offset + 1 >= buffer.length
    ) {
        return undefined;
    }

    return buffer.readUInt16BE(
        offset,
    );
}

function miredToKelvin(mired) {
    const value = Number(mired);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return undefined;
    }

    return Math.round(
        1000000 / value,
    );
}

function colorTempPercentToMired(
    value,
) {
    const percent =
        clamp(value, 0, 100);

    return Math.round(
        COLOR_TEMP_MAX -
        percent *
        (
            COLOR_TEMP_MAX -
            COLOR_TEMP_MIN
        ) /
        100,
    );
}

function colorTempMiredToPercent(
    value,
) {
    const mired =
        clamp(
            value,
            COLOR_TEMP_MIN,
            COLOR_TEMP_MAX,
        );

    return Math.round(
        (
            COLOR_TEMP_MAX -
            mired
        ) *
        100 /
        (
            COLOR_TEMP_MAX -
            COLOR_TEMP_MIN
        ),
    );
}

/*
 * ============================================================================
 * Brightness / CT conversion
 * ============================================================================
 */

function tuyaBrightnessToZ2M(value) {
    return Math.round(
        clamp(value, 0, 1000) *
        254 /
        1000,
    );
}

function z2mBrightnessToTuya(value) {
    return Math.round(
        clamp(value, 0, 254) *
        1000 /
        254,
    );
}

function tuyaColorTempToZ2M(value) {
    const native =
        clamp(value, 0, 1000);

    return Math.round(
        COLOR_TEMP_MAX -
        native *
        (
            COLOR_TEMP_MAX -
            COLOR_TEMP_MIN
        ) /
        1000,
    );
}

function z2mColorTempToTuya(value) {
    const ct =
        clamp(
            value,
            COLOR_TEMP_MIN,
            COLOR_TEMP_MAX,
        );

    return Math.round(
        (
            COLOR_TEMP_MAX -
            ct
        ) *
        1000 /
        (
            COLOR_TEMP_MAX -
            COLOR_TEMP_MIN
        ),
    );
}

/*
 * ============================================================================
 * Color conversion
 * ============================================================================
 */

function srgbToLinear(value) {
    if (value > 0.04045) {
        return Math.pow(
            (value + 0.055) / 1.055,
            2.4,
        );
    }

    return value / 12.92;
}

function linearToSrgb(value) {
    if (value <= 0.0031308) {
        return 12.92 * value;
    }

    return (
        1.055 *
        Math.pow(value, 1 / 2.4) -
        0.055
    );
}

function rgbToXy(r, g, b) {
    const rl = srgbToLinear(r);
    const gl = srgbToLinear(g);
    const bl = srgbToLinear(b);

    const X =
        rl * 0.664511 +
        gl * 0.154324 +
        bl * 0.162028;

    const Y =
        rl * 0.283881 +
        gl * 0.668433 +
        bl * 0.047685;

    const Z =
        rl * 0.000088 +
        gl * 0.072310 +
        bl * 0.986039;

    const sum =
        X + Y + Z;

    if (sum <= 0) {
        return {
            x: 0.3127,
            y: 0.3290,
        };
    }

    return {
        x:
            Number(
                (X / sum)
                    .toFixed(4),
            ),

        y:
            Number(
                (Y / sum)
                    .toFixed(4),
            ),
    };
}

function xyToRgb(x, y) {
    x = Number(x);
    y = Number(y);

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        y <= 0
    ) {
        return {
            r: 1,
            g: 1,
            b: 1,
        };
    }

    const Y = 1;
    const X = Y * x / y;

    const Z =
        Y *
        (
            1 -
            x -
            y
        ) /
        y;

    let r =
        X * 1.656492 -
        Y * 0.354851 -
        Z * 0.255038;

    let g =
        -X * 0.707196 +
        Y * 1.655397 +
        Z * 0.036152;

    let b =
        X * 0.051713 -
        Y * 0.121364 +
        Z * 1.011530;

    const maxLinear =
        Math.max(
            r,
            g,
            b,
        );

    if (maxLinear > 1) {
        r /= maxLinear;
        g /= maxLinear;
        b /= maxLinear;
    }

    r =
        linearToSrgb(
            Math.max(0, r),
        );

    g =
        linearToSrgb(
            Math.max(0, g),
        );

    b =
        linearToSrgb(
            Math.max(0, b),
        );

    const max =
        Math.max(
            r,
            g,
            b,
        );

    if (max > 1) {
        r /= max;
        g /= max;
        b /= max;
    }

    return {
        r: clamp(r, 0, 1),
        g: clamp(g, 0, 1),
        b: clamp(b, 0, 1),
    };
}

function tuyaHsvToRgb(
    h,
    s,
    v,
) {
    let hue =
        clamp(h, 0, 360);

    if (hue >= 360) {
        hue = 0;
    }

    const saturation =
        clamp(s, 0, 1000) /
        1000;

    const value =
        clamp(v, 0, 1000) /
        1000;

    const c =
        value *
        saturation;

    const hp =
        hue /
        60;

    const x =
        c *
        (
            1 -
            Math.abs(
                hp % 2 -
                1
            )
        );

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (
        hp >= 0 &&
        hp < 1
    ) {
        r1 = c;
        g1 = x;
    } else if (hp < 2) {
        r1 = x;
        g1 = c;
    } else if (hp < 3) {
        g1 = c;
        b1 = x;
    } else if (hp < 4) {
        g1 = x;
        b1 = c;
    } else if (hp < 5) {
        r1 = x;
        b1 = c;
    } else {
        r1 = c;
        b1 = x;
    }

    const offset =
        value -
        c;

    return {
        r: clamp(r1 + offset, 0, 1),
        g: clamp(g1 + offset, 0, 1),
        b: clamp(b1 + offset, 0, 1),
    };
}

function rgbToTuyaHsv(
    r,
    g,
    b,
) {
    r = clamp(r, 0, 1);
    g = clamp(g, 0, 1);
    b = clamp(b, 0, 1);

    const max =
        Math.max(r, g, b);

    const min =
        Math.min(r, g, b);

    const delta =
        max - min;

    let hue = 0;

    if (delta !== 0) {
        if (max === r) {
            hue =
                60 *
                (
                    (
                        (g - b) /
                        delta
                    ) %
                    6
                );
        } else if (max === g) {
            hue =
                60 *
                (
                    (b - r) /
                    delta +
                    2
                );
        } else {
            hue =
                60 *
                (
                    (r - g) /
                    delta +
                    4
                );
        }
    }

    if (hue < 0) {
        hue += 360;
    }

    const saturation =
        max === 0 ?
            0 :
            delta / max;

    return {
        h:
            Math.round(
                clamp(
                    hue,
                    0,
                    360,
                ),
            ),

        s:
            Math.round(
                saturation *
                1000,
            ),

        v:
            Math.round(
                max *
                1000,
            ),
    };
}

function tuyaHsvToXy(
    h,
    s,
    v,
) {
    const rgb =
        tuyaHsvToRgb(
            h,
            s,
            v,
        );

    return rgbToXy(
        rgb.r,
        rgb.g,
        rgb.b,
    );
}

function xyToTuyaHs(x, y) {
    const rgb =
        xyToRgb(x, y);

    const hsv =
        rgbToTuyaHsv(
            rgb.r,
            rgb.g,
            rgb.b,
        );

    return {
        h: hsv.h,
        s: hsv.s,
    };
}

function colorTempMiredToXy(
    colorTemp,
) {
    const mired =
        clamp(
            colorTemp,
            COLOR_TEMP_MIN,
            COLOR_TEMP_MAX,
        );

    const kelvin =
        1000000 /
        mired;

    const temperature =
        clamp(
            kelvin,
            1667,
            25000,
        );

    let x;

    if (temperature <= 4000) {
        x =
            -0.2661239 *
                1e9 /
                Math.pow(
                    temperature,
                    3,
                ) -
            0.2343580 *
                1e6 /
                Math.pow(
                    temperature,
                    2,
                ) +
            0.8776956 *
                1e3 /
                temperature +
            0.179910;
    } else {
        x =
            -3.0258469 *
                1e9 /
                Math.pow(
                    temperature,
                    3,
                ) +
            2.1070379 *
                1e6 /
                Math.pow(
                    temperature,
                    2,
                ) +
            0.2226347 *
                1e3 /
                temperature +
            0.240390;
    }

    let y;

    if (temperature <= 2222) {
        y =
            -1.1063814 *
                Math.pow(x, 3) -
            1.34811020 *
                Math.pow(x, 2) +
            2.18555832 *
                x -
            0.20219683;
    } else if (
        temperature <= 4000
    ) {
        y =
            -0.9549476 *
                Math.pow(x, 3) -
            1.37418593 *
                Math.pow(x, 2) +
            2.09137015 *
                x -
            0.16748867;
    } else {
        y =
            3.0817580 *
                Math.pow(x, 3) -
            5.87338670 *
                Math.pow(x, 2) +
            3.75112997 *
                x -
            0.37001483;
    }

    return {
        x:
            Number(
                clamp(
                    x,
                    0,
                    1,
                ).toFixed(4),
            ),

        y:
            Number(
                clamp(
                    y,
                    0,
                    1,
                ).toFixed(4),
            ),
    };
}

/*
 * ============================================================================
 * Normal light cache / preview
 * ============================================================================
 */

function updateCache(
    runtime,
    changes,
) {
    if (
        runtime.preview !==
        undefined
    ) {
        return false;
    }

    runtime.cache = {
        ...runtime.cache,
        ...changes,
    };

    if (
        changes.color !==
        undefined
    ) {
        runtime.cache.color =
            cloneColor(
                changes.color,
            );
    }

    return true;
}

function setSavedPreviewState(
    runtime,
) {
    if (
        runtime.preview !==
        undefined
    ) {
        return;
    }

    runtime.preview = {
        savedValue:
            cloneLightState(
                runtime.cache,
            ),

        timer:
            undefined,
    };
}

function syncPreviewCacheFromMeta(
    runtime,
    meta,
) {
    if (
        !runtime ||
        runtime.preview !== undefined ||
        !meta?.state
    ) {
        return;
    }

    const source =
        meta.state;

    const changes = {};

    if (
        source.state === 'ON' ||
        source.state === 'OFF'
    ) {
        changes.state =
            source.state;
    }

    const brightness =
        Number(
            source.brightness,
        );

    if (
        Number.isFinite(
            brightness,
        )
    ) {
        changes.brightness =
            Math.round(
                clamp(
                    brightness,
                    0,
                    254,
                ),
            );
    }

    const colorTemp =
        Number(
            source.color_temp,
        );

    if (
        Number.isFinite(
            colorTemp,
        )
    ) {
        changes.colorTemp =
            Math.round(
                clamp(
                    colorTemp,
                    COLOR_TEMP_MIN,
                    COLOR_TEMP_MAX,
                ),
            );
    }

    if (
        source.color &&
        Number.isFinite(
            Number(
                source.color.x,
            ),
        ) &&
        Number.isFinite(
            Number(
                source.color.y,
            ),
        )
    ) {
        changes.color = {
            x:
                Number(
                    clamp(
                        source.color.x,
                        0,
                        1,
                    ).toFixed(4),
                ),

            y:
                Number(
                    clamp(
                        source.color.y,
                        0,
                        1,
                    ).toFixed(4),
                ),
        };
    }

    const mode =
        source.light_color_mode ??
        source.color_mode;

    if (
        mode === 'white' ||
        mode === 'color_temp'
    ) {
        changes.mode =
            'white';
    } else if (
        mode === 'color' ||
        mode === 'xy' ||
        mode === 'hs'
    ) {
        changes.mode =
            'color';
    } else if (
        changes.colorTemp !==
        undefined
    ) {
        changes.mode =
            'white';
    } else if (
        changes.color !==
        undefined
    ) {
        changes.mode =
            'color';
    }

    if (
        Object.keys(
            changes,
        ).length > 0
    ) {
        updateCache(
            runtime,
            changes,
        );
    }
}

/*
 * ============================================================================
 * Custom clusters
 * ============================================================================
 */

const customLevelCluster =
    m.deviceAddCustomCluster(
        'genLevelCtrl',
        {
            name:
                'genLevelCtrl',

            ID:
                Zcl.Clusters
                    .genLevelCtrl
                    .ID,

            attributes: {
                tuyaCurrentBrightness: {
                    name:
                        'tuyaCurrentBrightness',

                    ID:
                        0xf000,

                    type:
                        Zcl.DataType
                            .UINT16,
                },
            },

            commands: {},
            commandsResponse: {},
        },
    );

const customColorCluster =
    m.deviceAddCustomCluster(
        'lightingColorCtrl',
        {
            name:
                'lightingColorCtrl',

            ID:
                Zcl.Clusters
                    .lightingColorCtrl
                    .ID,

            attributes: {
                tuyaCurrentColorTemp: {
                    name:
                        'tuyaCurrentColorTemp',

                    ID:
                        0xe000,

                    type:
                        Zcl.DataType
                            .UINT16,
                },

                tuyaCurrentColorMode: {
                    name:
                        'tuyaCurrentColorMode',

                    ID:
                        0xf000,

                    type:
                        Zcl.DataType
                            .UINT8,
                },

                tuyaDoNotDisturb: {
                    name:
                        'tuyaDoNotDisturb',

                    ID:
                        0xf00d,

                    type:
                        Zcl.DataType
                            .BOOLEAN,
                },

                /*
                 * Tuya Scene data. 0x48 is the ZCL ARRAY data type.
                 * Keep the numeric type here so this also works with
                 * zigbee-herdsman versions where DataType.ARRAY is not
                 * exported as a named enum member.
                 */
                tuyaSceneData: {
                    name:
                        'tuyaSceneData',

                    ID:
                        0xf003,

                    type:
                        0x48,
                },
            },

            commands: {
                tuyaSetModeRaw: {
                    name:
                        'tuyaSetModeRaw',

                    ID:
                        0xf0,

                    parameters: [
                        {
                            name:
                                'mode',

                            type:
                                Zcl.DataType
                                    .UINT8,
                        },
                    ],
                },

                tuyaSceneRaw: {
                    name:
                        'tuyaSceneRaw',

                    ID:
                        0xf1,

                    parameters: [
                        {
                            name:
                                'data',

                            type:
                                Zcl
                                    .BuffaloZclDataType
                                    .BUFFER,
                        },
                    ],
                },

                tuyaStartupRaw: {
                    name:
                        'tuyaStartupRaw',

                    ID:
                        0xf9,

                    parameters: [
                        {
                            name:
                                'mode',

                            type:
                                Zcl.DataType
                                    .UINT16,
                        },

                        {
                            name:
                                'data',

                            type:
                                Zcl
                                    .BuffaloZclDataType
                                    .BUFFER,
                        },
                    ],
                },

                tuyaRhythmRaw: {
                    name:
                        'tuyaRhythmRaw',

                    ID:
                        0xf6,

                    parameters: [
                        {
                            name:
                                'data',

                            type:
                                Zcl
                                    .BuffaloZclDataType
                                    .BUFFER,
                        },
                    ],
                },

                tuyaDoNotDisturbRaw: {
                    name:
                        'tuyaDoNotDisturbRaw',

                    ID:
                        0xfa,

                    parameters: [
                        {
                            name:
                                'enabled',

                            type:
                                Zcl.DataType
                                    .UINT8,
                        },
                    ],
                },
            },

            commandsResponse: {},
        },
    );

/*
 * ============================================================================
 * Physical light TX
 * ============================================================================
 */

async function sendPhysicalState(
    entity,
    state,
) {
    await entity.command(
        'genOnOff',
        state === 'ON' ?
            'on' :
            'off',
        {},
        {
            disableDefaultResponse:
                false,
        },
    );
}

async function sendPhysicalBrightness(
    entity,
    brightness,
) {
    const level =
        Math.round(
            clamp(
                brightness,
                0,
                254,
            ),
        );

    await entity.command(
        'genLevelCtrl',
        'moveToLevel',
        {
            level,
            transtime: 0,
        },
        {
            disableDefaultResponse:
                false,
        },
    );
}

async function sendPhysicalColorTemp(
    entity,
    colorTemp,
) {
    const ct =
        Math.round(
            clamp(
                colorTemp,
                COLOR_TEMP_MIN,
                COLOR_TEMP_MAX,
            ),
        );

    await entity.command(
        'lightingColorCtrl',
        'moveToColorTemp',
        {
            colortemp:
                ct,

            transtime:
                0,
        },
        {
            disableDefaultResponse:
                false,
        },
    );
}

async function sendPhysicalColor(
    entity,
    color,
) {
    if (
        !color ||
        !Number.isFinite(
            Number(color.x),
        ) ||
        !Number.isFinite(
            Number(color.y),
        )
    ) {
        throw new Error(
            `Invalid XY color ${JSON.stringify(color)}`,
        );
    }

    const x =
        clamp(
            color.x,
            0,
            1,
        );

    const y =
        clamp(
            color.y,
            0,
            1,
        );

    await entity.command(
        'lightingColorCtrl',
        'moveToColor',
        {
            colorx:
                Math.round(
                    x *
                    65535,
                ),

            colory:
                Math.round(
                    y *
                    65535,
                ),

            transtime:
                0,
        },
        {
            disableDefaultResponse:
                false,
        },
    );
}

/*
 * ============================================================================
 * Preview restore
 * ============================================================================
 */

async function restorePreviewState(
    entity,
    runtime,
    preview,
) {
    const saved =
        preview.savedValue;

    if (
        saved.mode ===
            'color' &&
        saved.color
    ) {
        await sendPhysicalColor(
            entity,
            saved.color,
        );
    } else if (
        saved.mode ===
            'white' &&
        saved.colorTemp !==
            undefined
    ) {
        await sendPhysicalColorTemp(
            entity,
            saved.colorTemp,
        );
    }

    if (
        saved.brightness !==
        undefined
    ) {
        await sendPhysicalBrightness(
            entity,
            saved.brightness,
        );
    }

    if (
        saved.state === 'ON' ||
        saved.state === 'OFF'
    ) {
        await sendPhysicalState(
            entity,
            saved.state,
        );
    }

    runtime.cache =
        cloneLightState(
            saved,
        );
}

function restartPreviewTimer(
    entity,
    runtime,
) {
    const preview =
        runtime.preview;

    if (!preview) {
        throw new Error(
            'Preview is not active',
        );
    }

    if (
        preview.timer !==
        undefined
    ) {
        clearTimeout(
            preview.timer,
        );
    }

    preview.timer =
        setTimeout(
            async () => {
                if (
                    runtime.preview !==
                    preview
                ) {
                    return;
                }

                try {
                    await restorePreviewState(
                        entity,
                        runtime,
                        preview,
                    );
                } catch (error) {
                    console.error(
                        '[TS0505B] Preview restore failed:',
                        error,
                    );
                } finally {
                    if (
                        runtime.preview ===
                        preview
                    ) {
                        runtime.preview =
                            undefined;
                    }
                }
            },

            PREVIEW_RESTORE_MS,
        );
}

async function restorePreviewNow(
    entity,
    runtime,
) {
    const preview =
        runtime.preview;

    if (!preview) {
        return;
    }

    if (
        preview.timer !==
        undefined
    ) {
        clearTimeout(
            preview.timer,
        );
    }

    try {
        await restorePreviewState(
            entity,
            runtime,
            preview,
        );
    } finally {
        if (
            runtime.preview ===
            preview
        ) {
            runtime.preview =
                undefined;
        }
    }
}

/*
 * ============================================================================
 * Normal light RX
 * ============================================================================
 */

const fzNormalOnOff = {
    cluster:
        'genOnOff',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        if (
            msg.data?.onOff ===
            undefined
        ) {
            return;
        }

        const runtime =
            getRuntimeFromMsg(msg);

        if (
            runtime?.preview !==
            undefined
        ) {
            return;
        }

        const state =
            Number(
                msg.data.onOff,
            ) !== 0 ?
                'ON' :
                'OFF';

        updateCache(
            runtime,
            {state},
        );

        return {
            state,
        };
    },
};

const fzNormalBrightness = {
    cluster:
        'genLevelCtrl',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        const runtime =
            getRuntimeFromMsg(msg);

        let brightness;

        const proprietary =
            msg.data
                ?.tuyaCurrentBrightness ??
            msg.data?.[0xf000] ??
            msg.data?.[61440] ??
            msg.data?.['61440'];

        if (
            proprietary !==
            undefined
        ) {
            brightness =
                tuyaBrightnessToZ2M(
                    proprietary,
                );
        } else if (
            msg.data?.currentLevel !==
            undefined
        ) {
            brightness =
                Math.round(
                    clamp(
                        msg.data.currentLevel,
                        0,
                        254,
                    ),
                );
        } else {
            return;
        }

        if (
            runtime?.preview !==
            undefined
        ) {
            return;
        }

        updateCache(
            runtime,
            {brightness},
        );

        return {
            brightness,
        };
    },
};

const fzNormalColorMode = {
    cluster:
        'lightingColorCtrl',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        const runtime =
            getRuntimeFromMsg(msg);

        const data =
            msg.data ?? {};

        let mode;
        let colorMode;

        const proprietary =
            data.tuyaCurrentColorMode ??
            data[0xf000] ??
            data[61440] ??
            data['61440'];

        if (
            proprietary !==
            undefined
        ) {
            const value =
                Number(
                    proprietary,
                );

            if (
                value ===
                TUYA_COLOR_MODE.white
            ) {
                mode =
                    'white';

                colorMode =
                    'color_temp';
            } else if (
                value ===
                TUYA_COLOR_MODE.color
            ) {
                mode =
                    'color';

                colorMode =
                    'xy';
            }
        } else if (
            data.colorMode !==
            undefined
        ) {
            const value =
                Number(
                    data.colorMode,
                );

            if (
                value ===
                    ZIGBEE_COLOR_MODE.hs ||
                value ===
                    ZIGBEE_COLOR_MODE.xy
            ) {
                mode =
                    'color';

                colorMode =
                    'xy';
            } else if (
                value ===
                ZIGBEE_COLOR_MODE.colorTemp
            ) {
                mode =
                    'white';

                colorMode =
                    'color_temp';
            }
        }

        if (
            mode ===
            undefined
        ) {
            return;
        }

        if (
            runtime.preview !==
            undefined
        ) {
            return;
        }

        updateCache(
            runtime,
            {mode},
        );

        return {
            color_mode:
                colorMode,

            light_color_mode:
                mode,
        };
    },
};

const fzNormalColorTemp = {
    cluster:
        'lightingColorCtrl',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        const runtime =
            getRuntimeFromMsg(msg);

        let colorTemp;

        const proprietary =
            msg.data
                ?.tuyaCurrentColorTemp ??
            msg.data?.[0xe000] ??
            msg.data?.[57344] ??
            msg.data?.['57344'];

        if (
            proprietary !==
            undefined
        ) {
            colorTemp =
                tuyaColorTempToZ2M(
                    proprietary,
                );
        } else if (
            msg.data?.colorTemperature !==
            undefined
        ) {
            colorTemp =
                Math.round(
                    clamp(
                        msg.data.colorTemperature,
                        COLOR_TEMP_MIN,
                        COLOR_TEMP_MAX,
                    ),
                );
        } else {
            return;
        }

        if (
            runtime.preview !==
            undefined
        ) {
            return;
        }

        if (
            runtime.cache.mode ===
            'color'
        ) {
            return;
        }

        const color =
            colorTempMiredToXy(
                colorTemp,
            );

        updateCache(
            runtime,
            {
                mode:
                    'white',

                colorTemp,
                color,
            },
        );

        return {
            color_temp:
                colorTemp,

            color_mode:
                'color_temp',

            light_color_mode:
                'white',

            color,
        };
    },
};

const fzNormalXy = {
    cluster:
        'lightingColorCtrl',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        const runtime =
            getRuntimeFromMsg(msg);

        if (
            msg.data?.currentX ===
                undefined &&
            msg.data?.currentY ===
                undefined
        ) {
            return;
        }

        if (
            runtime.preview !==
            undefined
        ) {
            return;
        }

        if (
            msg.data?.currentX !==
            undefined
        ) {
            runtime.xyAccumulator.x =
                Number(
                    msg.data.currentX,
                ) /
                65535;
        }

        if (
            msg.data?.currentY !==
            undefined
        ) {
            runtime.xyAccumulator.y =
                Number(
                    msg.data.currentY,
                ) /
                65535;
        }

        if (
            !Number.isFinite(
                runtime
                    .xyAccumulator
                    .x,
            ) ||
            !Number.isFinite(
                runtime
                    .xyAccumulator
                    .y,
            )
        ) {
            return;
        }

        if (
            runtime.cache.mode !==
            'color'
        ) {
            return;
        }

        const color = {
            x:
                Number(
                    clamp(
                        runtime
                            .xyAccumulator
                            .x,
                        0,
                        1,
                    ).toFixed(4),
                ),

            y:
                Number(
                    clamp(
                        runtime
                            .xyAccumulator
                            .y,
                        0,
                        1,
                    ).toFixed(4),
                ),
        };

        updateCache(
            runtime,
            {color},
        );

        return {
            color,

            color_mode:
                'xy',

            light_color_mode:
                'color',
        };
    },
};

/*
 * ============================================================================
 * Do Not Disturb
 * ============================================================================
 */

const fzDoNotDisturb = {
    cluster:
        'lightingColorCtrl',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        const value =
            msg.data
                ?.tuyaDoNotDisturb ??
            msg.data?.[0xf00d] ??
            msg.data?.[61453] ??
            msg.data?.['61453'];

        if (
            value ===
            undefined
        ) {
            return;
        }

        const enabled =
            value === true ||
            Number(value) !== 0;

        return {
            do_not_disturb:
                enabled ?
                    'ON' :
                    'OFF',
        };
    },
};

const tzDoNotDisturbSingle = {
    key: [
        'do_not_disturb',
    ],

    convertSet: async (
        entity,
        key,
        value,
    ) => {
        const enabled =
            value === true ||
            String(value)
                .toUpperCase() ===
                'ON';

        await entity.command(
            'lightingColorCtrl',
            'tuyaDoNotDisturbRaw',
            {
                enabled:
                    enabled ?
                        1 :
                        0,
            },
            {
                disableDefaultResponse:
                    true,
            },
        );

        return {
            state: {
                do_not_disturb:
                    enabled ?
                        'ON' :
                        'OFF',
            },
        };
    },
};

const tzDoNotDisturb = {
    key: [
        'do_not_disturb',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        return runForGroupMembers(
            entity,
            meta,
            async (
                target,
                targetMeta,
            ) =>
                tzDoNotDisturbSingle
                    .convertSet(
                        target,
                        key,
                        value,
                        targetMeta,
                    ),
        );
    },
};

/*
 * ============================================================================
 * Startup F9
 * ============================================================================
 */

function createInitialData() {
    return [
        0x00, 0x00,
        0x00, 0x00,
        0x00, 0x00,
        0x03, 0xe8,
        0x03, 0xe8,
    ];
}

function createPreviousData() {
    return [
        0x00, 0x00,
        0x00, 0x00,
        0x00, 0x00,
        0x03, 0xe8,
        0x03, 0xe8,
    ];
}

function createCustomizedWhiteData(
    startup,
) {
    return [
        0x00, 0x00,
        0x00, 0x00,
        0x00, 0x00,

        ...uint16BE(
            z2mBrightnessToTuya(
                startup.brightness,
            ),
        ),

        ...uint16BE(
            z2mColorTempToTuya(
                startup.colorTemp,
            ),
        ),
    ];
}

function createCustomizedColorData(
    startup,
) {
    const color =
        startup.color ?? {
            x: 0.3127,
            y: 0.3290,
        };

    const hs =
        xyToTuyaHs(
            color.x,
            color.y,
        );

    const value =
        z2mBrightnessToTuya(
            startup.brightness,
        );

    return [
        ...uint16BE(
            hs.h,
        ),

        ...uint16BE(
            hs.s,
        ),

        ...uint16BE(
            value,
        ),

        0x00, 0x00,
        0x00, 0x00,
    ];
}

async function sendStartupF9(
    entity,
    runtime,
) {
    let mode;
    let data;

    if (
        runtime.startupBehavior ===
        'initial'
    ) {
        mode =
            STARTUP_MODE.initial;

        data =
            createInitialData();
    } else if (
        runtime.startupBehavior ===
        'previous'
    ) {
        mode =
            STARTUP_MODE.previous;

        data =
            createPreviousData();
    } else {
        mode =
            STARTUP_MODE.customized;

        data =
            runtime
                .startupValue
                .mode ===
                'color' ?
                createCustomizedColorData(
                    runtime
                        .startupValue,
                ) :
                createCustomizedWhiteData(
                    runtime
                        .startupValue,
                );
    }

    await entity.command(
        'lightingColorCtrl',
        'tuyaStartupRaw',
        {
            mode,

            data:
                Buffer.from(
                    data,
                ),
        },
        {
            disableDefaultResponse:
                true,
        },
    );
}

/*
 * ============================================================================
 * Startup preview
 * ============================================================================
 */

async function applyStartupPreview(
    entity,
    startup,
) {
    await sendPhysicalState(
        entity,
        'ON',
    );

    if (
        startup.mode ===
        'color'
    ) {
        await sendPhysicalColor(
            entity,
            startup.color,
        );
    } else {
        await sendPhysicalColorTemp(
            entity,
            startup.colorTemp,
        );
    }

    await sendPhysicalBrightness(
        entity,
        startup.brightness,
    );
}

async function executeStartupPreview(
    entity,
    runtime,
) {
    setSavedPreviewState(
        runtime,
    );

    const startup =
        cloneLightState(
            runtime.startupValue,
        );

    await sendStartupF9(
        entity,
        runtime,
    );

    await applyStartupPreview(
        entity,
        startup,
    );

    restartPreviewTimer(
        entity,
        runtime,
    );
}

/*
 * ============================================================================
 * Main light TX router
 * ============================================================================
 */

const tzLightRouterSingle = {
    key: [
        'state',
        'brightness',
        'color',
        'color_temp',
        'color_temp_percent',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        const scenePoint =
            isScenePointEndpoint(
                meta,
            );

        if (scenePoint) {
            if (
                key ===
                'state'
            ) {
                const state =
                    String(value)
                        .toUpperCase();

                if (
                    state !== 'ON' &&
                    state !== 'OFF'
                ) {
                    throw new Error(
                        `Invalid Scene point state '${value}'`,
                    );
                }

                return tzSceneSingle.convertSet(
                    entity,
                    'scene_point_enabled',
                    state,
                    meta,
                );
            }

            if (
                key ===
                'brightness'
            ) {
                const brightness =
                    Math.round(
                        clamp(
                            value,
                            0,
                            254,
                        ) *
                        100 /
                        254,
                    );

                return tzSceneSingle.convertSet(
                    entity,
                    'scene_point_brightness',
                    brightness,
                    meta,
                );
            }

            if (
                key ===
                'color'
            ) {
                if (
                    !value ||
                    !Number.isFinite(
                        Number(value.x),
                    ) ||
                    !Number.isFinite(
                        Number(value.y),
                    )
                ) {
                    throw new Error(
                        `Invalid Scene point XY ${JSON.stringify(value)}`,
                    );
                }

                const hs =
                    xyToTuyaHs(
                        Number(value.x),
                        Number(value.y),
                    );

                return tzSceneSingle.convertSet(
                    entity,
                    'scene_point_color_xy',
                    {
                        hue: hs.h,
                        saturation:
                            Math.round(
                                clamp(
                                    hs.s / 10,
                                    0,
                                    100,
                                ),
                            ),
                    },
                    meta,
                );
            }

            if (
                key === 'color_temp' ||
                key === 'color_temp_percent'
            ) {
                const percent =
                    key === 'color_temp_percent' ?
                        Math.round(
                            clamp(
                                value,
                                0,
                                100,
                            ),
                        ) :
                        colorTempMiredToPercent(
                            value,
                        );

                return tzSceneSingle.convertSet(
                    entity,
                    'scene_point_color_temp_light',
                    percent,
                    meta,
                );
            }

            return;
        }

        const startup =
            isStartupEndpoint(
                meta,
            );

        const runtime =
            startup ?
                getRuntimeFromMeta(
                    meta,
                    entity,
                ) :
                tryGetRuntimeFromMeta(
                    meta,
                    entity,
                );

        if (startup) {
            syncStartupBehaviorFromMeta(
                runtime,
                meta,
            );

            if (
                key ===
                'state'
            ) {
                const state =
                    String(value)
                        .toUpperCase();

                if (
                    state !==
                    'ON'
                ) {
                    throw new Error(
                        'Startup OFF is ambiguous. Use Startup behavior to select Initial or Previous.',
                    );
                }

                runtime.startupBehavior =
                    'customized';

                await sendStartupF9(
                    entity,
                    runtime,
                );

                return {
                    state: {
                        state_startup:
                            'ON',

                        startup_behavior:
                            'customized',
                    },
                };
            }

            if (
                runtime.startupBehavior !==
                'customized'
            ) {
                throw new Error(
                    'Startup appearance can only be edited when Startup behavior is customized',
                );
            }

            if (
                key ===
                'brightness'
            ) {
                runtime
                    .startupValue
                    .brightness =
                    Math.round(
                        clamp(
                            value,
                            0,
                            254,
                        ),
                    );

                await executeStartupPreview(
                    entity,
                    runtime,
                );

                return {
                    state: {
                        brightness_startup:
                            runtime
                                .startupValue
                                .brightness,
                    },
                };
            }

            if (
                key ===
                    'color_temp' ||
                key ===
                    'color_temp_percent'
            ) {
                const colorTemp =
                    key ===
                    'color_temp_percent' ?
                        colorTempPercentToMired(
                            value,
                        ) :
                        Math.round(
                            clamp(
                                value,
                                COLOR_TEMP_MIN,
                                COLOR_TEMP_MAX,
                            ),
                        );

                runtime
                    .startupValue
                    .colorTemp =
                    colorTemp;

                runtime
                    .startupValue
                    .mode =
                    'white';

                runtime
                    .startupValue
                    .color =
                    colorTempMiredToXy(
                        colorTemp,
                    );

                await executeStartupPreview(
                    entity,
                    runtime,
                );

                return {
                    state: {
                        color_temp_startup:
                            colorTemp,

                        startup_color_temp_kelvin:
                            miredToKelvin(
                                colorTemp,
                            ),

                        startup_color_mode:
                            'white',
                    },
                };
            }

            if (
                key ===
                'color'
            ) {
                if (
                    !value ||
                    !Number.isFinite(
                        Number(
                            value.x,
                        ),
                    ) ||
                    !Number.isFinite(
                        Number(
                            value.y,
                        ),
                    )
                ) {
                    throw new Error(
                        `Invalid startup XY ${JSON.stringify(value)}`,
                    );
                }

                runtime
                    .startupValue
                    .color = {
                    x:
                        Number(
                            clamp(
                                value.x,
                                0,
                                1,
                            ).toFixed(4),
                        ),

                    y:
                        Number(
                            clamp(
                                value.y,
                                0,
                                1,
                            ).toFixed(4),
                        ),
                };

                runtime
                    .startupValue
                    .mode =
                    'color';

                await executeStartupPreview(
                    entity,
                    runtime,
                );

                return {
                    state: {
                        color_startup:
                            cloneColor(
                                runtime
                                    .startupValue
                                    .color,
                            ),

                        startup_color_mode:
                            'color',
                    },
                };
            }

            return;
        }

        if (
            runtime?.preview !==
            undefined
        ) {
            return {
                state: {},
            };
        }

        if (
            key ===
            'state'
        ) {
            const state =
                String(value)
                    .toUpperCase();

            if (
                state !== 'ON' &&
                state !== 'OFF'
            ) {
                throw new Error(
                    `Invalid state '${value}'`,
                );
            }

            await sendPhysicalState(
                entity,
                state,
            );

            if (runtime) {
                updateCache(
                    runtime,
                    {state},
                );
            }

            return {
                state: {
                    state,
                },
            };
        }

        if (
            key ===
            'brightness'
        ) {
            const brightness =
                Math.round(
                    clamp(
                        value,
                        0,
                        254,
                    ),
                );

            await sendPhysicalBrightness(
                entity,
                brightness,
            );

            if (runtime) {
                updateCache(
                    runtime,
                    {brightness},
                );
            }

            return {
                state: {
                    brightness,
                },
            };
        }

        if (
            key ===
            'color'
        ) {
            if (
                !value ||
                !Number.isFinite(
                    Number(value.x),
                ) ||
                !Number.isFinite(
                    Number(value.y),
                )
            ) {
                throw new Error(
                    `Invalid color ${JSON.stringify(value)}`,
                );
            }

            const color = {
                x:
                    clamp(
                        value.x,
                        0,
                        1,
                    ),

                y:
                    clamp(
                        value.y,
                        0,
                        1,
                    ),
            };

            await sendPhysicalColor(
                entity,
                color,
            );

            if (runtime) {
                updateCache(
                    runtime,
                    {
                    mode:
                        'color',

                    color,
                },
                );
            }

            return {
                state: {
                    color,

                    color_mode:
                        'xy',

                    light_color_mode:
                        'color',
                },
            };
        }

        if (
            key ===
                'color_temp' ||
            key ===
                'color_temp_percent'
        ) {
            const colorTemp =
                key ===
                    'color_temp_percent' ?
                    colorTempPercentToMired(
                        value,
                    ) :
                    Math.round(
                        clamp(
                            value,
                            COLOR_TEMP_MIN,
                            COLOR_TEMP_MAX,
                        ),
                    );

            const color =
                colorTempMiredToXy(
                    colorTemp,
                );

            await sendPhysicalColorTemp(
                entity,
                colorTemp,
            );

            if (runtime) {
                updateCache(
                    runtime,
                    {
                    mode:
                        'white',

                    colorTemp,
                    color,
                },
                );
            }

            return {
                state: {
                    color_temp:
                        colorTemp,

                    color_mode:
                        'color_temp',

                    light_color_mode:
                        'white',

                    color,
                },
            };
        }

        return;
    },
};

const tzLightRouter = {
    key: [
        'state',
        'brightness',
        'color',
        'color_temp',
        'color_temp_percent',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        /*
         * Normal light commands are standard Zigbee commands and should stay
         * group-addressed. Startup appearance is Tuya-specific and therefore
         * has to be sent to every member individually.
         */
        if (
            isGroupEntity(entity) &&
            (
                isStartupEndpoint(meta) ||
                isScenePointEndpoint(meta)
            )
        ) {
            return runForGroupMembers(
                entity,
                meta,
                async (
                    target,
                    targetMeta,
                ) =>
                    tzLightRouterSingle
                        .convertSet(
                            target,
                            key,
                            value,
                            targetMeta,
                        ),
            );
        }

        return tzLightRouterSingle
            .convertSet(
                entity,
                key,
                value,
                meta,
            );
    },
};

/*
 * ============================================================================
 * Startup behavior
 * ============================================================================
 */

const tzStartupBehaviorSingle = {
    key: [
        'startup_behavior',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        const runtime =
            getRuntimeFromMeta(
                meta,
                entity,
            );

        const behavior =
            String(value);

        if (
            !Object.prototype
                .hasOwnProperty.call(
                    STARTUP_MODE,
                    behavior,
                )
        ) {
            throw new Error(
                `Invalid startup behavior '${behavior}'`,
            );
        }

        runtime.startupBehavior =
            behavior;

        await sendStartupF9(
            entity,
            runtime,
        );

        return {
            state: {
                startup_behavior:
                    behavior,

                state_startup:
                    behavior ===
                        'customized' ?
                        'ON' :
                        'OFF',
            },
        };
    },
};

const tzStartupBehavior = {
    key: [
        'startup_behavior',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        return runForGroupMembers(
            entity,
            meta,
            async (
                target,
                targetMeta,
            ) =>
                tzStartupBehaviorSingle
                    .convertSet(
                        target,
                        key,
                        value,
                        targetMeta,
                    ),
        );
    },
};

/*
 * ============================================================================
 * Startup F00C RX
 * ============================================================================
 */

function processStartupF00C(
    msg,
    payload,
) {
    const runtime =
        getRuntimeFromMsg(msg);

    const mode =
        payload[0] |
        (
            payload[1] <<
            8
        );

    const behavior =
        STARTUP_MODE_REVERSE[
            mode
        ];

    if (!behavior) {
        return;
    }

    runtime.startupBehavior =
        behavior;

    if (
        behavior ===
            'initial' ||
        behavior ===
            'previous'
    ) {
        return {
            startup_behavior:
                behavior,

            state_startup:
                'OFF',
        };
    }

    const hue =
        readUInt16BE(
            payload,
            2,
        );

    const saturation =
        readUInt16BE(
            payload,
            4,
        );

    const value =
        readUInt16BE(
            payload,
            6,
        );

    const brightnessNative =
        readUInt16BE(
            payload,
            8,
        );

    const colorTempNative =
        readUInt16BE(
            payload,
            10,
        );

    if (
        hue !== 0 ||
        saturation !== 0 ||
        value !== 0
    ) {
        runtime
            .startupValue
            .state =
            'ON';

        runtime
            .startupValue
            .mode =
            'color';

        runtime
            .startupValue
            .brightness =
            tuyaBrightnessToZ2M(
                value,
            );

        runtime
            .startupValue
            .color =
            tuyaHsvToXy(
                hue,
                saturation,
                value,
            );

        return {
            startup_behavior:
                'customized',

            state_startup:
                'ON',

            brightness_startup:
                runtime
                    .startupValue
                    .brightness,

            color_startup:
                cloneColor(
                    runtime
                        .startupValue
                        .color,
                ),

            startup_color_mode:
                'color',

            startup_color_temp_kelvin:
                miredToKelvin(
                    runtime
                        .startupValue
                        .colorTemp,
                ),
        };
    }

    runtime
        .startupValue
        .state =
        'ON';

    runtime
        .startupValue
        .mode =
        'white';

    runtime
        .startupValue
        .brightness =
        tuyaBrightnessToZ2M(
            brightnessNative,
        );

    runtime
        .startupValue
        .colorTemp =
        tuyaColorTempToZ2M(
            colorTempNative,
        );

    runtime
        .startupValue
        .color =
        colorTempMiredToXy(
            runtime
                .startupValue
                .colorTemp,
        );

    return {
        startup_behavior:
            'customized',

        state_startup:
            'ON',

        brightness_startup:
            runtime
                .startupValue
                .brightness,

        color_temp_startup:
            runtime
                .startupValue
                .colorTemp,

        color_startup:
            cloneColor(
                runtime
                    .startupValue
                    .color,
            ),

        startup_color_mode:
            'white',

        startup_color_temp_kelvin:
            miredToKelvin(
                runtime
                    .startupValue
                    .colorTemp,
            ),
    };
}

/*
 * ============================================================================
 * Scene data model
 * ============================================================================
 */

function cloneScenePoint(point) {
    return {
        enabled:
            Boolean(
                point.enabled,
            ),

        mode:
            point.mode === 'white' ?
                'white' :
                'color',

        hue:
            Math.round(
                clamp(
                    point.hue,
                    0,
                    360,
                ),
            ),

        saturation:
            Math.round(
                clamp(
                    point.saturation,
                    0,
                    100,
                ),
            ),

        brightness:
            Math.round(
                clamp(
                    point.brightness,
                    0,
                    100,
                ),
            ),

        colorTemp:
            Math.round(
                clamp(
                    point.colorTemp,
                    0,
                    100,
                ),
            ),
    };
}

function cloneScene(scene) {
    return {
        name:
            String(
                scene.name,
            ),

        effect:
            scene.effect,

        speed:
            Math.round(
                clamp(
                    scene.speed,
                    0,
                    100,
                ),
            ),

        points:
            scene.points.map(
                cloneScenePoint,
            ),
    };
}

function createSceneEditor() {
    const saved =
        DEFAULT_SCENES.map(
            cloneScene,
        );

    return {
        selected:
            0,

        selectedPoint:
            0,

        saved,

        draft:
            saved.map(
                cloneScene,
            ),

        dirty:
            new Set(),

        pendingSaveSceneId:
            undefined,

        pendingPreviewSceneId:
            undefined,

        hydratedFromState:
            false,
    };
}

function getSceneEditor(runtime) {
    if (!runtime.scene) {
        runtime.scene =
            createSceneEditor();
    }

    return runtime.scene;
}

function getSceneIndexByName(value) {
    const name =
        String(value);

    const index =
        SCENE_NAMES.indexOf(
            name,
        );

    if (index < 0) {
        throw new Error(
            `Invalid Scene '${value}'`,
        );
    }

    return index;
}

function getEnabledScenePoints(scene) {
    return scene.points.filter(
        (point) =>
            point.enabled,
    );
}

function countEnabledScenePoints(scene) {
    return getEnabledScenePoints(
        scene,
    ).length;
}

function sceneEffectToMode(effect) {
    const mode =
        SCENE_EFFECT[
            effect
        ];

    if (
        mode ===
        undefined
    ) {
        throw new Error(
            `Invalid Scene effect '${effect}'`,
        );
    }

    return mode;
}

function encodeScenePayload(
    sceneId,
    scene,
) {
    const points =
        getEnabledScenePoints(
            scene,
        );

    if (
        points.length <
        SCENE_MIN_POINTS
    ) {
        throw new Error(
            'At least one Scene point must be enabled',
        );
    }

    if (
        points.length >
        SCENE_MAX_POINTS
    ) {
        throw new Error(
            `A Scene can contain at most ${SCENE_MAX_POINTS} points`,
        );
    }

    const effectMode =
        sceneEffectToMode(
            scene.effect,
        );

    const speed =
        Math.round(
            clamp(
                scene.speed,
                0,
                100,
            ),
        );

    let modeMsbBits = 0;

    const records = [];

    for (
        let index = 0;
        index < points.length;
        index++
    ) {
        const point =
            points[index];

        const modeMsb =
            (
                effectMode >>
                1
            ) &
            0x01;

        const modeLsb =
            effectMode &
            0x01;

        if (modeMsb) {
            modeMsbBits |=
                1 <<
                index;
        }

        let hue = 0;
        let saturation = 0;
        let value = 0;
        let brightness = 0;
        let colorTemp = 0;

        if (
            point.mode ===
            'white'
        ) {
            brightness =
                Math.round(
                    clamp(
                        point.brightness,
                        0,
                        100,
                    ) *
                    10,
                );

            colorTemp =
                Math.round(
                    clamp(
                        point.colorTemp,
                        0,
                        100,
                    ) *
                    10,
                );
        } else {
            hue =
                Math.round(
                    clamp(
                        point.hue,
                        0,
                        360,
                    ),
                );

            saturation =
                Math.round(
                    clamp(
                        point.saturation,
                        0,
                        100,
                    ) *
                    10,
                );

            value =
                Math.round(
                    clamp(
                        point.brightness,
                        0,
                        100,
                    ) *
                    10,
                );
        }

        const packedHigh =
            (
                (
                    saturation >>
                    8
                ) &
                0x03
            ) <<
                6 |
            (
                (
                    value >>
                    8
                ) &
                0x03
            ) <<
                4 |
            (
                (
                    brightness >>
                    8
                ) &
                0x03
            ) <<
                2 |
            (
                colorTemp >>
                8
            ) &
                0x03;

        records.push(
            (
                modeLsb <<
                7
            ) |
                speed,

            (
                (
                    hue >>
                    8
                ) <<
                7
            ) |
                speed,

            hue &
                0xff,

            packedHigh,

            saturation &
                0xff,

            value &
                0xff,

            brightness &
                0xff,

            colorTemp &
                0xff,
        );
    }

    return Buffer.from([
        sceneId &
            0xff,

        modeMsbBits &
            0xff,

        ...records,
    ]);
}

function decodeScenePayload(payload) {
    if (
        !Buffer.isBuffer(payload) ||
        payload.length < 10 ||
        (
            payload.length -
            2
        ) %
            8 !==
            0
    ) {
        throw new Error(
            'Invalid Scene payload length',
        );
    }

    const sceneId =
        payload[0];

    if (
        sceneId < 0 ||
        sceneId >=
            SCENE_NAMES.length
    ) {
        throw new Error(
            `Invalid Scene ID ${sceneId}`,
        );
    }

    const count =
        (
            payload.length -
            2
        ) /
        8;

    if (
        count <
            SCENE_MIN_POINTS ||
        count >
            SCENE_MAX_POINTS
    ) {
        throw new Error(
            `Invalid Scene point count ${count}`,
        );
    }

    const modeMsbBits =
        payload[1];

    const points = [];

    let firstEffect;
    let firstSpeed;

    for (
        let index = 0;
        index < count;
        index++
    ) {
        const offset =
            2 +
            index *
            8;

        const byte0 =
            payload[offset];

        const byte1 =
            payload[
                offset + 1
            ];

        const mode =
            (
                (
                    modeMsbBits >>
                    index
                ) &
                0x01
            ) <<
                1 |
            (
                byte0 >>
                7
            );

        const effect =
            SCENE_EFFECT_REVERSE[
                mode
            ] ??
            'static';

        const transitionTime =
            byte0 &
            0x7f;

        const effectDuration =
            byte1 &
            0x7f;

        const hue =
            (
                (
                    byte1 >>
                    7
                ) <<
                8
            ) |
            payload[
                offset + 2
            ];

        const packedHigh =
            payload[
                offset + 3
            ];

        const saturation =
            (
                (
                    packedHigh >>
                    6
                ) &
                0x03
            ) <<
                8 |
            payload[
                offset + 4
            ];

        const value =
            (
                (
                    packedHigh >>
                    4
                ) &
                0x03
            ) <<
                8 |
            payload[
                offset + 5
            ];

        const brightness =
            (
                (
                    packedHigh >>
                    2
                ) &
                0x03
            ) <<
                8 |
            payload[
                offset + 6
            ];

        const colorTemp =
            (
                packedHigh &
                0x03
            ) <<
                8 |
            payload[
                offset + 7
            ];

        if (
            firstEffect ===
            undefined
        ) {
            firstEffect =
                effect;

            firstSpeed =
                Math.round(
                    (
                        transitionTime +
                        effectDuration
                    ) /
                    2,
                );
        }

        const white =
            brightness !== 0 ||
            colorTemp !== 0;

        points.push(
            createScenePoint({
                enabled:
                    true,

                mode:
                    white ?
                        'white' :
                        'color',

                hue:
                    hue,

                saturation:
                    Math.round(
                        clamp(
                            saturation,
                            0,
                            1000,
                        ) /
                        10,
                    ),

                brightness:
                    Math.round(
                        clamp(
                            white ?
                                brightness :
                                value,
                            0,
                            1000,
                        ) /
                        10,
                    ),

                colorTemp:
                    Math.round(
                        clamp(
                            colorTemp,
                            0,
                            1000,
                        ) /
                        10,
                    ),
            }),
        );
    }

    while (
        points.length <
        SCENE_MAX_POINTS
    ) {
        points.push(
            createScenePoint(),
        );
    }

    return {
        sceneId,

        scene: {
            name:
                SCENE_NAMES[
                    sceneId
                ],

            effect:
                firstEffect ??
                'static',

            speed:
                firstSpeed ??
                0,

            points,
        },
    };
}

function createSceneRuntimeSnapshot(
    sceneId,
    scene,
    selectedPoint,
) {
    return JSON.stringify({
        v: 1,
        sceneId,
        selectedPoint,
        scene: {
            name:
                SCENE_NAMES[sceneId],

            effect:
                scene.effect,

            speed:
                scene.speed,

            points:
                scene.points.map(
                    cloneScenePoint,
                ),
        },
    });
}

function hydrateSceneEditorFromState(
    editor,
    state,
) {
    if (editor.hydratedFromState) {
        return;
    }

    const raw =
        state?.scene_runtime_snapshot;

    if (
        typeof raw !== 'string' ||
        raw.length === 0
    ) {
        return;
    }

    let snapshot;

    try {
        snapshot =
            JSON.parse(raw);
    } catch {
        return;
    }

    if (
        snapshot?.v !== 1 ||
        !Number.isInteger(
            snapshot.sceneId,
        ) ||
        snapshot.sceneId < 0 ||
        snapshot.sceneId >=
            SCENE_NAMES.length ||
        !snapshot.scene ||
        !Array.isArray(
            snapshot.scene.points,
        )
    ) {
        return;
    }

    const sceneId =
        snapshot.sceneId;

    const scene =
        createScenePreset(
            SCENE_NAMES[sceneId],
            Object.prototype
                .hasOwnProperty.call(
                    SCENE_EFFECT,
                    snapshot.scene.effect,
                ) ?
                snapshot.scene.effect :
                'static',
            Math.round(
                clamp(
                    snapshot.scene.speed,
                    0,
                    100,
                ),
            ),
            snapshot.scene.points,
        );

    editor.selected =
        sceneId;

    editor.saved[
        sceneId
    ] =
        cloneScene(scene);

    editor.draft[
        sceneId
    ] =
        cloneScene(scene);

    editor.selectedPoint =
        Math.max(
            0,
            Math.min(
                SCENE_MAX_POINTS - 1,
                Number.isInteger(
                    snapshot.selectedPoint,
                ) ?
                    snapshot.selectedPoint :
                    0,
            ),
        );

    editor.dirty.delete(
        sceneId,
    );

    editor.hydratedFromState =
        true;
}


function sceneAttributeToBuffer(value) {
    if (Buffer.isBuffer(value)) {
        return Buffer.from(value);
    }

    if (Array.isArray(value)) {
        return Buffer.from(value);
    }

    if (
        value &&
        Array.isArray(value.elements)
    ) {
        return Buffer.from(
            value.elements,
        );
    }

    if (
        value &&
        value.value !== undefined
    ) {
        return sceneAttributeToBuffer(
            value.value,
        );
    }

    return undefined;
}

function applyDecodedSceneToRuntime(
    runtime,
    decoded,
) {
    const editor =
        getSceneEditor(
            runtime,
        );

    const sceneId =
        decoded.sceneId;

    editor.hydratedFromState =
        true;

    editor.selected =
        sceneId;

    if (
        editor.pendingSaveSceneId ===
        sceneId
    ) {
        editor.saved[
            sceneId
        ] =
            cloneScene(
                decoded.scene,
            );

        editor.draft[
            sceneId
        ] =
            cloneScene(
                decoded.scene,
            );

        editor.pendingSaveSceneId =
            undefined;

        editor.pendingPreviewSceneId =
            undefined;

        editor.dirty.delete(
            sceneId,
        );
    } else if (
        editor.pendingPreviewSceneId ===
        sceneId
    ) {
        editor.draft[
            sceneId
        ] =
            cloneScene(
                decoded.scene,
            );

        editor.pendingPreviewSceneId =
            undefined;
    } else {
        editor.saved[
            sceneId
        ] =
            cloneScene(
                decoded.scene,
            );

        if (
            !editor.dirty.has(
                sceneId,
            )
        ) {
            editor.draft[
                sceneId
            ] =
                cloneScene(
                    decoded.scene,
                );
        }
    }

    editor.selectedPoint =
        Math.min(
            editor.selectedPoint,
            Math.max(
                0,
                getScenePointCount(
                    editor.draft[
                        sceneId
                    ],
                ) - 1,
            ),
        );

    return sceneToPublishedState(
        sceneId,
        editor.draft[
            sceneId
        ],
        editor.selectedPoint,
    );
}

function decodeAndApplyScenePayload(
    runtime,
    payload,
) {
    const decoded =
        decodeScenePayload(
            Buffer.from(payload),
        );

    return applyDecodedSceneToRuntime(
        runtime,
        decoded,
    );
}

async function readSceneFromDevice(
    entity,
    runtime,
) {
    let response;

    try {
        response =
            await entity.read(
                'lightingColorCtrl',
                [
                    'tuyaSceneData',
                ],
            );
    } catch {
        try {
            response =
                await entity.read(
                    'lightingColorCtrl',
                    [
                        0xf003,
                    ],
                );
        } catch {
            return undefined;
        }
    }

    const value =
        response?.tuyaSceneData ??
        response?.[0xf003] ??
        response?.[61443] ??
        response?.['61443'];

    const payload =
        sceneAttributeToBuffer(
            value,
        );

    if (
        !payload ||
        payload.length < 10
    ) {
        return undefined;
    }

    try {
        return decodeAndApplyScenePayload(
            runtime,
            payload,
        );
    } catch {
        return undefined;
    }
}

function sceneToPublishedState(
    sceneId,
    scene,
    selectedPoint = 0,
) {
    const index =
        Math.max(
            0,
            Math.min(
                SCENE_MAX_POINTS - 1,
                Number(selectedPoint) || 0,
            ),
        );

    const point =
        scene.points[index] ??
        createScenePoint();

    return {
        scene_selected:
            SCENE_NAMES[sceneId],

        scene_effect:
            scene.effect,

        scene_speed:
            scene.speed,

        scene_point_selected:
            String(index + 1),

        scene_point_enabled:
            point.enabled ? 'ON' : 'OFF',

        scene_point_mode:
            point.mode,

        scene_point_hue:
            point.hue,

        scene_point_saturation:
            point.saturation,

        scene_point_brightness:
            point.brightness,

        scene_point_color_temp:
            point.colorTemp,

        state_scene_point:
            point.enabled ? 'ON' : 'OFF',

        brightness_scene_point:
            Math.round(
                clamp(
                    point.brightness,
                    0,
                    100,
                ) *
                254 /
                100,
            ),

        color_temp_scene_point:
            colorTempPercentToMired(
                point.colorTemp,
            ),

        color_scene_point:
            tuyaHsvToXy(
                point.hue,
                clamp(
                    point.saturation,
                    0,
                    100,
                ) * 10,
                1000,
            ),

        color_mode_scene_point:
            point.mode === 'color' ?
                'xy' :
                'color_temp',

        /*
         * Internal persisted Scene snapshot.
         *
         * This key intentionally has no expose. Zigbee2MQTT keeps it in the
         * device state so the converter can rebuild the complete active Scene
         * after a restart instead of falling back to DEFAULT_SCENES.
         */
        scene_runtime_snapshot:
            createSceneRuntimeSnapshot(
                sceneId,
                scene,
                index,
            ),
    };
}

function getScenePointCount(scene) {
    return countEnabledScenePoints(scene);
}

function enableScenePointsThrough(scene, index) {
    const target = Math.max(
        0,
        Math.min(
            SCENE_MAX_POINTS - 1,
            Number(index) || 0,
        ),
    );

    for (let current = 0; current <= target; current++) {
        scene.points[current].enabled = true;
    }
}

function removeScenePoint(scene, index) {
    const enabledPoints = getEnabledScenePoints(scene).map(cloneScenePoint);

    if (enabledPoints.length <= SCENE_MIN_POINTS) {
        throw new Error(
            'At least one Scene point must remain enabled',
        );
    }

    const removeIndex = Math.max(
        0,
        Math.min(
            enabledPoints.length - 1,
            Number(index) || 0,
        ),
    );

    enabledPoints.splice(removeIndex, 1);
    scene.points = [];

    for (let current = 0; current < SCENE_MAX_POINTS; current++) {
        if (current < enabledPoints.length) {
            const point = cloneScenePoint(enabledPoints[current]);
            point.enabled = true;
            scene.points.push(point);
        } else {
            scene.points.push(createScenePoint());
        }
    }
}

async function sendSceneState(
    entity,
    sceneId,
    scene,
) {
    await entity.command(
        'lightingColorCtrl',
        'tuyaSetModeRaw',
        {
            mode:
                2,
        },
        {
            disableDefaultResponse:
                true,
        },
    );

    await entity.command(
        'lightingColorCtrl',
        'tuyaSceneRaw',
        {
            data:
                encodeScenePayload(
                    sceneId,
                    scene,
                ),
        },
        {
            disableDefaultResponse:
                true,
        },
    );
}

async function sendScenePreview(
    entity,
    editor,
    sceneId,
    scene,
) {
    editor.pendingPreviewSceneId =
        sceneId;

    await sendSceneState(
        entity,
        sceneId,
        scene,
    );
}

const SCENE_KEYS = [
    'scene_selected',
    'scene_effect',
    'scene_speed',
    'scene_save',
    'scene_discard',
    'scene_reset',
    'scene_point_selected',
    'scene_point_enabled',
    'scene_point_mode',
    'scene_point_hue',
    'scene_point_saturation',
    'scene_point_brightness',
    'scene_point_color_temp',
];

const tzSceneSingle = {
    key: SCENE_KEYS,

    convertSet: async (entity, key, value, meta) => {
        if (!isSceneSupported(meta, entity)) {
            throw new Error(
                `TS0505B Scene protocol is not enabled for '${getManufacturerName(meta, entity) ?? 'unknown manufacturer'}'`,
            );
        }

        const runtime = getRuntimeFromMeta(meta, entity);
        const editor = getSceneEditor(runtime);

        /*
         * Rebuild the complete active Scene once after a Zigbee2MQTT restart.
         * The snapshot contains effect, speed and all eight point records, so
         * the first edit cannot fall back to the built-in Night/Dazzling
         * defaults while the UI still shows the persisted Scene state.
         */
        hydrateSceneEditorFromState(
            editor,
            meta?.state,
        );

        if (
            !editor.hydratedFromState
        ) {
            await readSceneFromDevice(
                entity,
                runtime,
            );
        }

        /*
         * If the device did not answer the F003 read, at least keep the
         * selected Scene aligned with Zigbee2MQTT's persisted visible state.
         * We intentionally do not fabricate missing point data.
         */
        if (
            !editor.hydratedFromState &&
            key !== 'scene_selected' &&
            typeof meta?.state?.scene_selected ===
                'string' &&
            SCENE_NAMES.includes(
                meta.state.scene_selected,
            )
        ) {
            editor.selected =
                getSceneIndexByName(
                    meta.state.scene_selected,
                );

            const publishedPoint =
                Number(
                    meta?.state?.scene_point_selected,
                );

            if (
                Number.isInteger(
                    publishedPoint,
                ) &&
                publishedPoint >= 1 &&
                publishedPoint <=
                    SCENE_MAX_POINTS
            ) {
                editor.selectedPoint =
                    publishedPoint - 1;
            }
        }

        if (key === 'scene_selected') {
            const sceneId = getSceneIndexByName(value);
            editor.selected = sceneId;

            const scene = editor.draft[sceneId];
            const count = getScenePointCount(scene);
            editor.selectedPoint = Math.min(
                editor.selectedPoint,
                Math.max(0, count - 1),
            );

            await sendScenePreview(entity, editor, sceneId, scene);

            return {
                state: sceneToPublishedState(
                    sceneId,
                    scene,
                    editor.selectedPoint,
                ),
            };
        }

        const sceneId = editor.selected;

        if (key === 'scene_save') {
            if (String(value) !== 'save') return;

            const draft = editor.draft[sceneId];
            if (countEnabledScenePoints(draft) < SCENE_MIN_POINTS) {
                throw new Error('At least one Scene point must be enabled');
            }

            editor.pendingPreviewSceneId = undefined;
            editor.pendingSaveSceneId = sceneId;
            await sendSceneState(entity, sceneId, draft);

            return {
                state: sceneToPublishedState(
                    sceneId,
                    draft,
                    editor.selectedPoint,
                ),
            };
        }

        if (key === 'scene_discard') {
            if (String(value) !== 'discard') return;

            editor.draft[sceneId] = cloneScene(editor.saved[sceneId]);
            editor.dirty.delete(sceneId);

            const draft = editor.draft[sceneId];
            editor.selectedPoint = Math.min(
                editor.selectedPoint,
                Math.max(0, getScenePointCount(draft) - 1),
            );

            await sendScenePreview(entity, editor, sceneId, draft);

            return {
                state: sceneToPublishedState(
                    sceneId,
                    draft,
                    editor.selectedPoint,
                ),
            };
        }

        if (key === 'scene_reset') {
            if (String(value) !== 'reset') return;

            editor.draft[sceneId] = cloneScene(DEFAULT_SCENES[sceneId]);
            editor.dirty.add(sceneId);

            const draft = editor.draft[sceneId];
            editor.selectedPoint = Math.min(
                editor.selectedPoint,
                Math.max(0, getScenePointCount(draft) - 1),
            );

            await sendScenePreview(entity, editor, sceneId, draft);

            return {
                state: sceneToPublishedState(
                    sceneId,
                    draft,
                    editor.selectedPoint,
                ),
            };
        }

        const draft = editor.draft[sceneId];

        if (key === 'scene_point_selected') {
            const selected = Number(value) - 1;
            if (
                !Number.isInteger(selected) ||
                selected < 0 ||
                selected >= SCENE_MAX_POINTS
            ) {
                throw new Error(`Invalid Scene point '${value}'`);
            }

            /*
             * Selecting an editor point must never modify the Scene itself.
             * Do not enable points, mark the Scene dirty, or send a preview.
             * It only changes which point is shown by the shared point editor.
             */
            editor.selectedPoint = selected;

            return {
                state: sceneToPublishedState(
                    sceneId,
                    draft,
                    editor.selectedPoint,
                ),
            };
        }

        if (key === 'scene_effect') {
            if (!Object.prototype.hasOwnProperty.call(SCENE_EFFECT, value)) {
                throw new Error(`Invalid Scene effect '${value}'`);
            }
            draft.effect = value;
            editor.dirty.add(sceneId);
        }

        if (key === 'scene_speed') {
            draft.speed = Math.round(clamp(value, 0, 100));
            editor.dirty.add(sceneId);
        }

        if (key === 'scene_point_enabled') {
            const enabled = value === 'ON' || value === true;
            const count = getScenePointCount(draft);
            const point = draft.points[editor.selectedPoint];

            if (enabled) {
                if (!point.enabled) {
                    /*
                     * Scene points are transmitted as a compact ordered list.
                     * Therefore a new point may only be appended directly after
                     * the current last point. This avoids silently enabling all
                     * intermediate points.
                     */
                    if (editor.selectedPoint !== count) {
                        throw new Error(
                            `Scene point ${editor.selectedPoint + 1} cannot be enabled yet. ` +
                            `Enable point ${count + 1} first.`,
                        );
                    }

                    point.enabled = true;
                }
            } else {
                if (point.enabled) {
                    removeScenePoint(draft, editor.selectedPoint);

                    editor.selectedPoint = Math.min(
                        editor.selectedPoint,
                        Math.max(0, getScenePointCount(draft) - 1),
                    );
                }
            }

            editor.dirty.add(sceneId);
        }

        if (
            key === 'scene_point_mode' ||
            key === 'scene_point_hue' ||
            key === 'scene_point_saturation' ||
            key === 'scene_point_brightness' ||
            key === 'scene_point_color_temp' ||
            key === 'scene_point_color_xy' ||
            key === 'scene_point_color_temp_light'
        ) {
            const point = draft.points[editor.selectedPoint];

            if (!point.enabled) {
                throw new Error(
                    `Scene point ${editor.selectedPoint + 1} is disabled. ` +
                    `Enable it before editing.`,
                );
            }

            if (key === 'scene_point_mode') {
                if (value !== 'color' && value !== 'white') {
                    throw new Error(`Invalid Scene point mode '${value}'`);
                }
                point.mode = value;
            } else if (key === 'scene_point_hue') {
                point.hue = Math.round(clamp(value, 0, 360));
            } else if (key === 'scene_point_saturation') {
                point.saturation = Math.round(clamp(value, 0, 100));
            } else if (key === 'scene_point_brightness') {
                point.brightness = Math.round(clamp(value, 0, 100));
            } else if (key === 'scene_point_color_temp') {
                point.colorTemp = Math.round(clamp(value, 0, 100));
            } else if (key === 'scene_point_color_xy') {
                if (
                    !value ||
                    !Number.isFinite(Number(value.hue)) ||
                    !Number.isFinite(Number(value.saturation))
                ) {
                    throw new Error(
                        `Invalid Scene point color ${JSON.stringify(value)}`,
                    );
                }

                point.mode = 'color';
                point.hue = Math.round(
                    clamp(
                        value.hue,
                        0,
                        360,
                    ),
                );
                point.saturation = Math.round(
                    clamp(
                        value.saturation,
                        0,
                        100,
                    ),
                );
            } else if (key === 'scene_point_color_temp_light') {
                point.mode = 'white';
                point.colorTemp = Math.round(
                    clamp(
                        value,
                        0,
                        100,
                    ),
                );
            }

            editor.dirty.add(sceneId);
        }

        await sendScenePreview(entity, editor, sceneId, draft);

        return {
            state: sceneToPublishedState(
                sceneId,
                draft,
                editor.selectedPoint,
            ),
        };
    },
};

const tzScene = {
    key:
        SCENE_KEYS,

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        return runForGroupMembers(
            entity,
            meta,
            async (
                target,
                targetMeta,
            ) =>
                tzSceneSingle
                    .convertSet(
                        target,
                        key,
                        value,
                        targetMeta,
                    ),
        );
    },
};

/*
 * ============================================================================
 * Rhythm data model
 * ============================================================================
 */

function cloneRhythmSlot(slot) {
    return {
        name:
            String(
                slot.name,
            ),

        enabled:
            Boolean(
                slot.enabled,
            ),

        hour:
            slot.hour,

        minute:
            slot.minute,

        reserved:
            Array.isArray(
                slot.reserved,
            ) ?
                [...slot.reserved] :
                [0, 0, 0, 0],

        brightness:
            slot.brightness,

        colorTemp:
            slot.colorTemp,
    };
}

function createDefaultRhythmState(
    enabled = false,
) {
    return {
        enabled,

        mode:
            'linear_1',

        days:
            RHYTHM_ALL_DAYS,

        slots:
            DEFAULT_RHYTHM_SLOTS.map(
                cloneRhythmSlot,
            ),
    };
}

function cloneRhythmState(state) {
    return {
        enabled:
            Boolean(
                state.enabled,
            ),

        mode:
            state.mode,

        days:
            state.days,

        slots:
            state.slots.map(
                cloneRhythmSlot,
            ),
    };
}

function createRhythmEditor() {
    const initial =
        createDefaultRhythmState(
            false,
        );

    return {
        saved:
            cloneRhythmState(
                initial,
            ),

        draft:
            cloneRhythmState(
                initial,
            ),

        dirty:
            false,

        pendingSave:
            false,

        pendingEnabledIndexes:
            undefined,

        metaSynced:
            false,
    };
}

function getRhythmEditor(runtime) {
    if (!runtime.rhythm) {
        runtime.rhythm =
            createRhythmEditor();
    }

    return runtime.rhythm;
}

function countEnabledRhythms(state) {
    return state.slots.reduce(
        (
            count,
            slot,
        ) =>
            count +
            (
                slot.enabled ?
                    1 :
                    0
            ),
        0,
    );
}

function getEnabledRhythmIndexes(
    state,
) {
    const result = [];

    for (
        let index = 0;
        index <
            state.slots.length;
        index++
    ) {
        if (
            state
                .slots[
                    index
                ]
                .enabled
        ) {
            result.push(
                index,
            );
        }
    }

    return result;
}

function formatTime(
    hour,
    minute,
) {
    return (
        String(hour)
            .padStart(
                2,
                '0',
            ) +
        ':' +
        String(minute)
            .padStart(
                2,
                '0',
            )
    );
}

function parseTime(value) {
    const match =
        /^(\d{1,2}):(\d{2})$/
            .exec(
                String(value)
                    .trim(),
            );

    if (!match) {
        throw new Error(
            `Invalid Rhythm time '${value}'`,
        );
    }

    const hour =
        Number(
            match[1],
        );

    const minute =
        Number(
            match[2],
        );

    if (
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour > 23 ||
        !Number.isInteger(minute) ||
        minute < 0 ||
        minute > 59
    ) {
        throw new Error(
            `Invalid Rhythm time '${value}'`,
        );
    }

    return {
        hour,
        minute,
    };
}

function requireEnabledRhythm(
    state,
    index,
) {
    const slot =
        state.slots[
            index
        ];

    if (!slot) {
        throw new Error(
            `Rhythm ${index + 1} does not exist`,
        );
    }

    if (!slot.enabled) {
        throw new Error(
            `Rhythm ${index + 1} is disabled. Enable it before editing or previewing it.`,
        );
    }

    return slot;
}

/*
 * ============================================================================
 * Rhythm retained-state bootstrap
 * ============================================================================
 */

function syncRhythmEditorFromMeta(
    runtime,
    meta,
) {
    const editor =
        getRhythmEditor(
            runtime,
        );

    if (
        editor.metaSynced ||
        !meta?.state
    ) {
        return;
    }

    const state =
        meta.state;

    const apply =
        cloneRhythmState(
            editor.draft,
        );

    if (
        state.rhythm_enabled ===
            'ON' ||
        state.rhythm_enabled ===
            'OFF'
    ) {
        apply.enabled =
            state.rhythm_enabled ===
            'ON';
    }

    if (
        state.rhythm_mode ===
            'linear_1' ||
        state.rhythm_mode ===
            'linear_2'
    ) {
        apply.mode =
            state.rhythm_mode;
    }

    const dayKeys = [
        ['rhythm_sunday', RHYTHM_DAY.sunday],
        ['rhythm_monday', RHYTHM_DAY.monday],
        ['rhythm_tuesday', RHYTHM_DAY.tuesday],
        ['rhythm_wednesday', RHYTHM_DAY.wednesday],
        ['rhythm_thursday', RHYTHM_DAY.thursday],
        ['rhythm_friday', RHYTHM_DAY.friday],
        ['rhythm_saturday', RHYTHM_DAY.saturday],
    ];

    for (
        const [
            key,
            mask,
        ] of dayKeys
    ) {
        if (
            state[key] ===
                'ON'
        ) {
            apply.days |=
                mask;
        } else if (
            state[key] ===
                'OFF'
        ) {
            apply.days &=
                ~mask;
        }
    }

    apply.days &=
        RHYTHM_ALL_DAYS;

    for (
        let index = 0;
        index <
            RHYTHM_MAX_SLOTS;
        index++
    ) {
        const number =
            index + 1;

        const slot =
            apply.slots[
                index
            ];

        const name =
            state[
                `rhythm_${number}_name`
            ];

        if (
            typeof name ===
                'string' &&
            name.trim()
                .length >
                0
        ) {
            slot.name =
                name.trim();
        }

        const enabled =
            state[
                `rhythm_${number}_enabled`
            ];

        if (
            enabled === 'ON' ||
            enabled === 'OFF'
        ) {
            slot.enabled =
                enabled ===
                'ON';
        }

        const time =
            state[
                `rhythm_${number}_time`
            ];

        if (
            typeof time ===
            'string'
        ) {
            try {
                const parsed =
                    parseTime(
                        time,
                    );

                slot.hour =
                    parsed.hour;

                slot.minute =
                    parsed.minute;
            } catch {
                // Ignore invalid retained values.
            }
        }

        const brightness =
            Number(
                state[
                    `rhythm_${number}_brightness`
                ],
            );

        if (
            Number.isFinite(
                brightness,
            )
        ) {
            slot.brightness =
                Math.round(
                    clamp(
                        brightness,
                        0,
                        100,
                    ),
                );
        }

        const colorTemp =
            Number(
                state[
                    `rhythm_${number}_color_temp`
                ],
            );

        if (
            Number.isFinite(
                colorTemp,
            )
        ) {
            slot.colorTemp =
                Math.round(
                    clamp(
                        colorTemp,
                        0,
                        100,
                    ),
                );
        }
    }

    /*
     * Never accept a retained state with fewer than two enabled points.
     */
    if (
        countEnabledRhythms(
            apply,
        ) <
        RHYTHM_MIN_ENABLED
    ) {
        apply.slots[0].enabled =
            true;

        apply.slots[1].enabled =
            true;
    }

    editor.saved =
        cloneRhythmState(
            apply,
        );

    editor.draft =
        cloneRhythmState(
            apply,
        );

    editor.metaSynced =
        true;
}

/*
 * ============================================================================
 * Rhythm encode / decode
 * ============================================================================
 */

function decodeRhythmPayload(payload) {
    if (
        !Buffer.isBuffer(payload) ||
        payload.length < 5
    ) {
        throw new Error(
            'Rhythm payload too short',
        );
    }

    const count =
        payload[4];

    const expectedLength =
        5 +
        count *
        9;

    if (
        payload.length <
        expectedLength
    ) {
        throw new Error(
            'Rhythm payload length mismatch',
        );
    }

    const records = [];

    for (
        let index = 0;
        index < count;
        index++
    ) {
        const offset =
            5 +
            index *
            9;

        records.push({
            enabled:
                payload[
                    offset
                ] !==
                0,

            hour:
                payload[
                    offset + 1
                ],

            minute:
                payload[
                    offset + 2
                ],

            reserved: [
                payload[
                    offset + 3
                ],
                payload[
                    offset + 4
                ],
                payload[
                    offset + 5
                ],
                payload[
                    offset + 6
                ],
            ],

            brightness:
                payload[
                    offset + 7
                ],

            colorTemp:
                payload[
                    offset + 8
                ],
        });
    }

    return {
        enabled:
            payload[1] !==
            0,

        mode:
            RHYTHM_MODE_REVERSE[
                payload[2]
            ],

        days:
            payload[3],

        records,
    };
}

function applyDecodedRhythmToState(
    decoded,
    baseState,
    enabledIndexes,
) {
    const result =
        cloneRhythmState(
            baseState,
        );

    result.enabled =
        decoded.enabled;

    result.mode =
        decoded.mode;

    result.days =
        decoded.days;

    let indexes =
        enabledIndexes;

    if (
        !Array.isArray(indexes) ||
        indexes.length !==
            decoded.records.length
    ) {
        const currentIndexes =
            getEnabledRhythmIndexes(
                result,
            );

        if (
            currentIndexes.length ===
            decoded.records.length
        ) {
            indexes =
                currentIndexes;
        }
    }

    if (
        !Array.isArray(indexes) ||
        indexes.length !==
            decoded.records.length
    ) {
        indexes =
            decoded.records.map(
                (
                    record,
                    index,
                ) =>
                    index,
            );

        for (
            let index = 0;
            index <
                RHYTHM_MAX_SLOTS;
            index++
        ) {
            result
                .slots[
                    index
                ]
                .enabled =
                false;
        }

        for (
            const index of
            indexes
        ) {
            if (
                result.slots[index]
            ) {
                result
                    .slots[
                        index
                    ]
                    .enabled =
                    true;
            }
        }
    }

    for (
        let recordIndex = 0;
        recordIndex <
            decoded.records.length;
        recordIndex++
    ) {
        const slotIndex =
            indexes[
                recordIndex
            ];

        const source =
            decoded.records[
                recordIndex
            ];

        const target =
            result.slots[
                slotIndex
            ];

        if (!target) {
            continue;
        }

        target.enabled =
            true;

        target.hour =
            source.hour;

        target.minute =
            source.minute;

        target.reserved =
            [...source.reserved];

        target.brightness =
            source.brightness;

        target.colorTemp =
            source.colorTemp;
    }

    return result;
}

function encodeRhythmPayload(state) {
    const enabledSlots =
        state.slots.filter(
            (slot) =>
                slot.enabled,
        );

    if (
        enabledSlots.length <
        RHYTHM_MIN_ENABLED
    ) {
        throw new Error(
            `At least ${RHYTHM_MIN_ENABLED} Rhythm points must be enabled`,
        );
    }

    const mode =
        RHYTHM_MODE[
            state.mode
        ];

    if (
        mode ===
        undefined
    ) {
        throw new Error(
            `Invalid Rhythm mode '${state.mode}'`,
        );
    }

    const payload = [
        0x00,

        state.enabled ?
            1 :
            0,

        mode,

        state.days &
            RHYTHM_ALL_DAYS,

        enabledSlots.length,
    ];

    for (
        const slot of
        enabledSlots
    ) {
        const reserved =
            Array.isArray(
                slot.reserved,
            ) &&
            slot.reserved.length ===
                4 ?
                slot.reserved :
                [0, 0, 0, 0];

        payload.push(
            0x01,

            Math.round(
                clamp(
                    slot.hour,
                    0,
                    23,
                ),
            ),

            Math.round(
                clamp(
                    slot.minute,
                    0,
                    59,
                ),
            ),

            reserved[0] &
                0xff,

            reserved[1] &
                0xff,

            reserved[2] &
                0xff,

            reserved[3] &
                0xff,

            Math.round(
                clamp(
                    slot.brightness,
                    0,
                    100,
                ),
            ),

            Math.round(
                clamp(
                    slot.colorTemp,
                    0,
                    100,
                ),
            ),
        );
    }

    return Buffer.from(
        payload,
    );
}

function rhythmToPublishedState(
    state,
    includeNames = true,
) {
    const result = {
        rhythm_enabled:
            state.enabled ?
                'ON' :
                'OFF',

        rhythm_mode:
            state.mode,

        rhythm_sunday:
            (
                state.days &
                RHYTHM_DAY.sunday
            ) !== 0 ?
                'ON' :
                'OFF',

        rhythm_monday:
            (
                state.days &
                RHYTHM_DAY.monday
            ) !== 0 ?
                'ON' :
                'OFF',

        rhythm_tuesday:
            (
                state.days &
                RHYTHM_DAY.tuesday
            ) !== 0 ?
                'ON' :
                'OFF',

        rhythm_wednesday:
            (
                state.days &
                RHYTHM_DAY.wednesday
            ) !== 0 ?
                'ON' :
                'OFF',

        rhythm_thursday:
            (
                state.days &
                RHYTHM_DAY.thursday
            ) !== 0 ?
                'ON' :
                'OFF',

        rhythm_friday:
            (
                state.days &
                RHYTHM_DAY.friday
            ) !== 0 ?
                'ON' :
                'OFF',

        rhythm_saturday:
            (
                state.days &
                RHYTHM_DAY.saturday
            ) !== 0 ?
                'ON' :
                'OFF',
    };

    for (
        let index = 0;
        index <
            RHYTHM_MAX_SLOTS;
        index++
    ) {
        const number =
            index + 1;

        const slot =
            state.slots[
                index
            ];

        if (includeNames) {
            result[
                `rhythm_${number}_name`
            ] =
                slot.name;
        }

        result[
            `rhythm_${number}_enabled`
        ] =
            slot.enabled ?
                'ON' :
                'OFF';

        result[
            `rhythm_${number}_time`
        ] =
            formatTime(
                slot.hour,
                slot.minute,
            );

        result[
            `rhythm_${number}_brightness`
        ] =
            slot.brightness;

        result[
            `rhythm_${number}_color_temp`
        ] =
            slot.colorTemp;
    }

    return result;
}

async function sendRhythmState(
    entity,
    state,
    meta,
) {
    const payload =
        encodeRhythmPayload(
            state,
        );

    /*
     * The E14 _TZ3210_ifga63rg sniff confirms the same transport
     * already used by the working E27 _TZ3210_bfwvfyx1 variant:
     * lightingColorCtrl vendor command 0xF6 with the raw
     * 5 + N*9 Rhythm payload.
     *
     * Attribute 0xF009 is the lamp's report/confirmation path.
     * It is not writable on the E14 variant.
     */
    await entity.command(
        'lightingColorCtrl',
        'tuyaRhythmRaw',
        {
            data:
                payload,
        },
        {
            disableDefaultResponse:
                true,
        },
    );
}

/*
 * ============================================================================
 * Rhythm preview
 * ============================================================================
 */

async function executeRhythmPreview(
    entity,
    runtime,
    slot,
    meta,
) {
    if (!slot.enabled) {
        throw new Error(
            'Disabled Rhythm points cannot be previewed',
        );
    }

    if (
        getManufacturerName(
            meta,
            entity,
        ) ===
        '_TZ3210_ifga63rg'
    ) {
        syncPreviewCacheFromMeta(
            runtime,
            meta,
        );
    }

    setSavedPreviewState(
        runtime,
    );

    await sendPhysicalState(
        entity,
        'ON',
    );

    await sendPhysicalColorTemp(
        entity,
        colorTempPercentToMired(
            slot.colorTemp,
        ),
    );

    await sendPhysicalBrightness(
        entity,
        Math.round(
            clamp(
                slot.brightness,
                0,
                100,
            ) *
            254 /
            100,
        ),
    );

    restartPreviewTimer(
        entity,
        runtime,
    );
}

/*
 * ============================================================================
 * Rhythm TX
 * ============================================================================
 */

const tzRhythmSingle = {
    key: [
        'rhythm_enabled',
        'rhythm_mode',

        'rhythm_save',
        'rhythm_discard',
        'rhythm_reset',

        'rhythm_sunday',
        'rhythm_monday',
        'rhythm_tuesday',
        'rhythm_wednesday',
        'rhythm_thursday',
        'rhythm_friday',
        'rhythm_saturday',

        'rhythm_1_name',
        'rhythm_1_enabled',
        'rhythm_1_time',
        'rhythm_1_brightness',
        'rhythm_1_color_temp',

        'rhythm_2_name',
        'rhythm_2_enabled',
        'rhythm_2_time',
        'rhythm_2_brightness',
        'rhythm_2_color_temp',

        'rhythm_3_name',
        'rhythm_3_enabled',
        'rhythm_3_time',
        'rhythm_3_brightness',
        'rhythm_3_color_temp',

        'rhythm_4_name',
        'rhythm_4_enabled',
        'rhythm_4_time',
        'rhythm_4_brightness',
        'rhythm_4_color_temp',

        'rhythm_5_name',
        'rhythm_5_enabled',
        'rhythm_5_time',
        'rhythm_5_brightness',
        'rhythm_5_color_temp',

        'rhythm_6_name',
        'rhythm_6_enabled',
        'rhythm_6_time',
        'rhythm_6_brightness',
        'rhythm_6_color_temp',

        'rhythm_7_name',
        'rhythm_7_enabled',
        'rhythm_7_time',
        'rhythm_7_brightness',
        'rhythm_7_color_temp',

        'rhythm_8_name',
        'rhythm_8_enabled',
        'rhythm_8_time',
        'rhythm_8_brightness',
        'rhythm_8_color_temp',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        const runtime =
            getRuntimeFromMeta(
                meta,
                entity,
            );

        syncRhythmEditorFromMeta(
            runtime,
            meta,
        );

        const editor =
            getRhythmEditor(
                runtime,
            );

        if (
            key ===
            'rhythm_save'
        ) {
            if (
                String(value) !==
                'save'
            ) {
                return;
            }

            const enabledIndexes =
                getEnabledRhythmIndexes(
                    editor.draft,
                );

            if (
                enabledIndexes.length <
                RHYTHM_MIN_ENABLED
            ) {
                throw new Error(
                    `At least ${RHYTHM_MIN_ENABLED} Rhythm points must be enabled`,
                );
            }

            await restorePreviewNow(
                entity,
                runtime,
            );

            await sendRhythmState(
                entity,
                editor.draft,
                meta,
            );

            editor.pendingEnabledIndexes =
                [...enabledIndexes];

            editor.pendingSave =
                true;

            editor.dirty =
                false;

            return {
                state:
                    rhythmToPublishedState(
                        editor.draft,
                        true,
                    ),
            };
        }

        if (
            key ===
            'rhythm_discard'
        ) {
            if (
                String(value) !==
                'discard'
            ) {
                return;
            }

            if (
                editor.pendingSave
            ) {
                throw new Error(
                    'Rhythm save is waiting for F009 confirmation',
                );
            }

            await restorePreviewNow(
                entity,
                runtime,
            );

            editor.draft =
                cloneRhythmState(
                    editor.saved,
                );

            editor.dirty =
                false;

            return {
                state:
                    rhythmToPublishedState(
                        editor.draft,
                        true,
                    ),
            };
        }

        if (
            key ===
            'rhythm_reset'
        ) {
            if (
                String(value) !==
                'reset'
            ) {
                return;
            }

            const globalEnabled =
                editor
                    .draft
                    .enabled;

            editor.draft =
                createDefaultRhythmState(
                    globalEnabled,
                );

            editor.dirty =
                true;

            return {
                state:
                    rhythmToPublishedState(
                        editor.draft,
                        true,
                    ),
            };
        }

        const draft =
            editor.draft;

        if (
            key ===
            'rhythm_enabled'
        ) {
            draft.enabled =
                value === 'ON' ||
                value === true;

            editor.dirty =
                true;
        }

        if (
            key ===
            'rhythm_mode'
        ) {
            if (
                value !==
                    'linear_1' &&
                value !==
                    'linear_2'
            ) {
                throw new Error(
                    `Invalid Rhythm mode '${value}'`,
                );
            }

            draft.mode =
                value;

            editor.dirty =
                true;
        }

        const dayMap = {
            rhythm_sunday:
                RHYTHM_DAY.sunday,

            rhythm_monday:
                RHYTHM_DAY.monday,

            rhythm_tuesday:
                RHYTHM_DAY.tuesday,

            rhythm_wednesday:
                RHYTHM_DAY.wednesday,

            rhythm_thursday:
                RHYTHM_DAY.thursday,

            rhythm_friday:
                RHYTHM_DAY.friday,

            rhythm_saturday:
                RHYTHM_DAY.saturday,
        };

        if (
            dayMap[key] !==
            undefined
        ) {
            if (
                value === 'ON' ||
                value === true
            ) {
                draft.days |=
                    dayMap[key];
            } else {
                draft.days &=
                    ~dayMap[key];
            }

            draft.days &=
                RHYTHM_ALL_DAYS;

            editor.dirty =
                true;
        }

        const match =
            /^rhythm_([1-8])_(name|enabled|time|brightness|color_temp)$/
                .exec(key);

        if (match) {
            const index =
                Number(
                    match[1],
                ) -
                1;

            const property =
                match[2];

            const slot =
                draft.slots[
                    index
                ];

            if (!slot) {
                throw new Error(
                    `Rhythm ${index + 1} does not exist`,
                );
            }

            if (
                property ===
                'enabled'
            ) {
                const enabled =
                    value === 'ON' ||
                    value === true;

                if (
                    !enabled &&
                    slot.enabled &&
                    countEnabledRhythms(
                        draft,
                    ) <=
                        RHYTHM_MIN_ENABLED
                ) {
                    throw new Error(
                        `At least ${RHYTHM_MIN_ENABLED} Rhythm points must remain enabled. Enable another Rhythm point first.`,
                    );
                }

                slot.enabled =
                    enabled;

                editor.dirty =
                    true;

                return {
                    state:
                        rhythmToPublishedState(
                            draft,
                            true,
                        ),
                };
            }

            const enabledSlot =
                requireEnabledRhythm(
                    draft,
                    index,
                );

            if (
                property ===
                'name'
            ) {
                const name =
                    String(value)
                        .trim();

                if (
                    name.length ===
                    0
                ) {
                    throw new Error(
                        'Rhythm name cannot be empty',
                    );
                }

                enabledSlot.name =
                    name;

                editor.dirty =
                    true;
            }

            if (
                property ===
                'time'
            ) {
                const time =
                    parseTime(
                        value,
                    );

                enabledSlot.hour =
                    time.hour;

                enabledSlot.minute =
                    time.minute;

                editor.dirty =
                    true;
            }

            if (
                property ===
                'brightness'
            ) {
                enabledSlot.brightness =
                    Math.round(
                        clamp(
                            value,
                            0,
                            100,
                        ),
                    );

                editor.dirty =
                    true;

                await executeRhythmPreview(
                    entity,
                    runtime,
                    enabledSlot,
                    meta,
                );
            }

            if (
                property ===
                'color_temp'
            ) {
                enabledSlot.colorTemp =
                    Math.round(
                        clamp(
                            value,
                            0,
                            100,
                        ),
                    );

                editor.dirty =
                    true;

                await executeRhythmPreview(
                    entity,
                    runtime,
                    enabledSlot,
                    meta,
                );
            }
        }

        return {
            state:
                rhythmToPublishedState(
                    draft,
                    true,
                ),
        };
    },
};

const tzRhythm = {
    key: [
        'rhythm_enabled',
        'rhythm_mode',

        'rhythm_save',
        'rhythm_discard',
        'rhythm_reset',

        'rhythm_sunday',
        'rhythm_monday',
        'rhythm_tuesday',
        'rhythm_wednesday',
        'rhythm_thursday',
        'rhythm_friday',
        'rhythm_saturday',

        'rhythm_1_name',
        'rhythm_1_enabled',
        'rhythm_1_time',
        'rhythm_1_brightness',
        'rhythm_1_color_temp',

        'rhythm_2_name',
        'rhythm_2_enabled',
        'rhythm_2_time',
        'rhythm_2_brightness',
        'rhythm_2_color_temp',

        'rhythm_3_name',
        'rhythm_3_enabled',
        'rhythm_3_time',
        'rhythm_3_brightness',
        'rhythm_3_color_temp',

        'rhythm_4_name',
        'rhythm_4_enabled',
        'rhythm_4_time',
        'rhythm_4_brightness',
        'rhythm_4_color_temp',

        'rhythm_5_name',
        'rhythm_5_enabled',
        'rhythm_5_time',
        'rhythm_5_brightness',
        'rhythm_5_color_temp',

        'rhythm_6_name',
        'rhythm_6_enabled',
        'rhythm_6_time',
        'rhythm_6_brightness',
        'rhythm_6_color_temp',

        'rhythm_7_name',
        'rhythm_7_enabled',
        'rhythm_7_time',
        'rhythm_7_brightness',
        'rhythm_7_color_temp',

        'rhythm_8_name',
        'rhythm_8_enabled',
        'rhythm_8_time',
        'rhythm_8_brightness',
        'rhythm_8_color_temp',
    ],

    convertSet: async (
        entity,
        key,
        value,
        meta,
    ) => {
        return runForGroupMembers(
            entity,
            meta,
            async (
                target,
                targetMeta,
            ) =>
                tzRhythmSingle
                    .convertSet(
                        target,
                        key,
                        value,
                        targetMeta,
                    ),
        );
    },
};

/*
 * ============================================================================
 * Raw Color Control reports
 * ============================================================================
 */


const fzSceneData = {
    cluster:
        'lightingColorCtrl',

    type: [
        'attributeReport',
        'readResponse',
    ],

    convert: (
        model,
        msg,
    ) => {
        const value =
            msg.data?.tuyaSceneData ??
            msg.data?.[0xf003] ??
            msg.data?.[61443] ??
            msg.data?.['61443'];

        const payload =
            sceneAttributeToBuffer(
                value,
            );

        if (
            !payload ||
            payload.length < 10
        ) {
            return;
        }

        const runtime =
            getRuntimeFromMsg(
                msg,
            );

        try {
            return decodeAndApplyScenePayload(
                runtime,
                payload,
            );
        } catch (error) {
            console.error(
                '[TS0505B] Invalid Scene attribute:',
                error,
            );

            return;
        }
    },
};

const fzColorRaw = {
    cluster:
        'lightingColorCtrl',

    type: [
        'raw',
    ],

    convert: (
        model,
        msg,
    ) => {
        const raw =
            Buffer.from(
                msg.data?.data ??
                msg.data ??
                [],
            );

        if (
            raw.length < 7 ||
            raw[2] !==
                0x0a
        ) {
            return;
        }

        const attributeId =
            raw[3] |
            (
                raw[4] <<
                8
            );

        const dataType =
            raw[5];

        if (
            attributeId ===
                0xf00c &&
            dataType ===
                0x48
        ) {
            const length =
                raw[6];

            if (
                length !== 12 ||
                raw.length <
                    7 +
                    length
            ) {
                return;
            }

            const payload =
                raw.subarray(
                    7,
                    7 +
                    length,
                );

            return processStartupF00C(
                msg,
                payload,
            );
        }

        /*
         * F003 - Scene configuration
         */
        if (
            attributeId ===
                0xf003 &&
            dataType ===
                0x48
        ) {
            const length =
                raw[6];

            if (
                length < 10 ||
                raw.length <
                    7 +
                    length
            ) {
                return;
            }

            const payload =
                raw.subarray(
                    7,
                    7 +
                    length,
                );

            const runtime =
                getRuntimeFromMsg(
                    msg,
                );

            try {
                return decodeAndApplyScenePayload(
                    runtime,
                    payload,
                );
            } catch (error) {
                console.error(
                    '[TS0505B] Invalid Scene report:',
                    error,
                );

                return;
            }
        }

        if (
            attributeId ===
                0xf009 &&
            dataType ===
                0x48
        ) {
            const length =
                raw[6];

            if (
                length < 5 ||
                raw.length <
                    7 +
                    length
            ) {
                return;
            }

            const payload =
                raw.subarray(
                    7,
                    7 +
                    length,
                );

            let decoded;

            try {
                decoded =
                    decodeRhythmPayload(
                        payload,
                    );
            } catch (error) {
                console.error(
                    '[TS0505B] Invalid Rhythm report:',
                    error,
                );

                return;
            }

            if (
                decoded.mode !==
                    'linear_1' &&
                decoded.mode !==
                    'linear_2'
            ) {
                return;
            }

            if (
                decoded.records.length <
                RHYTHM_MIN_ENABLED
            ) {
                return;
            }

            const runtime =
                getRuntimeFromMsg(
                    msg,
                );

            const editor =
                getRhythmEditor(
                    runtime,
                );

            const mapping =
                editor.pendingSave ?
                    editor
                        .pendingEnabledIndexes :
                    undefined;

            const baseState =
                editor.pendingSave ?
                    editor.draft :
                    editor.saved;

            const confirmed =
                applyDecodedRhythmToState(
                    decoded,
                    baseState,
                    mapping,
                );

            editor.saved =
                cloneRhythmState(
                    confirmed,
                );

            if (
                editor.pendingSave
            ) {
                editor.draft =
                    cloneRhythmState(
                        confirmed,
                    );

                editor.pendingSave =
                    false;

                editor.pendingEnabledIndexes =
                    undefined;

                editor.dirty =
                    false;

                return rhythmToPublishedState(
                    editor.draft,
                    true,
                );
            }

            if (
                editor.dirty
            ) {
                return;
            }

            editor.draft =
                cloneRhythmState(
                    confirmed,
                );

            return rhythmToPublishedState(
                editor.draft,
                false,
            );
        }

        return;
    },
};

/*
 * ============================================================================
 * Exposes
 * ============================================================================
 */

function createNormalLightExpose() {
    return e.light()
        .withBrightness()
        .withColorTemp([
            COLOR_TEMP_MIN,
            COLOR_TEMP_MAX,
        ])
        .withColor([
            'xy',
        ])
        .withLabel(
            'Light',
        );
}

function createStartupLightExpose() {
    return e.light()
        .withBrightness()
        .withColorTemp([
            COLOR_TEMP_MIN,
            COLOR_TEMP_MAX,
        ])
        .withColor([
            'xy',
        ])
        .withEndpoint(
            'startup',
        )
        .withLabel(
            'Startup',
        )
        .withDescription(
            'Customized power-on appearance',
        );
}

function createScenePointLightExpose() {
    return e.light()
        .withBrightness()
        .withColorTemp([
            COLOR_TEMP_MIN,
            COLOR_TEMP_MAX,
        ])
        .withColor([
            'xy',
        ])
        .withEndpoint(
            'scene_point',
        )
        .withLabel(
            'Scene point',
        )
        .withDescription(
            'Editor for the currently selected Scene point',
        );
}

function createRhythmSlotExposes(
    index,
) {
    return [
        e.binary(
            `rhythm_${index}_enabled`,
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                `Rhythm ${index} enabled`,
            ),

        e.text(
            `rhythm_${index}_name`,
            ea.STATE_SET,
        )
            .withLabel(
                `Rhythm ${index} name`,
            ),

        e.text(
            `rhythm_${index}_time`,
            ea.STATE_SET,
        )
            .withLabel(
                `Rhythm ${index} time`,
            ),

        e.numeric(
            `rhythm_${index}_brightness`,
            ea.STATE_SET,
        )
            .withLabel(
                `Rhythm ${index} brightness`,
            )
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('%'),

        e.numeric(
            `rhythm_${index}_color_temp`,
            ea.STATE_SET,
        )
            .withLabel(
                `Rhythm ${index} temperature`,
            )
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('%'),
    ];
}

function createSceneExposes() {
    return [
        e.enum(
            'scene_selected',
            ea.STATE_SET,
            SCENE_NAMES,
        ).withLabel('Scene'),

        e.enum(
            'scene_effect',
            ea.STATE_SET,
            ['static', 'flash', 'breath'],
        ).withLabel('Dynamic effect'),

        e.numeric(
            'scene_speed',
            ea.STATE_SET,
        )
            .withLabel('Scene speed')
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('%'),

        e.enum(
            'scene_point_selected',
            ea.STATE_SET,
            ['1', '2', '3', '4', '5', '6', '7', '8'],
        ).withLabel('Scene point'),

        e.binary(
            'scene_point_enabled',
            ea.STATE_SET,
            'ON',
            'OFF',
        ).withLabel('Scene point enabled'),

        e.enum(
            'scene_point_mode',
            ea.STATE_SET,
            ['color', 'white'],
        ).withLabel('Scene point mode'),

        e.numeric(
            'scene_point_hue',
            ea.STATE_SET,
        )
            .withLabel('Scene point hue')
            .withValueMin(0)
            .withValueMax(360)
            .withValueStep(1)
            .withUnit('°'),

        e.numeric(
            'scene_point_saturation',
            ea.STATE_SET,
        )
            .withLabel('Scene point saturation')
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('%'),

        e.numeric(
            'scene_point_brightness',
            ea.STATE_SET,
        )
            .withLabel('Scene point brightness')
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('%'),

        e.numeric(
            'scene_point_color_temp',
            ea.STATE_SET,
        )
            .withLabel('Scene point color temperature')
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('%'),

        e.enum(
            'scene_save',
            ea.SET,
            ['save'],
        ).withLabel('Save Scene'),

        e.enum(
            'scene_discard',
            ea.SET,
            ['discard'],
        ).withLabel('Discard Scene changes'),

        e.enum(
            'scene_reset',
            ea.SET,
            ['reset'],
        ).withLabel('Reset Scene'),
    ];
}


/*
 * ============================================================================
 * Configure
 * ============================================================================
 */

async function configureTuyaMagic(
    device,
) {
    const endpoint =
        device.getEndpoint(1);

    if (!endpoint) {
        throw new Error(
            'TS0505B endpoint 1 not found',
        );
    }

    getLampRuntimeByIeee(
        device.ieeeAddr,
    );

    try {
        await endpoint.read(
            'genBasic',
            [
                0x0004,
                0x0000,
                0x0001,
                0x0005,
                0x0007,
                0xfffe,
            ],
        );
    } catch (error) {
        console.error(
            '[TS0505B] Basic cluster read failed:',
            error,
        );
    }

    try {
        await endpoint.write(
            'genBasic',
            {
                0xffde: {
                    value:
                        0x0d,

                    type:
                        Zcl.DataType
                            .UINT8,
                },
            },
        );
    } catch (error) {
        console.error(
            '[TS0505B] FFDE initialization failed:',
            error,
        );
    }

    /*
     * Rehydrate the complete active Scene after every Zigbee2MQTT restart.
     * The bulb's F003 value is authoritative and contains effect, speed and
     * every active Scene point.
     */
    try {
        await endpoint.read(
            'lightingColorCtrl',
            [
                'tuyaSceneData',
            ],
        );
    } catch {
        try {
            await endpoint.read(
                'lightingColorCtrl',
                [
                    0xf003,
                ],
            );
        } catch {
            // Some firmware revisions do not support explicit F003 reads.
            // The first Scene SET will retry before modifying the draft.
        }
    }
}

/*
 * ============================================================================
 * Definition
 * ============================================================================
 */

const definition = {
    fingerprint: [
        {
            modelID:
                'TS0505B',

            manufacturerName:
                '_TZ3210_bfwvfyx1',
        },
        {
            modelID:
                'TS0505B',

            manufacturerName:
                '_TZ3210_ifga63rg',
        },
    ],

    model:
        'TS0505B_custom',

    vendor:
        'Tuya',

    description:
        'TS0505B RGBCW with startup preview, editable Rhythm, Scene and Do Not Disturb',

    endpoint: () => ({
        default:
            1,

        startup:
            1,

        scene_point:
            1,
    }),

    meta: {
        multiEndpoint:
            true,
    },

    fromZigbee: [
        fzNormalOnOff,
        fzNormalBrightness,
        fzNormalColorMode,
        fzNormalColorTemp,
        fzNormalXy,
        fzDoNotDisturb,
        fzSceneData,
        fzColorRaw,
    ],

    toZigbee: [
        tzLightRouter,
        tzStartupBehavior,
        tzDoNotDisturb,
        tzRhythm,
        tzScene,
    ],

    extend: [
        customLevelCluster,
        customColorCluster,
    ],

    exposes: (device) => {
        const result = [
        createNormalLightExpose(),
        createStartupLightExpose(),

        e.enum(
            'startup_behavior',
            ea.STATE_SET,
            [
                'initial',
                'previous',
                'customized',
            ],
        )
            .withLabel(
                'Startup behavior',
            ),

        e.enum(
            'startup_color_mode',
            ea.STATE,
            [
                'white',
                'color',
            ],
        )
            .withLabel(
                'Startup color mode',
            ),

        e.numeric(
            'startup_color_temp_kelvin',
            ea.STATE,
        )
            .withLabel(
                'Startup color temperature',
            )
            .withUnit(
                'K',
            ),

        e.enum(
            'light_color_mode',
            ea.STATE,
            [
                'white',
                'color',
            ],
        )
            .withLabel(
                'Color mode',
            ),

        e.binary(
            'do_not_disturb',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Do not disturb',
            ),

        e.binary(
            'rhythm_enabled',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Rhythm',
            ),

        e.enum(
            'rhythm_mode',
            ea.STATE_SET,
            [
                'linear_1',
                'linear_2',
            ],
        )
            .withLabel(
                'Rhythm mode',
            ),

        e.enum(
            'rhythm_save',
            ea.SET,
            [
                'save',
            ],
        )
            .withLabel(
                'Save Rhythm',
            ),

        e.enum(
            'rhythm_discard',
            ea.SET,
            [
                'discard',
            ],
        )
            .withLabel(
                'Discard changes',
            ),

        e.enum(
            'rhythm_reset',
            ea.SET,
            [
                'reset',
            ],
        )
            .withLabel(
                'Reset Rhythm',
            ),

        e.binary(
            'rhythm_sunday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Sunday',
            ),

        e.binary(
            'rhythm_monday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Monday',
            ),

        e.binary(
            'rhythm_tuesday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Tuesday',
            ),

        e.binary(
            'rhythm_wednesday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Wednesday',
            ),

        e.binary(
            'rhythm_thursday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Thursday',
            ),

        e.binary(
            'rhythm_friday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Friday',
            ),

        e.binary(
            'rhythm_saturday',
            ea.STATE_SET,
            'ON',
            'OFF',
        )
            .withLabel(
                'Saturday',
            ),

        ...createRhythmSlotExposes(1),
        ...createRhythmSlotExposes(2),
        ...createRhythmSlotExposes(3),
        ...createRhythmSlotExposes(4),
        ...createRhythmSlotExposes(5),
        ...createRhythmSlotExposes(6),
        ...createRhythmSlotExposes(7),
        ...createRhythmSlotExposes(8),
        ];

        if (
            device &&
            SCENE_SUPPORTED_MANUFACTURERS.has(
                device.manufacturerName,
            )
        ) {
            result.push(
                createScenePointLightExpose(),
                ...createSceneExposes(),
            );
        }

        return result;
    },

    configure: async (
        device,
        coordinatorEndpoint,
        logger,
    ) => {
        await configureTuyaMagic(
            device,
        );
    },
};

module.exports =
    definition;
