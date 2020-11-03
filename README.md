# InfluxDB bridge

[![Build Status](https://github.com/tim-hellhake/influxdb-bridge/workflows/Build/badge.svg)](https://github.com/tim-hellhake/influxdb-bridge/actions?query=workflow%3ABuild)
[![dependencies](https://david-dm.org/tim-hellhake/influxdb-bridge.svg)](https://david-dm.org/tim-hellhake/influxdb-bridge)
[![devDependencies](https://david-dm.org/tim-hellhake/influxdb-bridge/dev-status.svg)](https://david-dm.org/tim-hellhake/influxdb-bridge?type=dev)
[![optionalDependencies](https://david-dm.org/tim-hellhake/influxdb-bridge/optional-status.svg)](https://david-dm.org/tim-hellhake/influxdb-bridge?type=optional)
[![license](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)

Save your device states to an InfluxDB.

In order to use this addon you need a running InfluxDB instance.

The repo contains a docker-compose config (`docker-compose.yml`) which runs InfluxDB and Grafana locally.

# How to use
* Go to `settings/developer` and click `Create local authorization`
* Create a new token and copy it
* Go to the settings of the influxdb bridge and insert the copied token

# Getting started with Grafana
## Execute `docker-compose up` in a terminal

## Open http://localhost:3000 in a Browser and login with admin/admin
![login](img/01-login.png)

## Set a new password
![login](img/02-new-password.png)

## Go to data sources
![login](img/03-sources.png)

## Add a new data source
![login](img/04-add-source.png)

## Select InfluxDB
![login](img/05-source-influx.png)

## Give the data source a name and set the url to the InfluxDB instance
![login](img/06-source-url.png)

## Set the DB name you used in the adapter config
![login](img/07-source-database.png)

## Save the data source
![login](img/08-source-save.png)

## Create a new dashboard
![login](img/09-new-dashboard.png)

## Add a new panel
![login](img/10-new-panel.png)

## Edit the panel and click on apply
![login](img/11-edit-panel.png)

## Save the dashboard
![login](img/12-dashboard.png)

## Enter a name for the dashboard and click on save
![login](img/13-save-dashboard.png)
