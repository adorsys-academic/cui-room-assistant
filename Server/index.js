// import modules
var bst = require("bespoken-tools");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var {
  google
} = require('googleapis');
//var googleAuth = require('google-auth-library');
var moment = require('moment');
var authorization = require('./authorization');
var persistence = require('./persistence');
var helpermethods = require('./helpermethods');

app.use(bodyParser.json());

// Sets server port on 8080 and listens..
app.listen(8080);

// Getting requests and decides what to do
app.post('/', function (request, response) {
  helpermethods.getNeccessaryData(request, function (sessionData) {
    console.log(sessionData);
    switch (sessionData.intent.name) {
      case "Default Welcome Intent":
        if (typeof request.body.queryResult.outputContexts !== "undefined") {
          var person_id = request.body.queryResult.outputContexts[0].name;
          person_id = person_id.substring(person_id.length - 21, person_id.length);
          welcomeMessage(sessionData, person_id, response);
        }
        break;
      case "BucheRaumIntent":
        // If user choose no specific room -> get the first free room
        if (sessionData.parameters.room === 'RX') {
          var startTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.starttime);
          var endTime = moment(startTime).add(1, 'hours').format();
          getFirstFreeRoom(startTime, endTime, sessionData.oauth2Client, function (room) {
            sessionData.parameters.room = room;
            checkRoomAvailableForOneHour(sessionData, response);
          });
        } else {
          checkRoomAvailableForOneHour(sessionData, response);
        }
        break;
      case "AskEndTimeIntent":
        checkRoomAvailableForTimeslot(sessionData, response);
        break;
      case "BookRoomWithTitleIntent":
        addTitle(sessionData, response);
        break;
      case "BookRoomWithoutTitleIntent":
        addTitle(sessionData, response);
        break;
      case "RaumVerfuegbarIntent":
        showAvailableRooms(sessionData, response);
        break;
      case "RaumVerfuegbarBuchenIntent":
        responseSlider(sessionData, response);
        break;
      case "AcceptBookingIntent":
        createCalendarEvent(sessionData, response);
        break;
      default:
        dontUnderstand(sessionData, response);
        break;
    }
  });
});

function addTitle(sessionData, response) {
  // Wenn kein Titel vorhanden ist, Standardtitel nehmen
  var title;
  if ((sessionData.parameters.title === undefined) || (sessionData.parameters.title === ''))
    title = "Meeting from " + sessionData.userData.email;
  else
    title = sessionData.parameters.title;

  var startTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.starttime);

  // get the endtime, either from format 'duration' or 'endtime' 
  var endTime;
  if ((sessionData.parameters.duration === '') && (sessionData.parameters.endtime === '')) {
    endTime = '';
  } else if (sessionData.parameters.duration !== '') {
    endTime = helpermethods.calculateEndTime(startTime, sessionData.parameters.duration);
  } else if (sessionData.parameters.endtime != '') {
    endTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.endtime);
  }

  var room = sessionData.parameters.room;

  var startPhraseDate = moment(startTime).format('DD.MM.YY');
  var startPhraseHours = moment(startTime).format('HH:mm');
  var endPhraseHours = moment(endTime).format('HH:mm');
  var daysDiff = moment(startTime).startOf('day').diff(moment(Date.now()).startOf('day'), 'days');

  var dayOfWeek;
  if (daysDiff == 0)
    dayOfWeek = "heute";
  else if (daysDiff == 1)
    dayOfWeek = "morgen";
  else
    dayOfWeek = helpermethods.getDayOfWeek(moment(startTime).day());

  var textResponse = "Soll ich für " + dayOfWeek + ", den " + startPhraseDate + " von " + startPhraseHours + " Uhr bis " + endPhraseHours + " Uhr den Raum " + room + " für dich buchen?";

  var res = new Object({
    "payload": {
      "android": {
        "type": "button",
        "text": textResponse
      }
    },
    "outputContexts": [{
      "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/confirm-booking",
      "lifespanCount": 1,
      "parameters": sessionData.parameters
    }],
  });
  response.setHeader('Content-Type', 'application/json');
  return response.send(JSON.stringify(res));
}

