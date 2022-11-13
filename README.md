# Homebridge - LifeSmart ColoLight PRO

Homebridge plugin for the LifeSmart ColoLight series of products.

## Features

- Can switch the light on/off
- Can set the brightness of the light
- Plugin does not read the state of the ColoLight (eg: if the ColoLight follows a schedule, the on/off and brightness status will not reflect until manually set)

## Install

Use the Homebridge web UI to install the plugin or run:

```bash
npm install -g homebridge-lifesmart-cololightpro
```

### Configuration

To configure this plugin, add a new entry to the `accessories` list for Homebridge. It must contain the accessory identifier and name of the product along with the ColoLight IP address paired with the `host` key. If you have multiple ColoLight products, you can add multiple entries and adjust the names and hosts of each.

```json
"accessories": [
    {
        "accessory": "ColoLightPro",
        "name": "ColoLightPro",
        "host": "192.168.2.103"
    }
]
```
