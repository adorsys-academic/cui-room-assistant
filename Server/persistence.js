// import modules
var MongoClient = require('mongodb').MongoClient;
var MongoObject = require('mongodb').ObjectID;
var assert = require('assert');
var bodyParser = require("body-parser");
var verifier = require('google-id-token-verifier');
var authorization = require('./authorization');

var dbName = "roomDatabase";
var url = 'mongodb://localhost:27017/' + dbName;
var collectionName = "user-data";
var CLIENT_ID = "<YOUR-CLIENT-ID>";

function updateUserDataPersonId(session_id, person_id, callback) {
    console.log("updateUserDataPersonId");
    // Find an entry with person_id in the database
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        var db = client.db(dbName);
        db.collection(collectionName).find({
            "person_id": person_id
        }).sort({
            expiry_date: 1
        }).limit(1).toArray(function (err, results) {
            assert.equal(null, err);
            // If there is no entry for this person_id -> insert a new one
            if (results[0] == undefined) {
                db.collection(collectionName).insertOne({
                    "person_id": person_id,
                    "session_id": session_id,
                    "email": "",
                    "given_name": "",
                    "access_token": "",
                    "refresh_token": "",
                    "expiry_date": 0,
                }, function (err, res) {
                    assert.equal(null, err);
                    client.close();
                    callback();
                });
                // If there is an entry for this person_id -> update it, especially session_id
            } else if (results[0] != undefined) {
                db.collection(collectionName).update({
                    "person_id": person_id
                }, {
                    $set: {
                        "person_id": person_id,
                        "session_id": session_id
                    }
                }, {
                    upsert: true
                }, function (err, res) {
                    assert.equal(null, err);
                    client.close();
                    callback();
                });
            }
        });
    });
}

// Verify the android_token, store it's data and session_id in database
function updateUserDataAndroidToken(session_id, androidIdToken, callback) {
    console.log("updateUserDataAndroidToken");
    var person_id;
    var email;
    var given_name;
    // Getting the E-Mail, PersonId and GivenName from AndroidIdToken
    verifier.verify(androidIdToken, CLIENT_ID, function (err, tokenInfo) {
        if (!err) {
            // use tokenInfo in here.
            person_id = tokenInfo.sub;
            email = tokenInfo.email;
            given_name = tokenInfo.given_name;
        }

        // Find an entry with person_id in the database
        MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            var db = client.db(dbName);
            db.collection(collectionName).find({
                "person_id": person_id
            }).sort({
                expiry_date: 1
            }).limit(1).toArray(function (err, results) {
                assert.equal(null, err);
                // If there is no entry for this person_id -> insert a new one
                if (results[0] == undefined) {
                    db.collection(collectionName).insertOne({
                        "person_id": person_id,
                        "session_id": session_id,
                        "email": email,
                        "given_name": given_name,
                        "access_token": "",
                        "refresh_token": "",
                        "expiry_date": 0,
                    }, function (err, res) {
                        assert.equal(null, err);
                        client.close();
                        callback("New User inserted");
                    });
                    // If there is an entry for this person_id -> update it, especially session_id
                } else if (results[0] != undefined) {
                    db.collection(collectionName).update({
                        "person_id": person_id
                    }, {
                        $set: {
                            "person_id": person_id,
                            "session_id": session_id,
                            "email": email,
                            "given_name": given_name
                        }
                    }, {
                        upsert: true
                    }, function (err, res) {
                        assert.equal(null, err);
                        client.close();
                        callback("User Updated");
                    });
                }
            });
        });
    });
}

// returns a complete object with all data 
function getStoredDataFromSessionId(session_id, callback) {
    console.log("getStoredDataFromSessionId");
    var person_id;
    var email;
    var given_name;
    var access_token;
    var refresh_token;
    var expiry_date;
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        var db = client.db(dbName);
        db.collection(collectionName).find({
            "session_id": session_id
        }).sort({
            expiry_date: 1
        }).limit(1).toArray(function (err, results) {
            assert.equal(null, err);
            // Set tokens to undefined, if there is no or no complete entry
            if ((results[0] == undefined) || (results[0].access_token == "") || (results[0].refresh_token == "") || (results[0].expiry_date == 0)) {
                person_id = undefined;
                email = undefined;
                given_name = undefined;
                access_token = undefined;
                refresh_token = undefined;
                expiry_date = undefined;
            }
            // Refresh the Token, if it is not up to date
            else if ((results[0] != undefined) && (results[0].expiry_date < Date.now())) {
                var oldToken = results[0];
                refreshToken(oldToken, function (err, newToken) {
                    assert.equal(null, err);
                    person_id = results[0].person_id;
                    session_id = results[0].session_id;
                    email = results[0].email;
                    given_name = results[0].given_name;
                    access_token = newToken.access_token;
                    refresh_token = newToken.refresh_token;
                    expiry_date = newToken.expiry_date;
                });
                // Token is complete and up to date 
            } else {
                person_id = results[0].person_id;
                session_id = results[0].session_id;
                email = results[0].email;
                given_name = results[0].given_name;
                access_token = results[0].access_token;
                refresh_token = results[0].refresh_token;
                expiry_date = results[0].expiry_date;
            }
            var userData = new Object({
                "person_id": person_id,
                "session_id": session_id,
                "email": email,
                "given_name": given_name,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expiry_date": expiry_date
            });
            client.close();
            callback(userData);
        });
    });
}

