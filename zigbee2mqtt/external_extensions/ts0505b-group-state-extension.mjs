/*
 * TS0505B custom group state + Home Assistant discovery extension
 *
 * Purpose:
 * - Keep custom TS0505B group state in sync for:
 *     - Do Not Disturb
 *     - Startup
 *     - Rhythm
 *     - Scene
 *     - Scene point virtual light
 * - Create the missing Home Assistant MQTT discovery entities for a Z2M group.
 *
 * Important:
 * - The TS0505B converter remains responsible for sending all Zigbee commands.
 * - The normal group light entity (e.g. light.example_group) is still created by
 *   Zigbee2MQTT itself. This extension does NOT replace it.
 * - Discovery is intentionally published after Zigbee2MQTT's own HA discovery
 *   startup window, so Z2M does not treat these custom discovery messages as
 *   stale built-in entries.
 */

import {readFileSync} from 'node:fs';

function loadTargetGroups() {
    const configUrl = new URL(
        './ts0505b-group-state-extension.config.json',
        import.meta.url,
    );
    const errorPrefix = `TS0505B group configuration (${configUrl.pathname})`;
    let config;

    try {
        config = JSON.parse(readFileSync(configUrl, 'utf8'));
    } catch (error) {
        const reason = error instanceof SyntaxError
            ? 'invalid JSON'
            : `cannot read file (${error.code ?? 'unknown error'})`;
        throw new Error(`${errorPrefix}: ${reason}`);
    }

    if (!Array.isArray(config?.targetGroups)) {
        throw new Error(`${errorPrefix}: targetGroups must be an array`);
    }

    const names = new Set();
    const objectIds = new Set();

    for (const [index, target] of config.targetGroups.entries()) {
        for (const [key, seen] of [['name', names], ['objectId', objectIds]]) {
            const value = target?.[key];
            if (typeof value !== 'string' || value.trim().length === 0) {
                throw new Error(`${errorPrefix}: targetGroups[${index}].${key} must be a nonempty string`);
            }
            if (seen.has(value)) {
                throw new Error(`${errorPrefix}: targetGroups[${index}].${key} must be unique`);
            }
            seen.add(value);
        }
    }

    return config.targetGroups;
}

const DISCOVERY_DELAY_MS = 7000;

const COLOR_TEMP_MIN = 153;
const COLOR_TEMP_MAX = 500;

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

const SCENE_EFFECTS = [
    'static',
    'flash',
    'breath',
];

const SCENE_POINTS = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
];

const RHYTHM_MODES = [
    'linear_1',
    'linear_2',
];

const RHYTHM_DAYS = new Set([
    'rhythm_sunday',
    'rhythm_monday',
    'rhythm_tuesday',
    'rhythm_wednesday',
    'rhythm_thursday',
    'rhythm_friday',
    'rhythm_saturday',
]);

const NON_STATE_ACTIONS = new Set([
    'rhythm_save',
    'rhythm_discard',
    'rhythm_reset',
    'scene_save',
    'scene_discard',
    'scene_reset',
]);

const DAY_LABELS = {
    rhythm_sunday: 'Sunday',
    rhythm_monday: 'Monday',
    rhythm_tuesday: 'Tuesday',
    rhythm_wednesday: 'Wednesday',
    rhythm_thursday: 'Thursday',
    rhythm_friday: 'Friday',
    rhythm_saturday: 'Saturday',
};

