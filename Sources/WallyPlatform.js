/* jshint esversion: 6 */
/* jshint sub: true */

var UUIDGen, Accessory, WallySensor;
var Https = require('https');

module.exports = function (uuidGen, accessory, wallySensor) {
	UUIDGen = uuidGen
	Accessory = accessory;
	WallySensor = wallySensor;

	return WallyPlatform;
};


function WallyPlatform(log, config, homebridgeAPI) {
	if (!config) {
		log.warn("Ignoring Wally Plugin setup because it is not configured");
		this.disabled = true;
		return;
	}
	this.log = log;
	this.config = config || {};

	this.apiToken = this.config.api_Token;
	this.refreshTime = this.config.refresh_Time || 30; //default to 30 seconds
	this.exposeHumiditySensor = this.config.expose_Humidity_Sensor || false; //boolean based, default to false
	this.exposeTempSensor = this.config.expose_Temp_Sensor || false; //boolean based, default to false
	this.logRefresh = this.config.log_Refresh || false; //boolean based, default to false

	this.idCode = null;

	this.wallyAccessories = {};
	this.homebridgeAccessories = {};

	this.homebridgeAPI = homebridgeAPI;
	this.homebridgeAPI.on('didFinishLaunching', this.didFinishLaunching.bind(this));
}


WallyPlatform.prototype.configureAccessory = function (homebridgeAccessory) {
	this.log("Configuring cached Homebridge accessory...");
	this.log.debug(homebridgeAccessory);
	var sensorCode = homebridgeAccessory.context['code'];
	homebridgeAccessory.reachable = false;
	if (homebridgeAccessory.context['idCode']) {
		this.idCode = homebridgeAccessory.context['idCode'];   // This is a bit hackish...
	}
	this.log.info("Cached | " + homebridgeAccessory.displayName + " | " + sensorCode);
	this.homebridgeAccessories[sensorCode] = homebridgeAccessory;
};


WallyPlatform.prototype.didFinishLaunching = function () {
	this.log.debug("Finished launching...");
	if (!this.idCode) {
		this.id();
	} else {
		this.update();
	}

};


WallyPlatform.prototype.id = function (callback) {
	this.log.debug("Requesting ID...");
	var options = {
		hostname: 'api.snsr.net',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + this.apiToken
		},
		path: '/v2/places',
		method: 'GET'
	};
	var request = Https.request(options, function (response) {
		var data = '';
		response.on('data', function (chunk) {
			data += chunk;
		});
		response.on('end', function () {
			var reply = JSON.parse(data);
			this.log.debug(reply);
			this.idCode = reply[0]['id'];
			this.log.debug("Site ID is " + this.idCode);
			this.update();
		}.bind(this));
	}.bind(this));
	request.on('error', function (error) {
		this.log.error(error + " Retrying request.");
		setTimeout(this.id.bind(this), 1000);
	}.bind(this));
	request.end();
};


WallyPlatform.prototype.update = function (callback) {
	this.log.debug("Updating sensors with fresh data...");
	var options = {
		hostname: 'api.snsr.net',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + this.apiToken
		},
		path: '/v2/places/' + this.idCode + '/sensors',
		method: 'GET'
	};
	this.log.debug(options);
	var request = Https.request(options, function (response) {
		var data = '';
		response.on('data', function (chunk) {
			data += chunk;
		});
		response.on('end', function () {
			var reply = JSON.parse(data);
			this.log.debug(reply);
			this.log.debug("Updating sensors");
			this.sensors(reply);
			setTimeout(this.update.bind(this), this.refreshTime*1000);
			this.log.debug("Waiting | " + this.refreshTime + " seconds");
			if (callback) callback();
		}.bind(this));
	}.bind(this));
	request.on('error', function (error) {
		this.log.error(error + " Retrying request.");
		setTimeout(this.update.bind(this), 1000);
	}.bind(this));
	this.log.debug(request);
	request.end();
};


WallyPlatform.prototype.sensors = function (reply) {
	this.log.debug("Setting values of sensors...");

	for (var sensorConfig of reply) {
		var sensorCode = sensorConfig.snid;
		var sensor = this.wallyAccessories[sensorCode];

		if (!sensor) {
			var homebridgeAccessory = this.homebridgeAccessories[sensorCode];
			if (!homebridgeAccessory) {
				this.log.info("Create | " + sensorConfig.location.room + "  " + sensorConfig.location.appliance);
				homebridgeAccessory = new Accessory(sensorConfig.location.room, UUIDGen.generate(sensorCode));
				homebridgeAccessory.context['code'] = sensorCode;
				this.homebridgeAPI.registerPlatformAccessories("homebridge-Wally", "Wally", [homebridgeAccessory]);
			} else {
				this.log.debug("Cached | " + sensorConfig.location.room + " " + sensorConfig.location.appliance);
				delete this.homebridgeAccessories[sensorCode];
			}
			sensor = new WallySensor(this.log, sensorConfig, this, homebridgeAccessory);
			this.wallyAccessories[sensorCode] = sensor;
		} else {
			sensor.update(sensorConfig);
		}
	}

	this.clean();
};


WallyPlatform.prototype.clean = function () {
	this.log.debug("Cleaning unused cached Homebridge accessories...");
	this.log.debug(this.homebridgeAccessories);
	for (var sensorCode in this.homebridgeAccessories) {
		var homebridgeAccessory = this.homebridgeAccessories[sensorCode];
		this.log.info("Remove | " + homebridgeAccessory.displayName + " - " + sensorCode);
		this.homebridgeAPI.unregisterPlatformAccessories("homebridge-Wally", "Wally", [homebridgeAccessory]);
	}
};