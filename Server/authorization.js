// import modules
var fs = require('fs');
//var googleAuth = require('google-auth-library');
var {
  google
} = require('googleapis');
var SCOPES = ['https://www.googleapis.com/auth/calendar']; // this scope allows read/write access to Calendar  
var CLIENTSECRETPATH = 'client_secret.json'

// Initializes an oauth2Client with constant values from a file
function initialOauth2Client(callback) {
  console.log("initialOauth2Client");
  // Getting the values for client_secret, client_id, redirect_uris from a file
  fs.readFile(CLIENTSECRETPATH, function (err, content) {
    if (err) {
      throw new Error('Error loading client secret file: ' + err);
    }
    var credentials = JSON.parse(content);
    const {
      client_secret,
      client_id,
      redirect_uris
    } = credentials.installed;
    // Creating a new oauth2Client with values from above
    var oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    callback(err, oauth2Client);
  });
}

// Creates an oauth2Client with all the neccessary data
function authorize(token, callback) {
  console.log("authorize");
  initialOauth2Client(function (err, oauth2Client) {
    if (err)
      console.log('Error while creating the oauth2Client', err);
    // Storing the values access_token, refresh_token and expiry_date to oauth2Client
    oauth2Client.credentials = token;
    callback(oauth2Client);
  });
}

// Refresh the Token
function refreshAccessToken(oldToken, callback) {
  console.log("refreshAccessToken");
  initialOauth2Client(function (err, oauth2Client) {
    if (err) {
      console.log('Error while creating the oauth2Client', err);
    }
    // Setting up an oauth2Client with the old token
    oauth2Client.credentials = oldToken;
    // Call oauth2Client-method refreshAccessToken -> provides new tokens
    oauth2Client.refreshAccessToken(function (err, newToken) {
      if (err)
        console.log('Error while trying to refresh access token', err);
      oauth2Client.credentials = newToken;
      callback(err, newToken);
    });
  });
}

// Generate AuthUrl from Client Secrets
function getAuthUrl(callback) {
  console.log("getAuthUrl");
  fs.readFile(CLIENTSECRETPATH, function (err, content) {
    if (err) {
      throw new Error('Error loading client secret file: ' + err);
    }
    var credentials = JSON.parse(content);
    const {
      client_secret,
      client_id,
      redirect_uris
    } = credentials.installed;
    // Creating a new oauth2Client with values from above
    var oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    callback(authUrl);
  });
}

// Receive the Auth Code and Generate a Token using the initialOauth2Client
function receiveAuthCode(code, callback) {
  console.log("receiveAuthCode");
  initialOauth2Client(function (err, oauth2Client) {
    if (err)
      console.log('Error while creating oauth2Client', err);
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        callback(undefined);
        return;
      }
      oauth2Client.credentials = token;
      callback(token);
    });
  });
}

module.exports = {
  authorize,
  initialOauth2Client,
  refreshAccessToken,
  getAuthUrl,
  receiveAuthCode
}