function isTrackedProperty(key) {
    if (
        key === 'do_not_disturb' ||

        key === 'startup_behavior' ||
        key === 'startup_color_mode' ||
        key === 'startup_color_temp_kelvin' ||
        key === 'state_startup' ||
        key === 'brightness_startup' ||
        key === 'color_temp_startup' ||
        key === 'color_startup' ||

        key === 'rhythm_enabled' ||
        key === 'rhythm_mode' ||

        key === 'scene_selected' ||
        key === 'scene_effect' ||
        key === 'scene_speed' ||
        key === 'scene_point_selected' ||
        key === 'scene_point_enabled' ||
        key === 'scene_point_mode' ||
        key === 'scene_point_hue' ||
        key === 'scene_point_saturation' ||
        key === 'scene_point_brightness' ||
        key === 'scene_point_color_temp' ||

        key === 'state_scene_point' ||
        key === 'brightness_scene_point' ||
        key === 'color_temp_scene_point' ||
        key === 'color_scene_point' ||
        key === 'color_mode_scene_point'
    ) {
        return true;
    }

    if (RHYTHM_DAYS.has(key)) {
        return true;
    }

    return /^rhythm_[1-8]_(name|enabled|time|brightness|color_temp)$/.test(
        key,
    );
}

function filterTrackedPayload(payload) {
    const result = {};

    if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
    ) {
        return result;
    }

    for (const [key, value] of Object.entries(payload)) {
        if (NON_STATE_ACTIONS.has(key)) {
            continue;
        }

        if (isTrackedProperty(key)) {
            result[key] = value;
        }
    }

    return result;
}

function parseJson(value) {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}

function parseScalar(value) {
    const parsed = parseJson(value);

    if (parsed !== undefined) {
        return parsed;
    }

    return value;
}

function startupEndpointToGroupState(message) {
    const result = {};

    if (!message || typeof message !== 'object' || Array.isArray(message)) {
        return result;
    }

    if (message.state !== undefined) {
        result.state_startup = message.state;
    }

    if (message.brightness !== undefined) {
        result.brightness_startup = message.brightness;
    }

    if (message.color_temp !== undefined) {
        result.color_temp_startup = message.color_temp;
        result.startup_color_mode = 'white';
    }

    if (message.color !== undefined) {
        result.color_startup = message.color;
        result.startup_color_mode = 'color';
    }

    if (message.color_mode === 'xy') {
        result.startup_color_mode = 'color';
    } else if (message.color_mode === 'color_temp') {
        result.startup_color_mode = 'white';
    }

    return result;
}

function scenePointEndpointToGroupState(message) {
    const result = {};

    if (!message || typeof message !== 'object' || Array.isArray(message)) {
        return result;
    }

    if (message.state !== undefined) {
        result.state_scene_point = message.state;
        result.scene_point_enabled = message.state;
    }

    if (message.brightness !== undefined) {
        result.brightness_scene_point = message.brightness;
    }

    if (message.color_temp !== undefined) {
        result.color_temp_scene_point = message.color_temp;
        result.color_mode_scene_point = 'color_temp';
        result.scene_point_mode = 'white';
    }

    if (message.color !== undefined) {
        result.color_scene_point = message.color;
        result.color_mode_scene_point = 'xy';
        result.scene_point_mode = 'color';
    }

    if (message.color_mode === 'xy') {
        result.color_mode_scene_point = 'xy';
        result.scene_point_mode = 'color';
    } else if (message.color_mode === 'color_temp') {
        result.color_mode_scene_point = 'color_temp';
        result.scene_point_mode = 'white';
    }

    return result;
}

function groupStateToEndpointLight(payload, endpoint) {
    const result = {};

    if (endpoint === 'startup') {
        if (payload.state_startup !== undefined) {
            result.state = payload.state_startup;
        }

        if (payload.brightness_startup !== undefined) {
            result.brightness = payload.brightness_startup;
        }

        if (payload.color_temp_startup !== undefined) {
            result.color_temp = payload.color_temp_startup;
        }

        if (payload.color_startup !== undefined) {
            result.color = payload.color_startup;
        }

        if (payload.startup_color_mode === 'color') {
            result.color_mode = 'xy';
        } else if (payload.startup_color_mode === 'white') {
            result.color_mode = 'color_temp';
        }
    } else if (endpoint === 'scene_point') {
        if (payload.state_scene_point !== undefined) {
            result.state = payload.state_scene_point;
        }

        if (payload.brightness_scene_point !== undefined) {
            result.brightness = payload.brightness_scene_point;
        }

        if (payload.color_temp_scene_point !== undefined) {
            result.color_temp = payload.color_temp_scene_point;
        }

        if (payload.color_scene_point !== undefined) {
            result.color = payload.color_scene_point;
        }

        if (payload.color_mode_scene_point !== undefined) {
            result.color_mode = payload.color_mode_scene_point;
        }
    }

    return result;
}