// response a slider for choosing the duration
function responseSlider(sessionData, response) {
  var res = new Object({
    "payload": {
      "android": {
        "type": "durationslider",
        "text": "Wie lange soll der Termin dauern?"
      }
    },
    "outputContexts": [{
      "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/room-free",
      "lifespanCount": 1,
      "parameters": sessionData.parameters
    }],
  });
  response.setHeader('Content-Type', 'application/json');
  return response.send(JSON.stringify(res));
}

// Check if User has given Calendar Access -> Response with Welcome or Authorization Message
function welcomeMessage(sessionData, person_id, response) {
  console.log("welcomeMessage");
  if (sessionData.session_id != null) {
    persistence.updateUserDataPersonId(sessionData.session_id, person_id, function () {
      persistence.getStoredDataFromSessionId(sessionData.session_id, function (userData) {
        console.log(userData);
        if ((userData.access_token === '') || (userData.access_token === "undefined") || (userData.access_token === undefined)) {
          authorization.getAuthUrl(function (authUrl) {
            var res = new Object({
              "payload": {
                "android": {
                  "type": "textmessage",
                  "text": "Hallo, ich bin dein persönlicher Raum Assistent. Um alle Funktionen nutzen zu können, musst du mir einmalig Zugriff auf deinen Kalender gewähren. " +
                    "Dazu öffnet sich ein Browserfenster. Bitte schicke mir anschlieißend den erhaltenen Code."
                }
              },
              "source": authUrl
            });
            console.log(res);
            response.setHeader('Content-Type', 'application/json');
            return response.send(JSON.stringify(res));
          });
        } else if (userData.access_token !== '') {
          var textArray = [
            'Hey, willkommen zurück.',
            'Hi ' + userData.given_name + '! Wie kann ich dir helfen?',
            'Willkommen zurück, ' + userData.given_name + '! Was kann ich für dich tun?',
            'Hallo ' + userData.given_name + '. Was gibts?',
            'Wie kann ich dir heute helfen?',
            'Hallo. Was kann ich für dich tun?',
            'Schön dich zu sehen. Was kann ich für dich tun?'
          ]
          var randomNumber = Math.floor(Math.random() * textArray.length);
          var randomString = textArray[randomNumber];
          var res = new Object({
            "payload": {
              "android": {
                "type": "textmessage",
                "text": randomString
              }
            }
          });
          console.log(res);
          response.setHeader('Content-Type', 'application/json');
          return response.send(JSON.stringify(res));
        }
      });
    });
  }
}

// Check if Room is available from now, for 1 hour
function checkRoomAvailableForOneHour(sessionData, response) {
  console.log("checkRoomAvailableForOneHour");
  var startTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.starttime);
  var endTime = moment(startTime).add(1, 'hours').format();
  var room = sessionData.parameters.room;
  isRoomAvailablePromise(room, startTime, endTime, sessionData.oauth2Client).then(function (result) {
    if (result == true) {
      var res = new Object({
        "payload": {
          "android": {
            "type": "durationslider",
            "text": "Der Raum " + room + " ist zu dieser Zeit noch frei. Wie lange möchtest du ihn buchen?"
          }
        },
        "outputContexts": [{
          "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/room-free",
          "lifespanCount": 1,
          "parameters": sessionData.parameters
        }],
      });
      response.setHeader('Content-Type', 'application/json');
      return response.send(JSON.stringify(res));
    } else if (result == false) {
      var textResponse = "Der Raum " + room + " ist zu dieser Zeit leider schon belegt. "
      var textFreeRooms = "";
      getRoomStates(startTime, endTime, sessionData.oauth2Client, function (roomState) {
        var freeRoomCount = 0;
        for (var roomName in roomState) {
          if (roomState[roomName] == true) {
            textFreeRooms += " " + roomName;
            freeRoomCount++;
          }
        }
        if (freeRoomCount == 0)
          textResponse += "Auch sonst sind in dieser Zeit alle Räume belegt. Wenn du dein Meeting nicht verschieben willst, kannst du auf die mobilen Arbeitsplätze ausweichen oder eine Sofaecke nutzen.";
        else if (freeRoomCount == 1) {
          textResponse += "Zu dieser Zeit ist nur der Raum" + textFreeRooms + " frei. Möchtest du ihn buchen?";
          sessionData.parameters["room"] = textFreeRooms.substring(1, 3);
          var res = new Object({
            "payload": {
              "android": {
                "type": "button",
                "text": textResponse
              }
            },
            "outputContexts": [{
              "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/RaumVerfuegbarIntent-followup",
              "lifespanCount": 2,
              "parameters": sessionData.parameters
            }],
          });
          response.setHeader('Content-Type', 'application/json');
          return response.send(JSON.stringify(res));
        } else
          textResponse += "Für diesen Zeitraum habe ich folgende frei Räume gefunden:" + textFreeRooms;

        var res = new Object({
          "payload": {
            "android": {
              "type": "textmessage",
              "text": textResponse
            }
          },
          "outputContexts": [{
            "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/room-free",
            "lifespanCount": 0,
            "parameters": sessionData.parameters
          }],
        });
        response.setHeader('Content-Type', 'application/json');
        return response.send(JSON.stringify(res));
      });
    }
  });
}

