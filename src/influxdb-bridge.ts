/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { Adapter, Device, Event } from 'gateway-addon';
import { WebThingsClient } from 'webthings-client';
import { InfluxDB } from 'influx';

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
            errorCooldownTime,
            debug
        } = this.manifest.moziot.config;

        let influxDBDevice: InfluxDBDevice | undefined;

        if (errorDevice) {
            influxDBDevice = new InfluxDBDevice(this);
            this.handleDeviceAdded(influxDBDevice);
        }

        let lastError = Date.now() / 1000;

        (async () => {
            const webThingsClient = await WebThingsClient.local(accessToken);
            await webThingsClient.connect();
            console.log('Successfully connected to gateway');
            webThingsClient.on('propertyChanged', async (deviceId, key, value) => {
                try {
                    await influxdb.writeMeasurement(deviceId, [{
                        fields: { [key]: value }
                    }]);

                    if(debug) {
                        console.log(`Wrote ${JSON.stringify({ [key]: value })} to ${deviceId}`);
                    }
                } catch (e) {
                    console.log(`Could not write values: ${e}`);

                    const now = Date.now() / 1000;
                    const timeSinceError = now - lastError;

                    if (((errorCooldownTime || 15) * 60) < timeSinceError) {
                        influxDBDevice?.emitError();
                        lastError = now;
                    }
                }
            });
        })();
    }
}