// Refresh the Token if it is not up to date
function refreshToken(oldToken, callback) {
    console.log("refreshToken");
    // Call refreshAccessTokenMethod, giving oldToken, getting newToken
    authorization.refreshAccessToken(oldToken, function (err, newToken) {
        if (err)
            throw err;
        // Update the database entry with all values for the newToken
        MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            var db = client.db(dbName);
            db.collection(collectionName).update({
                "session_id": oldToken.session_id
            }, {
                $set: {
                    "access_token": newToken.access_token,
                    "refresh_token": newToken.refresh_token,
                    "expiry_date": newToken.expiry_date
                }
            }, {
                upsert: true
            }, function (err, res) {
                assert.equal(null, err);
                client.close();
                callback(err, newToken);
            });
        });
    })
}

// Store a new created Token to the database
function storeNewToken(androidIdToken, token, callback) {
    console.log("storeNewToken");
    var person_id;
    var email;
    var given_name;
    // Getting the E-Mail, PersonId and GivenName from AndroidIdToken
    verifier.verify(androidIdToken, CLIENT_ID, function (err, tokenInfo) {
        if (!err) {
            // use tokenInfo in here.
            person_id = tokenInfo.sub;
            email = tokenInfo.email;
            given_name = tokenInfo.given_name;
        }
        // Find an entry with this person_id in the database
        MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            var db = client.db(dbName);
            db.collection(collectionName).find({
                "person_id": person_id
            }).sort({
                expiry_date: 1
            }).limit(1).toArray(function (err, results) {
                assert.equal(null, err);
                // If there is no entry for this person_id -> do nothing
                if (results[0] == undefined) {
                    console.log("No entry for this person_id");
                    client.close();
                    callback("Kein passender Nutzer gefunden. Bitte versuche dich auf der Startseite erneut anzumelden.");
                    // If there is an entry for this session -> update the token
                } else if (results[0] != undefined) {
                    db.collection(collectionName).update({
                        "person_id": person_id
                    }, {
                        $set: {
                            "person_id": person_id,
                            "email": email,
                            "given_name": given_name,
                            "access_token": token.access_token,
                            "refresh_token": token.refresh_token,
                            "expiry_date": token.expiry_date
                        }
                    }, {
                        upsert: true
                    }, function (err, res) {
                        assert.equal(null, err);
                        client.close();
                        callback("Herzlichen Glückwunsch, " + given_name + "!\nDie Authorisierung war erfolgreich, du kannst jetzt alle Funktionen nutzen. Viel Spaß!");
                    });
                }
            });
        });
    });
}

module.exports = {
    refreshToken,
    updateUserDataAndroidToken,
    storeNewToken,
    getStoredDataFromSessionId,
    updateUserDataPersonId
};

/* Manual Methods for modifing the Database */

//insertData();
//updateData();
//getData();
//deleteData();

function deleteData() {
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        var db = client.db(dbName);
        db.collection(collectionName).deleteOne({
            session_id: '6ad6ce06-8471-47db-b930-dbee490131be'
        }, function (err, res) {
            assert.equal(null, err);
            console.log("Item deleted");
            client.close();
        });
    });
}

function getData() {
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        var db = client.db(dbName);
        db.collection(collectionName).find({}).toArray(function (err, results) {
            assert.equal(null, err);
            console.log(results);
            client.close();
        });
    });
}

function insertData() {
    var item = {
        person_id: "xyz",
        session_id: "884ee761-9939-4c5e-9a43-078fc4c9d8af",
        email: "xyz@domain.de",
        given_name: "Michael",
        access_token: "",
        refresh_token: "",
        expiry_date: 0,
    }
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        var db = client.db(dbName);
        db.collection(collectionName).insertOne(item, function (err, res) {
            assert.equal(null, err);
            console.log("Document inserted");
            client.close();
        });
    });
}

function updateData() {
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        var db = client.db(dbName);
        db.collection(collectionName).update({
            person_id: "xyz"
        }, {
            $set: {
                session_id: "0b6f47b1-944f-4a7b-a1f1-c30852d359af",
                //access_token: "ya29.GlzSBehuwmoSEKjSVE-jVGozIy90AqPrzd2UaaoUvvdV8wpyWSjdNLVNIxryvpDRx5JudbolcPPhKs73vsPOczYGI3OeU6aWhmqrfmBMUqyXCQA2vuTxsFYFSiWOag",
                //refresh_token: "1/8TLgEGSTUpOCauMKwLtulauU_eK93ioY5a5MlGh4GWs",
                //expiry_date: 1528300189890
            }
        }, {
            upsert: true
        }, function (err, res) {
            assert.equal(null, err);
            console.log("Updated Document");
            client.close();
        });
    });
}

/* Deleting a complete Database
MongoClient.connect(url, function(err, client) {
    assert.equal(null, err);
    var db = client.db(dbName);
    db.dropDatabase(function(err, res) {
        assert.equal(null, err);
        client.close();
        console.log("done");
    });
});
*/