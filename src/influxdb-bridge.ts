/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { Adapter, Device, Event } from 'gateway-addon';
import { WebThingsClient } from 'webthings-client';
import { client as WebSocketClient } from 'websocket';
import { InfluxDB } from 'influx';

interface ThingEvent {
    messageType: string,
    data: {}
}

class InfluxDBDevice extends Device {
    constructor(adapter: Adapter) {
        super(adapter, `influxdb`);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this.name = 'InfluxDB';
        this.description = 'InfluxDB device';

        this.events.set('error', {
            name: 'Error',
            metadata: {
                description: 'An error occured',
                type: 'string'
            }
        });
    }

    public emitError() {
        this.eventNotify(new Event(this, 'error'));
    }
}

export class InfluxDBBridge extends Adapter {
    constructor(addonManager: any, private manifest: any) {
        super(addonManager, InfluxDBBridge.name, manifest.name);
        addonManager.addAdapter(this);
        this.connectToinflux();
    }

    private async connectToinflux() {
        const {
            host,
            port,
            database,
            username,
            password
        } = this.manifest.moziot.config;

        console.log(`Connecting to influx at ${host}`);

        let additionalProperties = {}

        if (username && password) {
            additionalProperties = {
                username,
                password
            }
        }

        const influxdb = new InfluxDB({
            host,
            port,
            database,
            ...additionalProperties
        });

        console.log('Create database if it does not exist');

        await influxdb.createDatabase(database);

        this.connectToGateway(influxdb);
    }

    private connectToGateway(influxdb: InfluxDB) {
        console.log('Connecting to gateway');

        const {
            accessToken,
            errorDevice,
            errorCooldownTime
        } = this.manifest.moziot.config;

        let influxDBDevice: InfluxDBDevice | undefined;

        if (errorDevice) {
            influxDBDevice = new InfluxDBDevice(this);
            this.handleDeviceAdded(influxDBDevice);
        }

        (async () => {
            const webThingsClient = await WebThingsClient.local(accessToken);
            const devices = await webThingsClient.getDevices();
            let lastError = Date.now() / 1000;

            for (const device of devices) {
                try {
                    const parts = device.href.split('/');
                    const deviceId = parts[parts.length - 1];

                    console.log(`Connecting to websocket of ${deviceId}`);
                    const thingUrl = `ws://localhost:8080${device.href}`;
                    const webSocketClient = new WebSocketClient();

                    webSocketClient.on('connectFailed', function (error) {
                        console.error(`Could not connect to ${thingUrl}: ${error}`)
                    });

                    webSocketClient.on('connect', function (connection) {
                        console.log(`Connected to ${thingUrl}`);

                        connection.on('error', function (error) {
                            console.log(`Connection to ${thingUrl} failed: ${error}`);
                        });

                        connection.on('close', function () {
                            console.log(`Connection to ${thingUrl} closed`);
                        });

                        connection.on('message', async function (message) {
                            if (message.type === 'utf8' && message.utf8Data) {
                                const thingEvent = <ThingEvent>JSON.parse(message.utf8Data);

                                if (thingEvent.messageType === 'propertyStatus') {
                                    if (Object.keys(thingEvent.data).length > 0) {
                                        try {
                                            await influxdb.writeMeasurement(deviceId, [{
                                                fields: thingEvent.data
                                            }]);
                                        } catch (e) {
                                            console.log(`Could not write values: ${e}`);

                                            const now = Date.now() / 1000;
                                            const timeSinceError = now - lastError;

                                            if (((errorCooldownTime || 15) * 60) < timeSinceError) {
                                                influxDBDevice?.emitError();
                                                lastError = now;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });

                    webSocketClient.connect(`${thingUrl}?jwt=${accessToken}`);
                } catch (e) {
                    console.log(`Could not process device ${device.title} ${e}`);
                }
            }
        })();
    }
}