function hasProperties(value) {
    return value && Object.keys(value).length > 0;
}

export default class TS0505BGroupStateExtension {
    constructor(
        zigbee,
        mqtt,
        state,
        publishEntityState,
        eventBus,
        enableDisableExtension,
        restartCallback,
        addExtension,
        settings,
        logger,
    ) {
        this.zigbee = zigbee;
        this.mqtt = mqtt;
        this.state = state;
        this.publishEntityState = publishEntityState;
        this.eventBus = eventBus;
        this.settings = settings;
        this.logger = logger;

        const config = settings.get();

        this.targetGroups = loadTargetGroups();

        this.baseTopic = config.mqtt.base_topic;

        const haSettings = config.homeassistant;

        if (haSettings === true) {
            this.homeAssistantEnabled = true;
            this.discoveryTopic = 'homeassistant';
            this.homeAssistantStatusTopic = 'homeassistant/status';
        } else if (haSettings && typeof haSettings === 'object') {
            this.homeAssistantEnabled = haSettings.enabled !== false;
            this.discoveryTopic = haSettings.discovery_topic ?? 'homeassistant';
            this.homeAssistantStatusTopic =
                haSettings.status_topic ?? 'homeassistant/status';
        } else {
            this.homeAssistantEnabled = false;
            this.discoveryTopic = 'homeassistant';
            this.homeAssistantStatusTopic = 'homeassistant/status';
        }

        this.discoveryTimer = undefined;

        this.logger.info(
            'Loaded TS0505B custom group state + HA discovery extension',
        );
    }

    start() {
        this.eventBus.onMQTTMessage(
            this,
            async (data) => {
                await this.onMQTTMessage(data);
            },
        );

        this.eventBus.onStateChange(
            this,
            async (data) => {
                await this.onStateChange(data);
            },
        );

        if (this.homeAssistantEnabled) {
            this.discoveryTimer = setTimeout(
                () => {
                    this.publishAllDiscovery().catch((error) => {
                        this.logger.error(
                            `TS0505B group HA discovery failed: ${error}`,
                        );
                    });
                },
                DISCOVERY_DELAY_MS,
            );
        } else {
            this.logger.warning(
                'TS0505B group HA discovery skipped: Home Assistant integration is disabled',
            );
        }
    }

    stop() {
        if (this.discoveryTimer !== undefined) {
            clearTimeout(this.discoveryTimer);
            this.discoveryTimer = undefined;
        }

        this.eventBus.removeListeners(this);
    }

    getTargetConfigByName(name) {
        return this.targetGroups.find((entry) => entry.name === name);
    }

    getTargetGroupByName(name) {
        const config = this.getTargetConfigByName(name);

        if (!config) {
            return undefined;
        }

        const entity = this.zigbee.resolveEntity(name);

        if (!entity || !entity.isGroup?.()) {
            return undefined;
        }

        return entity;
    }

