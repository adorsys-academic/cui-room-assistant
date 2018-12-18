package com.example.michaelwagner.roomassistant.Models;

import com.google.gson.annotations.SerializedName;

public class User {

    @SerializedName("session_id")
    public String session_id;

    @SerializedName("androidIdToken")
    public String androidIdToken;

    @SerializedName("authCode")
    public String authCode;

    public User(String session_id, String androidIdToken, String authCode) {
        this.session_id = session_id;
        this.androidIdToken = androidIdToken;
        this.authCode = authCode;
    }
}