// Check if Room is available from given starttime to endtime
function checkRoomAvailableForTimeslot(sessionData, response) {
  console.log("checkRoomAvailableForTimeslot");
  var startTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.starttime);

  // get the endtime, either from format 'duration' or 'endtime' 
  var endTime;
  if ((sessionData.parameters.duration === '') && (sessionData.parameters.endtime === '')) {
    endTime = '';
  } else if (sessionData.parameters.duration !== '') {
    endTime = helpermethods.calculateEndTime(startTime, sessionData.parameters.duration);
  } else if (sessionData.parameters.endtime != '') {
    endTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.endtime);
  }

  var room = sessionData.parameters.room;
  if (endTime === '') {
    var res = new Object({
      "payload": {
        "android": {
          "type": "durationslider",
          "text": "Sorry, nochmal bitte. Wie lange soll der Termin gehen?"
        }
      },
      "outputContexts": [{
        "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/room-free",
        "lifespanCount": 1,
        "parameters": sessionData.parameters
      }],
    });
    response.setHeader('Content-Type', 'application/json');
    return response.send(JSON.stringify(res));
  } else {
    isRoomAvailablePromise(room, startTime, endTime, sessionData.oauth2Client).then(function (result) {
      if (result == true) {
        var start = moment(startTime);
        var end = moment(endTime);
        var duration = moment.duration(end.diff(start));
        var hoursDiff = duration.asHours();
        if (hoursDiff >= 1.5) {
          var res = new Object({
            "payload": {
              "android": {
                "type": "textmessage",
                "text": "Welchen Titel soll dein Termin haben?"
              }
            },
            "outputContexts": [{
              "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/AskEndTimeIntent-followup",
              "lifespanCount": 1,
              "parameters": sessionData.parameters
            }],
          });
          response.setHeader('Content-Type', 'application/json');
          return response.send(JSON.stringify(res));
        } else {
          var res = new Object({
            "payload": {
              "android": {
                "type": "button",
                "text": "Sehr gerne, " + sessionData.userData.given_name + ". Möchtest du dem Termin einen Titel hinzufügen?"
              }
            },
            "outputContexts": [{
              "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/AskEndTimeIntent-followup",
              "lifespanCount": 1,
              "parameters": sessionData.parameters
            }],
          });
          response.setHeader('Content-Type', 'application/json');
          return response.send(JSON.stringify(res));
        }
      } else if (result == false) {
        var textResponse = "So lange ist der Raum " + room + "leider nicht frei. "
        var textFreeRooms = "";
        getRoomStates(startTime, endTime, sessionData.oauth2Client, function (roomState) {
          var freeRoomCount = 0;
          for (var roomName in roomState) {
            if (roomState[roomName] == true) {
              textFreeRooms += " " + roomName;
              freeRoomCount++;
            }
          }
          if (freeRoomCount == 0)
            textResponse += "Auch sonst sind in dieser Zeit alle Räume belegt. Wenn du dein Meeting nicht verschieben willst, kannst du auf die mobilen Arbeitsplätze ausweichen oder eine Sofaecke nutzen.";
          else if (freeRoomCount == 1) {
            textResponse += "Zu dieser Zeit ist nur der Raum" + textFreeRooms + " frei. Möchtest du ihn buchen?";
            sessionData.parameters["room"] = textFreeRooms.substring(1, 3);
            var res = new Object({
              "payload": {
                "android": {
                  "type": "button",
                  "text": textResponse
                }
              },
              "outputContexts": [{
                "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/RaumVerfuegbarIntent-followup",
                "lifespanCount": 2,
                "parameters": sessionData.parameters
              }],
            });
            response.setHeader('Content-Type', 'application/json');
            return response.send(JSON.stringify(res));
          } else
            textResponse += "Für diesen Zeitraum habe ich folgende frei Räume gefunden:" + textFreeRooms;
          var res = new Object({
            "payload": {
              "android": {
                "type": "textmessage",
                "text": textResponse
              }
            },
            "outputContexts": [{
              "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/room-free",
              "lifespanCount": 0,
              "parameters": sessionData.parameters
            }],
          });
          response.setHeader('Content-Type', 'application/json');
          return response.send(JSON.stringify(res));
        });
      }
    });
  }
}