    async onMQTTMessage(data) {
        if (
            this.homeAssistantEnabled &&
            data.topic === this.homeAssistantStatusTopic &&
            String(data.message).toLowerCase().includes('online')
        ) {
            setTimeout(
                () => {
                    this.publishAllDiscovery().catch((error) => {
                        this.logger.error(
                            `TS0505B group HA re-discovery failed: ${error}`,
                        );
                    });
                },
                500,
            );

            return;
        }

        for (const target of this.targetGroups) {
            const group = this.getTargetGroupByName(target.name);

            if (!group) {
                continue;
            }

            const rootSetTopic = `${this.baseTopic}/${target.name}/set`;
            const propertyPrefix = `${rootSetTopic}/`;
            const startupSetTopic = `${this.baseTopic}/${target.name}/startup/set`;
            const scenePointSetTopic = `${this.baseTopic}/${target.name}/scene_point/set`;

            let payload = {};

            if (data.topic === rootSetTopic) {
                payload = filterTrackedPayload(
                    parseJson(data.message),
                );
            } else if (data.topic.startsWith(propertyPrefix)) {
                const property = data.topic.slice(propertyPrefix.length);

                if (
                    isTrackedProperty(property) &&
                    !NON_STATE_ACTIONS.has(property)
                ) {
                    payload[property] = parseScalar(data.message);
                }
            } else if (data.topic === startupSetTopic) {
                payload = startupEndpointToGroupState(
                    parseJson(data.message),
                );
            } else if (data.topic === scenePointSetTopic) {
                payload = scenePointEndpointToGroupState(
                    parseJson(data.message),
                );
            } else {
                continue;
            }

            if (!hasProperties(payload)) {
                continue;
            }

            await this.publishGroupState(
                group,
                target,
                payload,
            );
        }
    }

    async onStateChange(data) {
        if (
            data.reason === 'groupOptimistic' ||
            data.entity?.isGroup?.()
        ) {
            return;
        }

        if (!data.entity?.isDevice?.()) {
            return;
        }

        const payload = filterTrackedPayload(data.update);

        if (!hasProperties(payload)) {
            return;
        }

        for (const target of this.targetGroups) {
            const group = this.getTargetGroupByName(target.name);

            if (!group) {
                continue;
            }

            if (!group.hasMember(data.entity)) {
                continue;
            }

            await this.publishGroupState(
                group,
                target,
                payload,
            );
        }
    }

    async publishGroupState(group, target, payload) {
        await this.publishEntityState(
            group,
            payload,
            'groupOptimistic',
        );

        await this.publishEndpointState(
            target.name,
            payload,
            'startup',
        );

        await this.publishEndpointState(
            target.name,
            payload,
            'scene_point',
        );
    }

    async publishEndpointState(groupName, payload, endpoint) {
        const endpointPayload = groupStateToEndpointLight(
            payload,
            endpoint,
        );

        if (!hasProperties(endpointPayload)) {
            return;
        }

        await this.mqtt.publish(
            `${groupName}/${endpoint}`,
            JSON.stringify(endpointPayload),
        );
    }

    getAvailability() {
        return [
            {
                topic: `${this.baseTopic}/bridge/state`,
                value_template: '{{ value_json.state }}',
            },
        ];
    }

    getDeviceInfo(target) {
        return {
            identifiers: [
                `ts0505b_group_${target.objectId}`,
            ],
            name: target.name,
            manufacturer: 'Tuya / Zigbee2MQTT custom',
            model: 'TS0505B custom group controls',
        };
    }

    getCommonDiscovery(target, component, property, name) {
        return {
            availability: this.getAvailability(),
            device: this.getDeviceInfo(target),
            name,
            object_id: `${target.objectId}_${property}`,
            default_entity_id: `${component}.${target.objectId}_${property}`,
            unique_id: `ts0505b_group_${target.objectId}_${property}`,
        };
    }

    async publishDiscovery(component, target, property, payload) {
        const topic =
            `${component}/ts0505b_group_${target.objectId}/${property}/config`;

        await this.mqtt.publish(
            topic,
            JSON.stringify(payload),
            {
                baseTopic: this.discoveryTopic,
                clientOptions: {
                    retain: true,
                },
                skipReceive: true,
            },
        );
    }

    async discoverSwitch(target, property, name) {
        const payload = {
            ...this.getCommonDiscovery(
                target,
                'switch',
                property,
                name,
            ),
            state_topic: `${this.baseTopic}/${target.name}`,
            command_topic: `${this.baseTopic}/${target.name}/set/${property}`,
            payload_on: 'ON',
            payload_off: 'OFF',
            value_template: `{{ value_json["${property}"] }}`,
        };

        await this.publishDiscovery(
            'switch',
            target,
            property,
            payload,
        );
    }

