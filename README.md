# Homebridge - LifeSmart ColoLight PRO

- Can only switch the light on/off + set brightness. 
- Plugin do not read the state of ColoLight at current code.

Example config.json:
```
    "accessories": [
        {
            "accessory": "ColoLightPro",
            "name": "ColoLightPro",
            "host": "192.168.2.103"
        }
    ]
```