// Create a Google Calendar Event and book the room
function createCalendarEvent(sessionData, response) {
  // Wenn kein Titel vorhanden ist, Standardtitel nehmen
  var title;
  if ((sessionData.parameters.title === undefined) || (sessionData.parameters.title === ''))
    title = "Meeting from " + sessionData.userData.email;
  else
    title = sessionData.parameters.title;

  var startTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.starttime);

  // get the endtime, either from format 'duration' or 'endtime' 
  var endTime;
  if ((sessionData.parameters.duration === '') && (sessionData.parameters.endtime === '')) {
    endTime = '';
  } else if (sessionData.parameters.duration !== '') {
    endTime = helpermethods.calculateEndTime(startTime, sessionData.parameters.duration);
  } else if (sessionData.parameters.endtime != '') {
    endTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.endtime);
  }

  var room = sessionData.parameters.room;
  var roomAdress = helpermethods.getRoomAdress(room);

  var calendar = google.calendar({
    version: 'v3'
  });
  var event = {
    'summary': title,
    'location': 'Fürther Str. 246a, 90429 Nürnberg',
    'description': 'Meeting was created via Chatbot for Conversational Room Booking.\nFor more information please contact mwa@adorsys.de',
    'start': {
      'dateTime': startTime,
      "timeZone": "Europe/Zurich"
    },
    'end': {
      'dateTime': endTime,
      "timeZone": "Europe/Zurich"
    },
    'recurrence': [
      'RRULE:FREQ=DAILY;COUNT=1'
    ],
    'attendees': [{
        'email': sessionData.userData.email
      },
      {
        'email': roomAdress
      }
    ],
    'reminders': {
      'useDefault': false,
      'overrides': [{
          'method': 'email',
          'minutes': 24 * 60
        },
        {
          'method': 'popup',
          'minutes': 10
        },
      ],
    },
  };
  calendar.events.insert({
    auth: sessionData.oauth2Client,
    calendarId: sessionData.userData.email,
    resource: event,
  }, function (err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      var res = new Object({
        "payload": {
          "android": {
            "type": "textmessage",
            "text": "Tut mir leid. Es ist ein Fehler aufgetreten, der Raum konnte nicht gebucht werden."
          }
        }
      });
      response.setHeader('Content-Type', 'application/json');
      return response.send(JSON.stringify(res));
    }
    var startPhraseDate = moment(startTime).format('DD.MM.YY');
    var startPhraseHours = moment(startTime).format('HH:mm');
    var endPhraseHours = moment(endTime).format('HH:mm');
    var daysDiff = moment(startTime).startOf('day').diff(moment(Date.now()).startOf('day'), 'days');

    var dayOfWeek;
    if (daysDiff == 0)
      dayOfWeek = "heute";
    else if (daysDiff == 1)
      dayOfWeek = "morgen";
    else
      dayOfWeek = helpermethods.getDayOfWeek(moment(startTime).day());

    var textResponse = "Ich habe für dich " + dayOfWeek + ", den " + startPhraseDate + " von " + startPhraseHours + " Uhr bis " + endPhraseHours + " Uhr den Raum " + room + " gebucht.";

    var res = new Object({
      "payload": {
        "android": {
          "type": "textmessage",
          "text": textResponse
        }
      }
    });
    response.setHeader('Content-Type', 'application/json');
    return response.send(JSON.stringify(res));
  });
}

