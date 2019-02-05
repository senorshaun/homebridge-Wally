var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
  console.log("Homebridge API version: " + homebridge.version);

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  WallySensor = require("./Sources/WallySensor.js")(Accessory, Service, Characteristic);
  WallyPlatform = require("./Sources/WallyPlatform.js")(UUIDGen, Accessory, WallySensor);

  homebridge.registerPlatform("homebridge-Wally", "Wally", WallyPlatform, true);
};