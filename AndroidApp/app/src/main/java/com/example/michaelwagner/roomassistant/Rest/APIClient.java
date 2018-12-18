package com.example.michaelwagner.roomassistant.Rest;

import java.util.concurrent.TimeUnit;

import ai.api.GsonFactory;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import retrofit2.converter.moshi.MoshiConverterFactory;

public class APIClient {

    private static Retrofit retrofit = null;

    public static Retrofit getClient() {

        HttpLoggingInterceptor interceptor = new HttpLoggingInterceptor();
        interceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(interceptor)
                .build();

        retrofit = new Retrofit.Builder()
                .baseUrl("http://10.0.2.2:8080") // for emulator
                //.addConverterFactory(GsonConverterFactory.create())
                .addConverterFactory(MoshiConverterFactory.create())
                .client(client)
                .build();

        return retrofit;

    }


}