// Show the Available Rooms for user query
function showAvailableRooms(sessionData, response) {
  console.log("showAvailableRooms");
  var startTime;
  if ((sessionData.parameters.date === '') && (sessionData.parameters.starttime === '')) {
    startTime = moment().format();
  } else if ((sessionData.parameters.date === '') && (sessionData.parameters.starttime !== '')) {
    startTime = sessionData.parameters.starttime;
  } else if ((sessionData.parameters.date !== '') && (sessionData.parameters.starttime !== '')) {
    startTime = helpermethods.combineDateTime(sessionData.parameters.date, sessionData.parameters.starttime);
  }
  // add parameters 'date' and 'starttime' to sessionData for ouputcontext
  sessionData.parameters["date"] = startTime;
  sessionData.parameters["starttime"] = startTime;
  var room = sessionData.parameters.room;
  var endTime = moment(startTime).add(1, 'hours').format();
  if (room !== 'RX') {
    isRoomAvailablePromise(room, startTime, endTime, sessionData.oauth2Client).then(function (result) {
      if (result === true) {
        var res = new Object({
          "payload": {
            "android": {
              "type": "button",
              "text": "Der Raum " + room + " ist zu diesem Zeitpunkt noch frei. Möchtest du ihn buchen?"
            }
          },
          "outputContexts": [{
            "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/RaumVerfuegbarIntent-followup",
            "lifespanCount": 2,
            "parameters": sessionData.parameters
          }],
        });
        response.setHeader('Content-Type', 'application/json');
        return response.send(JSON.stringify(res));
      } else if (result === false) {
        var textResponse = "Der Raum " + room + " ist zu diesem Zeitpunkt leider nicht mehr frei. "
        var textFreeRooms = "";
        getRoomStates(startTime, endTime, sessionData.oauth2Client, function (roomState) {
          var freeRoomCount = 0;
          for (var roomName in roomState) {
            if (roomState[roomName] == true) {
              textFreeRooms += " " + roomName;
              freeRoomCount++;
            }
          }
          if (freeRoomCount == 0)
            textResponse += "Auch sonst sind zu dieser Zeit alle Räume belegt. Wenn du dein Meeting nicht verschieben willst, kannst du auf die mobilen Arbeitsplätze ausweichen oder eine Sofaecke nutzen.";
          else if (freeRoomCount == 1) {
            textResponse += "Zu dieser Zeit ist nur der Raum" + textFreeRooms + " frei. Möchtest du ihn buchen?";
            sessionData.parameters["room"] = textFreeRooms.substring(1, 3);
            var res = new Object({
              "payload": {
                "android": {
                  "type": "button",
                  "text": textResponse
                }
              },
              "outputContexts": [{
                "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/RaumVerfuegbarIntent-followup",
                "lifespanCount": 2,
                "parameters": sessionData.parameters
              }],
            });
            response.setHeader('Content-Type', 'application/json');
            return response.send(JSON.stringify(res));
          } else
            textResponse += "Zu dieser Zeit habe ich folgende frei Räume gefunden:" + textFreeRooms;

          var res = new Object({
            "payload": {
              "android": {
                "type": "textmessage",
                "text": textResponse
              }
            }
          });
          response.setHeader('Content-Type', 'application/json');
          return response.send(JSON.stringify(res));
        });
      }
    });
  } else {
    var textResponse = "";
    var textFreeRooms = "";
    getRoomStates(startTime, endTime, sessionData.oauth2Client, function (roomState) {
      var freeRoomCount = 0;
      for (var roomName in roomState) {
        if (roomState[roomName] == true) {
          textFreeRooms += " " + roomName;
          freeRoomCount++;
        }
      }

      if (freeRoomCount == 0)
        textResponse += "Zu dieser Zeit sind leider alle Räume belegt. Wenn du dein Meeting nicht verschieben willst, kannst du auf die mobilen Arbeitsplätze ausweichen oder eine Sofaecke nutzen.";
      else if (freeRoomCount == 1) {
        textResponse += "Zu dieser Zeit ist nur der Raum" + textFreeRooms + " frei. Möchtest du ihn buchen?";
        sessionData.parameters["room"] = textFreeRooms.substring(1, 3);
        var res = new Object({
          "payload": {
            "android": {
              "type": "button",
              "text": textResponse
            }
          },
          "outputContexts": [{
            "name": "projects/chatbot-1525781892433/agent/sessions/" + sessionData.session_id + "/contexts/RaumVerfuegbarIntent-followup",
            "lifespanCount": 2,
            "parameters": sessionData.parameters
          }],
        });
        response.setHeader('Content-Type', 'application/json');
        return response.send(JSON.stringify(res));
      } else
        textResponse += "Zu dieser Zeit habe ich folgende freie Räume gefunden:" + textFreeRooms;

      var res = new Object({
        "payload": {
          "android": {
            "type": "textmessage",
            "text": textResponse
          }
        }
      });
      response.setHeader('Content-Type', 'application/json');
      return response.send(JSON.stringify(res));
    });
  }
}