    async discoverSelect(target, property, name, options) {
        const payload = {
            ...this.getCommonDiscovery(
                target,
                'select',
                property,
                name,
            ),
            state_topic: `${this.baseTopic}/${target.name}`,
            command_topic: `${this.baseTopic}/${target.name}/set/${property}`,
            options,
            value_template: `{{ value_json["${property}"] }}`,
        };

        await this.publishDiscovery(
            'select',
            target,
            property,
            payload,
        );
    }

    async discoverNumber(
        target,
        property,
        name,
        min,
        max,
        step,
        unit,
    ) {
        const payload = {
            ...this.getCommonDiscovery(
                target,
                'number',
                property,
                name,
            ),
            state_topic: `${this.baseTopic}/${target.name}`,
            command_topic: `${this.baseTopic}/${target.name}/set/${property}`,
            min,
            max,
            step,
            mode: 'slider',
            value_template: `{{ value_json["${property}"] }}`,
        };

        if (unit) {
            payload.unit_of_measurement = unit;
        }

        await this.publishDiscovery(
            'number',
            target,
            property,
            payload,
        );
    }

    async discoverText(target, property, name) {
        const payload = {
            ...this.getCommonDiscovery(
                target,
                'text',
                property,
                name,
            ),
            state_topic: `${this.baseTopic}/${target.name}`,
            command_topic: `${this.baseTopic}/${target.name}/set/${property}`,
            value_template: `{{ value_json["${property}"] }}`,
        };

        await this.publishDiscovery(
            'text',
            target,
            property,
            payload,
        );
    }

    async discoverSensor(target, property, name, unit) {
        const payload = {
            ...this.getCommonDiscovery(
                target,
                'sensor',
                property,
                name,
            ),
            state_topic: `${this.baseTopic}/${target.name}`,
            value_template: `{{ value_json["${property}"] }}`,
        };

        if (unit) {
            payload.unit_of_measurement = unit;
        }

        await this.publishDiscovery(
            'sensor',
            target,
            property,
            payload,
        );
    }

    async discoverButton(target, property, name, payloadPress) {
        const payload = {
            ...this.getCommonDiscovery(
                target,
                'button',
                property,
                name,
            ),
            command_topic: `${this.baseTopic}/${target.name}/set/${property}`,
            payload_press: payloadPress,
        };

        await this.publishDiscovery(
            'button',
            target,
            property,
            payload,
        );
    }

    async discoverEndpointLight(target, endpoint, name) {
        const property = `light_${endpoint}`;

        const payload = {
            availability: this.getAvailability(),
            device: this.getDeviceInfo(target),
            name,
            object_id: `${target.objectId}_${endpoint}`,
            default_entity_id: `light.${target.objectId}_${endpoint}`,
            unique_id: `ts0505b_group_${target.objectId}_${property}`,
            schema: 'json',
            state_topic: `${this.baseTopic}/${target.name}/${endpoint}`,
            command_topic: `${this.baseTopic}/${target.name}/${endpoint}/set`,
            brightness: true,
            brightness_scale: 254,
            supported_color_modes: [
                'xy',
                'color_temp',
            ],
            min_mireds: COLOR_TEMP_MIN,
            max_mireds: COLOR_TEMP_MAX,
        };

        await this.publishDiscovery(
            'light',
            target,
            property,
            payload,
        );
    }

