/* jshint esversion: 6 */

var Accessory, Service, Characteristic;
var Chalk = require('chalk');
var Moment = require('moment');
var logRefresh;

module.exports = function (accessory, service, characteristic) {
	Accessory = accessory;
	Service = service;
	Characteristic = characteristic;

	return WallySensor;
};


function WallySensor(log, config, platform, homebridgeAccessory) {
	this.log = log;
	logRefresh = platform.logRefresh;
	this.name = config.location.room + " " + config.location.appliance;
	this.prefix = Chalk.blue("[" + this.name + "]");
	this.log.debug(this.prefix, "Initializing sensor...");
	this.log.debug(config);

	this.homebridgeAccessory = homebridgeAccessory;
	this.homebridgeAccessory.on('identify', this.identify.bind(this));

	var informationService = this.homebridgeAccessory.getService(Service.AccessoryInformation);
	informationService.getCharacteristic(Characteristic.Name).setValue(this.name);
	informationService.getCharacteristic(Characteristic.Manufacturer).setValue("Wally Home");
	informationService.getCharacteristic(Characteristic.Model).setValue(config.hardwareType);
	informationService.getCharacteristic(Characteristic.SerialNumber).setValue(config.snid);

	
	if (config.state['SENSOR'].value == 0 ) {
		//Build leak sensor
		var leakService = null;
		leakService = this.homebridgeAccessory.getService(Service.LeakSensor);
		if (!leakService) {
			leakService = this.homebridgeAccessory.addService(Service.LeakSensor);
			leakService.displayName = "Leak";
		}
		this.leakCharacteristic = leakService.getCharacteristic(Characteristic.LeakDetected);
		this.humidityLeakCharacteristic = leakService.getCharacteristic(Characteristic.CurrentRelativeHumidity);
	} else {
		//Build contact sensor
		var contactService = null;
		contactService = this.homebridgeAccessory.getService(Service.ContactSensor);
		if (!contactService) {
			contactService = this.homebridgeAccessory.addService(Service.ContactSensor);
			contactService.displayname = "Contact";
		}
		this.contactCharacteristic = contactService.getCharacteristic(Characteristic.ContactSensorState);
		this.humidityLeakCharacteristic = contactService.getCharacteristic(Characteristic.CurrentRelativeHumidity);
	}
	
	//Build temp sensor
	if (platform.exposeTempSensor) {
		var temperatureService = null;
		temperatureService = this.homebridgeAccessory.getService(Service.TemperatureSensor);
		if (!temperatureService) {
			temperatureService = this.homebridgeAccessory.addService(Service.TemperatureSensor);
			temperatureService.displayName = "Temperature";
		}
		this.temperatureCharacteristic = temperatureService.getCharacteristic(Characteristic.CurrentTemperature);
		this.temperatureActiveCharacteristic = temperatureService.getCharacteristic(Characteristic.StatusActive);
		this.humidityTempCharacteristic = temperatureService.getCharacteristic(Characteristic.CurrentRelativeHumidity);
	}
  
	//Build humidity sensor
	if (platform.exposeHumiditySensor) {
		var humidityService = null;
		humidityService - this.homebridgeAccessory.getService(Service.HumiditySensor);
		if (!humidityService) {
			humidityService = this.homebridgeAccessory.addService(Service.HumiditySensor);
			humidityService.displayName = "Humidity";
		}
		this.humidityCharacteristic = humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity);
		
	}
	
		
	//build battery service
	var batteryService = null;
	batteryService = this.homebridgeAccessory.getService(Service.BatteryService);
	if (!batteryService) {
		batteryService = this.homebridgeAccessory.addService(Service.BatteryService);
		batteryService.displayName = "Battery";
	}
	this.batteryCharacteristic = batteryService.getCharacteristic(Characteristic.BatteryLevel);

	this.log.info("Initialized | " + this.name);
	this.update(config);
}


WallySensor.prototype.update = function (config) {
	this.log.debug(this.prefix, "Updating sensor measurement...");
	this.log.debug(config);
	
	//check to see if sensor is still online
	if (minutesSinceLastUpdate(config.updated) > 30) {
		if (this.leakCharacteristic) {
			this.leakCharacteristic.updateValue(new Error("Polling failed"));
		}
		if (this.contactCharacteristic) {
			this.contactCharacteristic.updateValue(new Error("Polling failed"));
		}
		if (this.temperatureCharacteristic) {
			this.temperatureCharacteristic.updateValue(new Error("Polling failed"));
		}
		if (this.humidityCharacteristic) {
			this.humidityCharacteristic.updateValue(new Error("Polling failed"));
		}
		if (this.humidityTempCharacteristic) {
			this.humidityTempCharacteristic.updateValue(new Error("Polling failed"));
		}
		if (this.humidityLeakCharacteristic) {
			this.humidityLeakCharacteristic.updateValue(new Error("Polling failed"));
		}
		if (logRefresh) {
			this.log.error(this.prefix, "Offline since " + config.updated);
		}
		return;
	}
	
	var output = [];

	//update leak info
	if (this.leakCharacteristic) {
		this.leakCharacteristic.updateValue(val2Bool(config.state['LEAK'].value), null, this);
		output.push("Leak:" + val2Bool(config.state['LEAK'].value));
	}
	
	//update contact info
	if (this.contactCharacteristic) {
		this.contactCharacteristic.updateValue(val2Bool(config.state['COND'].value), null, this);
		output.push("Open:" + val2Bool(config.state['COND'].value));
	}
	
	//Update temp info
	if (this.temperatureCharacteristic) {
		this.temperatureCharacteristic.updateValue(config.state['TEMP'].value, null, this);
		this.temperatureActiveCharacteristic.updateValue(config.inUse, null, this);
		output.push("Temperature:" + config.state['TEMP'].value + "°C");
	}

	//update humidity info
	if (this.humidityTempCharacteristic || this.humidityLeakCharacteristic || this.humidityCharacteristic) {
		if (this.humidityCharacteristic) {
			this.humidityCharacteristic.updateValue(config.state['RH'].value, null, this);
		}
		if (this.humidityTempCharacteristic) {
			this.humidityTempCharacteristic.updateValue(config.state['RH'].value, null, this);
		}
		if (this.humidityLeakCharacteristic) {
			this.humidityLeakCharacteristic.updateValue(config.state['RH'].value, null, this);
		}
		output.push("Humidity:" + config.state['RH'].value + "%");
	}
	
	//update battery info
	if (this.batteryCharacteristic) {
		this.batteryCharacteristic.updateValue(config.hardware.BATT_LVL, null, this);
		output.push("Battery:" + config.hardware.BATT_LVL + "%");
	}

	if (logRefresh) {
		this.log.info(this.prefix, output.join(" | "));
	}
};


WallySensor.prototype.identify = function (callback) {
	this.log.info(this.prefix, "Identify");
	if (callback) callback();
};

function val2Bool (val){
	if (val == 15) { 
		return true; 
	} else {
		return false;
	}
};

function minutesSinceLastUpdate (lastUpdateTime){
	var formatedLastUpdateTime =  Moment(lastUpdateTime, "YYYY-MM-DD'T'HH:mm:ss:SSSSZ");
	var formatedCurrentTime = Moment();
	var timeDifference = Moment.duration(formatedCurrentTime.diff(formatedLastUpdateTime, 'minutes'));
	return timeDifference;
};