// returns the available rooms
function getRoomStates(startTime, endTime, oauth2Client, callback) {
  console.log("getRoomStates");
  var roomState = {
    R1: false,
    R2: false,
    R4: false,
    R3: false,
    R6: false
  }
  isRoomAvailablePromise("R1", startTime, endTime, oauth2Client).then(function (result) {
    roomState.R1 = result;
    return isRoomAvailablePromise("R2", startTime, endTime, oauth2Client);
  }).then(function (result) {
    roomState.R2 = result;
    return isRoomAvailablePromise("R3", startTime, endTime, oauth2Client);
  }).then(function (result) {
    roomState.R3 = result;
    return isRoomAvailablePromise("R4", startTime, endTime, oauth2Client);
  }).then(function (result) {
    roomState.R4 = result;
    return isRoomAvailablePromise("R6", startTime, endTime, oauth2Client);
  }).then(function (result) {
    roomState.R6 = result;
    callback(roomState);
  });
}

// get the first free room
function getFirstFreeRoom(startTime, endTime, oauth2Client, callback) {
  console.log("getFirstFreeRoom")
  getRoomStates(startTime, endTime, oauth2Client, function (roomState) {
    for (var roomName in roomState) {
      console.log(roomName + " ist " + roomState[roomName]);
      if (roomState[roomName] == true) {
        callback(roomName);
        break;
      }
    }
  });
}

// Check if Room is available between starttime and endtime, returns a boolean
var isRoomAvailablePromise = function (roomName, startTime, endTime, oauth2Client) {
  console.log("isRoomAvailablePromise");
  var roomAdress = helpermethods.getRoomAdress(roomName);
  return new Promise(function (resolve) {
    var calendar = google.calendar({
      version: 'v3'
    });
    calendar.events.list({
      auth: oauth2Client,
      calendarId: roomAdress,
      timeMin: startTime,
      timeMax: endTime,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, {
      data
    }) => {
      if (err) return console.log('The API returned an error: ' + err);
      const events = data.items;
      if (events.length) {
        resolve(false); // Raum belegt
      } else {
        resolve(true); // Raum frei
      }
    });
  });
}

// Create oder just update the Data of the current User (most times: update session_id)
app.post('/verifyUser', function (request, response) {
  console.log('app.post - /verifyUser');
  var session_id = request.body.session_id;
  var androidIdToken = request.body.androidIdToken;
  if (session_id != null) {
    persistence.updateUserDataAndroidToken(session_id, androidIdToken, function (msg) {
      return response.send(msg);
    });
  } else {
    return response.send("SessionId was 'null' - not Updated");
  }
});

// Receive Auth Code, then Generate and store the new token
app.post('/receiveAuthCode', function (request, response) {
  console.log('app.post - /receiveAuthCode');
  var androidIdToken = request.body.androidIdToken;
  var code = request.body.authCode;
  authorization.receiveAuthCode(code, function (token) {
    if (token == undefined)
      return response.send("Ungültiger Code. Bitte versuche dich auf der Startseite erneut anzumelden.");
    else {
      persistence.storeNewToken(androidIdToken, token, function (msg) {
        return response.send(msg);
      });
    }
  });
});

// Create and Response AuthUrl 
function responseAuthUrl(response) {
  console.log("responseAuthUrl");
  authorization.getAuthUrl(function (authUrl) {
    var res = new Object({
      "fulfillmentText": "Um alle Funktionen nutzen zu können, musst du mir einmalig Zugriff auf deinen Kalender gewähren. " +
        "Dazu öffnet sich ein Browserfenster. Bitte schicke mir anschlieißend den erhaltenen Code." + "\n" + authUrl,
      "source": authUrl
    });
    response.setHeader('Content-Type', 'application/json');
    return response.send(JSON.stringify(res));
  });
}


// If no intent is matched 
function dontUnderstand(sessionData, response) {
  console.log("dontUnderstand");
  var res = new Object({
    "fulfillmentText": "Das habe ich nicht verstanden. Kannst du das wiederholen?",
  });
  response.setHeader('Content-Type', 'application/json');
  return response.send(JSON.stringify(res));
}