    async publishGroupDiscovery(target) {
        const group = this.getTargetGroupByName(target.name);

        if (!group) {
            this.logger.warning(
                `TS0505B group HA discovery: group '${target.name}' not found`,
            );
            return;
        }

        // Startup
        await this.discoverSelect(
            target,
            'startup_behavior',
            'Startup behavior',
            [
                'initial',
                'previous',
                'customized',
            ],
        );

        await this.discoverSensor(
            target,
            'startup_color_mode',
            'Startup color mode',
        );

        await this.discoverSensor(
            target,
            'startup_color_temp_kelvin',
            'Startup color temperature',
            'K',
        );

        await this.discoverEndpointLight(
            target,
            'startup',
            'Startup',
        );

        // Do Not Disturb
        await this.discoverSwitch(
            target,
            'do_not_disturb',
            'Do not disturb',
        );

        // Scene
        await this.discoverSelect(
            target,
            'scene_selected',
            'Scene',
            SCENE_NAMES,
        );

        await this.discoverSelect(
            target,
            'scene_effect',
            'Dynamic effect',
            SCENE_EFFECTS,
        );

        await this.discoverNumber(
            target,
            'scene_speed',
            'Scene speed',
            0,
            100,
            1,
            '%',
        );

        await this.discoverSelect(
            target,
            'scene_point_selected',
            'Scene point',
            SCENE_POINTS,
        );

        await this.discoverSwitch(
            target,
            'scene_point_enabled',
            'Scene point enabled',
        );

        await this.discoverSelect(
            target,
            'scene_point_mode',
            'Scene point mode',
            [
                'color',
                'white',
            ],
        );

        await this.discoverNumber(
            target,
            'scene_point_hue',
            'Scene point hue',
            0,
            360,
            1,
            '°',
        );

        await this.discoverNumber(
            target,
            'scene_point_saturation',
            'Scene point saturation',
            0,
            100,
            1,
            '%',
        );

        await this.discoverNumber(
            target,
            'scene_point_brightness',
            'Scene point brightness',
            0,
            100,
            1,
            '%',
        );

        await this.discoverNumber(
            target,
            'scene_point_color_temp',
            'Scene point color temperature',
            0,
            100,
            1,
            '%',
        );

        await this.discoverEndpointLight(
            target,
            'scene_point',
            'Scene point',
        );

        await this.discoverButton(
            target,
            'scene_save',
            'Save Scene',
            'save',
        );

        await this.discoverButton(
            target,
            'scene_discard',
            'Discard Scene changes',
            'discard',
        );

        await this.discoverButton(
            target,
            'scene_reset',
            'Reset Scene',
            'reset',
        );

        // Rhythm global
        await this.discoverSwitch(
            target,
            'rhythm_enabled',
            'Rhythm',
        );

        await this.discoverSelect(
            target,
            'rhythm_mode',
            'Rhythm mode',
            RHYTHM_MODES,
        );

        for (const property of RHYTHM_DAYS) {
            await this.discoverSwitch(
                target,
                property,
                DAY_LABELS[property],
            );
        }

        // Rhythm points
        for (let index = 1; index <= 8; index++) {
            await this.discoverSwitch(
                target,
                `rhythm_${index}_enabled`,
                `Rhythm ${index} enabled`,
            );

            await this.discoverText(
                target,
                `rhythm_${index}_name`,
                `Rhythm ${index} name`,
            );

            await this.discoverText(
                target,
                `rhythm_${index}_time`,
                `Rhythm ${index} time`,
            );

            await this.discoverNumber(
                target,
                `rhythm_${index}_brightness`,
                `Rhythm ${index} brightness`,
                0,
                100,
                1,
                '%',
            );

            await this.discoverNumber(
                target,
                `rhythm_${index}_color_temp`,
                `Rhythm ${index} temperature`,
                0,
                100,
                1,
                '%',
            );
        }

        await this.discoverButton(
            target,
            'rhythm_save',
            'Save Rhythm',
            'save',
        );

        await this.discoverButton(
            target,
            'rhythm_discard',
            'Discard changes',
            'discard',
        );

        await this.discoverButton(
            target,
            'rhythm_reset',
            'Reset Rhythm',
            'reset',
        );

        this.logger.info(
            `TS0505B group HA discovery published for '${target.name}'`,
        );
    }

    async publishAllDiscovery() {
        if (!this.homeAssistantEnabled) {
            return;
        }

        for (const target of this.targetGroups) {
            await this.publishGroupDiscovery(target);
        }
    }
}
