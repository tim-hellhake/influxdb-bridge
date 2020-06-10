/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { Adapter, } from 'gateway-addon';
import { WebThingsClient } from 'webthings-client';
import { client as WebSocketClient } from 'websocket';
import { InfluxDB } from 'influx';

interface ThingEvent {
    messageType: string,
    data: {}
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
            database
        } = this.manifest.moziot.config;

        console.log(`Connecting to influx at ${host}`);

        const influxdb = new InfluxDB({
            host,
            port,
            database
        });

        console.log('Create database if it does not exist');

        await influxdb.createDatabase(database);

        this.connectToGateway(influxdb);
    }

    private connectToGateway(influxdb: InfluxDB) {
        console.log('Connecting to gateway');

        const {
            accessToken
        } = this.manifest.moziot.config;

        (async () => {
            const webThingsClient = await WebThingsClient.local(accessToken);
            const devices = await webThingsClient.getDevices();

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
                                        await influxdb.writeMeasurement(deviceId, [{
                                            fields: thingEvent.data
                                        }]);
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
