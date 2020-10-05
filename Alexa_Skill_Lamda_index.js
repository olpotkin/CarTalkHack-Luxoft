/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const https = require('https');

const carId = '7';
const apiKey = '';

const options = {
  hostname: '71tl3bf6j5.execute-api.eu-central-1.amazonaws.com',
  port: 443,
  path: '/dev-new/cars/' + carId,
  method: "GET"
};

var stateShopping = false;
var stateGas = false;

async function getRequest(param) {

  return new Promise(function(resolve, reject) {
    let req = https.request(options, function(res) {
      let carData;
      console.log(`Server Status: ${res.statusCode}`);
      console.log("Response Headers: %j", res.headers);

      res.on('data', function(data) {
        carData = JSON.parse(data).body.Item; 
        console.log(carData);
      });

      res.on('end', function() {
        const statusCode = res.statusCode;
        console.log("Response ended: " + statusCode);

        if (param == 'fuelLevel') {
          const fuelLevel = carData.carStatus.fuel;
          console.log("Fuel Level: " + fuelLevel);
          resolve(fuelLevel);
        }
        else if (param == 'isCarAvailable') {
          const isCarAvailable = carData.carStatus.location.available;
          console.log("Car Available: " + isCarAvailable);
          resolve(isCarAvailable);
        }
        else if (param == 'getErrorList') {
          const errorList = carData.carStatus.errors;
          console.log("Errors: " + errorList);
          resolve(errorList);
        }
        else {
          resolve(carData.carStatus);
        }

      });

    });

    req.setHeader('x-api-key', apiKey);

    req.on('error', function(err) {
      console.log(`Request error: ${err.message}`);
      reject(err.message);
    });

    req.end();

  });
}


const LaunchHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  },

  async handle(handlerInput) {
    let message = 'down' + FROWN;

    try {
      let carStatus = await getRequest('param');
      message = 'up and running. ' + YOUR_FUEL_LEVEL_IS + `${carStatus.fuel}%. ` + YOUR_MILEAGE_IS + `${carStatus.mileage}km. ` + YOUR_CAR_HAS + `${carStatus.errors.length} ` + ERRORS;
    }
    catch (err) {
      message = 'down' + FROWN;

    }
    const textOutput = message;
    const speechOutput = GET_SKILL_STATUS + message;

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .withSimpleCard(SKILL_NAME, textOutput)
      .getResponse();
  },
};


const IntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'IntentRequest' && request.intent.name != 'AboutIntent');
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let fuelLow = false;

    let message;

//---
    if (request.intent.name === 'FuelIntent') {
      try {
        let fuelLevel = await getRequest('fuelLevel');
        message = YOUR_FUEL_LEVEL_IS + fuelLevel + '%' + FULLSTOP;
        fuelLevel = 9;
        if (fuelLevel <= 10) {
          fuelLow = true;
        }
      }
      catch (err) {
        message = 'error getting fuel level';
      }
    }
//---

    else if (request.intent.name === 'TakeMeHomeIntent') {
      try {
      	let inProgress = true;

        let isCarAvailable = await getRequest('isCarAvailable');
        isCarAvailable = true;

        if (isCarAvailable) {
        	message = 'Car is available. ';
        } else {
        	message = 'Car is busy now. Do you mind to use Uber?';
        	inProgress = false;
        }

        if (inProgress) {
        	let fuelLevel = await getRequest('fuelLevel');
        	fuelLevel = getRandomArbitrary(10, 11);
        	message += YOUR_FUEL_LEVEL_IS + fuelLevel + '%. ';
        	if (fuelLevel <= 10) {
          		message += SPACE + SHOW_GAS_STATION;
          		stateGas = true;
          		inProgress = false;
        	} else {
        		message += " We are going home. Enjoy you ride. "
        	}
        }

      }
      catch (err) {
        message = 'error getting parameters';
      }
    }
//---

    else if (request.intent.name === 'GoForShoppingIntent') {
      try {
        message = "There are " + SHOPPING_LIST.length + " elements in your shopping list: ";

        for (var i in SHOPPING_LIST) {
        	message += SHOPPING_LIST[i] + ", "
        }
        stateShopping = true;
        message += ". Do you want me to find nearest supermarket?";
      }
      catch (err) {
        message = 'error getting parameters';
      }
    }

//---
    else if (request.intent.name === 'AMAZON.YesIntent') {
      try {
        if (stateShopping) {
        	let shop_id = getRandomArbitrary(0, SHOPPING_LIST.length);

        	message = "I found " + MARKET_LIST[shop_id] + " nearby here. Route updated.";
        	stateShopping = false;
        }
        else if (stateGas){
        	message = "We are going to the Shell gas station. I will help you to push the car in the worst case.";
        	stateGas = false;
        }
      }
      catch (err) {
        message = 'error getting parameters';
      }
    }
//---

    else if (request.intent.name === 'ShowErrorsIntent') {
      try {
        let errorList = await getRequest('getErrorList');
        let errIndex = getRandomArbitrary(0, errorList.length);
        message = "You have error with index number " + errIndex;
      }
      catch (err) {
        message = 'error getting parameters';
      }
    }
//---
    else {
      message = request.intent.name;
    }

    const textOutput = message;
    const speechOutput = message;
    if (fuelLow) {
      return handlerInput.responseBuilder
        .speak(speechOutput + SPACE + SHOW_GAS_STATION)
        .reprompt(SHOW_GAS_STATION)
        .withSimpleCard(SKILL_NAME, textOutput)
//      .addDelegateDirective(request.intent)
        .getResponse();
    }
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .withSimpleCard(SKILL_NAME, textOutput)
      .getResponse();
  },
};


const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

///
/// Returns a random number between min (inclusive) and max (exclusive)
///
function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

const SHOPPING_LIST = ['apples', 'water', 'newspaper'];
const MARKET_LIST   = ['Edeka', 'Aldi', 'Rewe'];

const SHOW_GAS_STATION   = 'Do you want me to look up the closest gas station?';
const BUILD_IT           = 'Go build that part your self...';
const SKILL_NAME         = 'Car Talk';
const GET_SKILL_STATUS   = 'Car Talk is ';
const YOUR_INTENT_IS     = 'Your intent is ';
const YOUR_FUEL_LEVEL_IS = 'Your fuel level is ';
const YOUR_MILEAGE_IS    = 'Your mileage is ';
const YOUR_CAR_HAS       = 'Your car has ';
const ERRORS             = 'errors';
const SMILE              = ':)';
const FROWN              = ':(';
const SPACE              = ' ';
const FULLSTOP           = '.';


const GET_FACT_MESSAGE = 'Here\'s your fact: ';
const HELP_MESSAGE     = 'You can say tell me about my car, or, how much fuel do I have left, or, you can say exit... What can I help you with?';
const HELP_REPROMPT    = 'What can I help you with?';
const STOP_MESSAGE     = 'Goodbye!';

const skillBuilder = Alexa.SkillBuilders.standard();


exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchHandler,
    IntentHandler,

    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
