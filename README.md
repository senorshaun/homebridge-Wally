# homebridge-Wally
HomeBridge plugin for the Wally Home platform

All you need is the API security token, created under the Settings page of https://my.wallyhome.com/

This plugin will pull all sensors, and their configurated types from Wally. I haven't tested with multiple base stations at different locations. By default, all contact sensors are 'Contact Sensors' but this can be changed to Window, Door, Garage Door, Blinds, etc. once the sensor is found and added to HomeKit.

By default, each device will be named via Wally's Room and Appliance descriptors (i.e. "Garage Hot Water Heater"). This can be changed in HomeKit, though your HomeBridge log will still show the Wally name if you are showing it.
Update your config.json to include the new platform.


    {
    
      "platform": "Wally",
      
      "name": "Wally",
      
      "api_Token": "47f08444-1a76-4320-a84f-6fe9dadd32e1"
      
      "refresh_Time": 30 //Optional. Integer. Default 30
      
      "expose_Humidity_Sensor": false //Optional. Boolean. Default: false
      
      "expose_Temp_Sensor": false //Optional. Boolean. Default: false
      
      "log_Refresh": false //Option. Boolean. Defaults: false
      
    }
  
  Optional Parameters:
  
  refresh_Time - This is in seconds. Change this if you want to poll Wally less often for data.
  
  expose_Humidity_Sensor - Change to true if you want a humidity sensor tile added to your HomeKit set up. This is done for either quick viewing or alerts. Leak Sensor and Temp Sensor tiles will show relative humidity in the detail view regardless of this setting.
  
  expose_Temp_Sensor - Change to true if you want a temp sensor tile added to your HomeKit set up.
  
  log_Refresh - Change this to true if you want your HomeKit log to display the updated values for each refresh made. False allows for less clutter if you don't need it.
  
