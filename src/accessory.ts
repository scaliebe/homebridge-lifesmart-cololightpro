import { AccessoryConfig, AccessoryPlugin, API, Characteristic, CharacteristicEventTypes, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, HAP, Logger, Logging, Service } from "homebridge";
import udp from 'dgram';
import find from 'local-devices'
import { table } from "console";

const axios = require('axios').default;
const polling = require("polling-to-event");

let hap: HAP;

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("ColoLightPro", ColoLightPro);
};

class ColoLightPro implements AccessoryPlugin{

  private readonly log: Logging;
  private readonly name: string;
  private readonly host: string;
  private lightOn = false;
  private brightness = -1;
  private hue = 100;
  private saturation = 100;

  private rainbowRunnerOn = false;

  private readonly lightService: Service;
  private readonly informationService: Service;
  private readonly switchService: Service;
  private readonly debug: boolean = false;

  private readonly coloCmd_prefix = Buffer.from([0x53, 0x5a, 0x30, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00]);
  private readonly coloCmd_config = Buffer.from([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  private readonly coloCmd_color = Buffer.from([0x23, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x06, 0x02, 0xff]);

  /*private readonly coloCmd_EFFECT_INSTAGRAMMER = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x03, 0xbc, 0x01, 0x90])]);
  private readonly coloCmd_EFFECT_80CLUB = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x04, 0x9a, 0x00, 0x00])]);
  private readonly coloCmd_EFFECT_CHERRYBLOSSOM = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x04, 0x94, 0x08, 0x00])]);
  private readonly coloCmd_EFFECT_COCKTAILPARADE = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x05, 0xbd, 0x06, 0x90])]);
  private readonly coloCmd_EFFECT_SAVASANA = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x04, 0x97, 0x04, 0x00])]);
  private readonly coloCmd_EFFECT_SUNRISE = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x01, 0xc1, 0x0a, 0x00])]);
  private readonly coloCmd_EFFECT_UNICORNS = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x04, 0x9a, 0x0e, 0x00])]);
  private readonly coloCmd_EFFECT_PENSIEVE = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x04, 0xc4, 0x06, 0x00])]);
  private readonly coloCmd_EFFECT_THECIRCUS = Buffer.concat([this.coloCmd_prefix, this.coloCmd_color, Buffer.from([0x04, 0x81, 0x01, 0x30])]);*/

  private readonly coloCmd_FUNC_ON = Buffer.concat([this.coloCmd_prefix, this.coloCmd_config, Buffer.from([0x04, 0x01, 0x03, 0x01, 0xcf, 0x35])]);
  private readonly coloCmd_FUNC_OFF = Buffer.concat([this.coloCmd_prefix, this.coloCmd_config, Buffer.from([0x04, 0x01, 0x03, 0x01, 0xce, 0x1e])]);
  private readonly coloCmd_FUNC_BRIGHTNESS = Buffer.concat([this.coloCmd_prefix, this.coloCmd_config, Buffer.from([0x04, 0x01, 0x03, 0x01, 0xcf])]);
  private readonly coloCmd_FUNC_STATE = Buffer.from([0x5a, 0x2d, 0x53, 0x45, 0x41, 0x52, 0x43, 0x48, 0x20, 0x2a, 0x20, 0x0d, 0x0a]);

  private readonly coloCmd_INFO_OFF = Buffer.from([0x5a, 0x2d, 0x53, 0x45, 0x41, 0x52, 0x00, 0x00, 0x00, 0x20, 0x20, 0x0d, 0x0a, 0x00, 0x00, 0x00, 0x02, 0x93, 0x08, 0x40, 0xfa, 0x14, 0x00, 0x40, 0x30, 0x05, 0xbe, 0x0a, 0x0d, 0x01, 0x32, 0x34, 0x36, 0x46, 0x32, 0x38, 0x46, 0x32, 0x31, 0x35, 0x32, 0x43 ]);

  private readonly port = 8900;
  private readonly socket = udp.createSocket('udp4');

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.host = config.host;

    this.log("DEBUG ON: " + this.debug)

    log.info("Setting up Accessory " + this.name + " with Host-IP: " + this.host);

    this.lightService = new hap.Service.Lightbulb(this.name);
    this.switchService = new hap.Service.Switch(this.name);

    this.registerCharacteristicOnOff();
    this.registerCharacteristicBrightness();

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "in-Reach UG & Co. KG")
      .setCharacteristic(hap.Characteristic.Model, "ColoLight Pro");

    console.log("ColoLight Pro finished initializing!");

    /*var that = this;
    this.socket.on('message',function(msg,info){
      console.log('Data received from client : ',msg);

      if(Buffer.compare(that.coloCmd_INFO_OFF, msg) == 0)
        that.lightOn = false;
      else if(!that.lightOn)
        that.lightOn = true;

      that.updateLight();
    });

    this.socket.on('listening',function(){
      console.log('Server is listening');
    });*/

  }

  registerCharacteristicOnOff(): void {
    var that = this;
    this.lightService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        /*console.log("polling state");
        that.socket.send(that.coloCmd_FUNC_STATE, that.port, that.host,function(error){
          console.log("get Info");
        });*/
        callback(undefined, this.lightOn);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        if (value && this.lightOn != value) {
          console.log("on")
          this.socket.send(this.coloCmd_FUNC_ON, this.port, this.host,function(error){
            console.log(error);
          });
        } else if(!value) {
          console.log("off");
          this.socket.send(this.coloCmd_FUNC_OFF, this.port, this.host,function(error){
            console.log("off");
          });        
        }
        this.lightOn = value as boolean;
        if(this.debug)
          this.log("Switch state was set to: " + (this.lightOn ? "ON" : "OFF"));
        callback();
      });

  }

  registerCharacteristicBrightness(): void {

    this.lightService.getCharacteristic(hap.Characteristic.Brightness)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        callback(undefined, Math.floor(100 / 255 * this.brightness));
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.brightness = 255 / 100 * (value as number);
        var bcmd = Buffer.concat([this.coloCmd_FUNC_BRIGHTNESS, 
          (Buffer.alloc(1)).fill(Math.floor(100 / 255 * this.brightness))]);

        this.socket.send(bcmd, this.port, this.host,function(error){
          console.log("brightness was sent");
        });  
        callback();
      });

  }


  updateLight(): void {
    this.lightService.updateCharacteristic(hap.Characteristic.On, this.lightOn);
    this.lightService.updateCharacteristic(hap.Characteristic.Brightness, Math.floor(100 / 255 * this.brightness));
  }


  identify(): void {
    console.log("Identify!");
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.lightService
    ];
  }
}