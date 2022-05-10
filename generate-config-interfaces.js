/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const { compile } = require('json-schema-to-typescript');
const manifest = require('./manifest.json');

compile(manifest.options.schema, 'Config').then((ts) => fs.writeFileSync('src/config.d.ts', ts));
