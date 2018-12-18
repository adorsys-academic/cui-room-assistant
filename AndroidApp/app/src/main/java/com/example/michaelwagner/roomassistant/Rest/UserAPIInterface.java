package com.example.michaelwagner.roomassistant.Rest;

import com.example.michaelwagner.roomassistant.Models.User;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface UserAPIInterface {

    @POST("verifyUser")
    Call<ResponseBody> updateUser(@Body User user);

    @POST("receiveAuthCode")
    Call<ResponseBody> sendAuthCode(@Body User user);
}
