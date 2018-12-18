var moment = require('moment');
var authorization = require('./authorization');
var persistence = require('./persistence');

function getNeccessaryData(request, callback) {
  console.log("getNeccessaryData");
  // getting neccessary parameters from request query
  //var session_id = "d92033d4-db5a-4da4-a09b-1372d8ffb099";  // for testing
  var session_id = request.body.session;
  session_id = session_id.substring(session_id.length - 36, session_id.length);
  var intent_id = request.body.queryResult.intent.name;
  intent_id = intent_id.substring(intent_id.length - 36, intent_id.length)
  var intent_name = request.body.queryResult.intent.displayName;
  var parameters = request.body.queryResult.parameters;
  var context = request.body.queryResult.outputContexts;
  // If there are also parameters in the Context, add them!
  if (typeof context !== "undefined") {
    //console.log(request.body.queryResult.outputContexts[0].parameters);
    for (var i in context) {
      var paramContext = context[i].parameters;
      parameters = { ...paramContext,
      ... parameters
    };
    }
 }

  // get stored user data and oauth2Client from database
  persistence.getStoredDataFromSessionId(session_id, function (userData) {
    authorization.authorize(userData, function (oauth2Client) {
      // Create result Object
      var result = new Object({
        "session_id": session_id,
        "parameters": parameters,
        "intent": {
          "id": intent_id,
          "name": intent_name,
        },
        "userData": userData,
        "oauth2Client": oauth2Client
      });
      callback(result);
    });
  });
}

// Creating startTime from different parameters 
function combineDateTime(date, time) {
  console.log("combineDateTime");
  // Getting necessary parameters
  date = moment(date).format('YYYY-MM-DD');
  time = moment(time).format('HH:mm:ss');
  var glz = date.substring(19, date.length);
  // Create startTime in 'moment-format' from parameters
  var result = moment(date + 'T' + time + glz).format();
  return result;
}

// Calculate endTime from startTime and duration 
function calculateEndTime(startTime, duration) {
  console.log("calculateEndTime");
  // Adding duration for both cases: amount can be in hours or in minutes
  if (duration.unit == "stunde")
    var endTime = moment(startTime).add(duration.amount, 'hours').format();
  else if (duration.unit == "min")
    var endTime = moment(startTime).add(duration.amount, 'minutes').format();

  return endTime;
}

// Getting the Adress of the Office Rooms
function getRoomAdress(room) {
  console.log("getRoomAdress");
  switch (room) {
    case "R1":
      room = "<YOUR-ROOM-ADRESS>";
      break;
    case "R2":
      room = "<YOUR-ROOM-ADRESS>";
      break;
    case "R3":
      room = "<YOUR-ROOM-ADRESS>";
      break;
    case "R4":
      room = "<YOUR-ROOM-ADRESS>";
      break;
    case "R6":
      room = "<YOUR-ROOM-ADRESS>";
      break;
    default:
      room = "default"
      break;
  }
  return room;
}

function getDayOfWeek(day) {
  switch (day) {
    case 0:
      day = "Sonntag"
      break;
    case 1:
      day = "Montag"
      break;
    case 2:
      day = "Dienstag"
      break;
    case 3:
      day = "Mittwoch"
      break;
    case 4:
      day = "Donnerstag"
      break;
    case 5:
      day = "Freitag"
      break;
    case 6:
      day = "Samstag"
      break;
  }
  return day;
}

module.exports = {
  getNeccessaryData,
  getRoomAdress,
  combineDateTime,
  calculateEndTime,
  getDayOfWeek
}