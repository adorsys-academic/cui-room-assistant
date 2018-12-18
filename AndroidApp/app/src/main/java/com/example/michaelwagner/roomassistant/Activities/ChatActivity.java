package com.example.michaelwagner.roomassistant.Activities;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;

import com.example.michaelwagner.roomassistant.Rest.APIClient;
import com.example.michaelwagner.roomassistant.ChatApp.ChatMessageAdapter;
import com.example.michaelwagner.roomassistant.ChatApp.ChatMessage;
import com.example.michaelwagner.roomassistant.R;
import com.example.michaelwagner.roomassistant.Models.User;
import com.example.michaelwagner.roomassistant.Rest.UserAPIInterface;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import ai.api.AIDataService;
import ai.api.AIServiceException;
import ai.api.model.AIContext;
import ai.api.model.AIRequest;
import ai.api.model.AIResponse;
import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ChatActivity extends AppCompatActivity implements ChatMessageAdapter.OnRecyclerButtonClickedCallback {

    // Schlüssel, TAGs, etc.
    private static final String TAG = "ChatActivity";
    private static final String CLIENT_ID_DIALOGFLOW = "<YOUR-CLIENT-ID>";

    // Some global parameters
    public static String session_id = "";
    private static boolean nextIsForAuth = false;

    // View Objects
    private EditText msgInputText;
    private Button btnMessageSend;
    private RecyclerView recyclerView;

    // MessageList and MessageListAdapter
    private List<ChatMessage> messageList;
    private ChatMessageAdapter messageAdapter;

    // Objects for Communication with Dialogflow
    final ai.api.android.AIConfiguration config = new ai.api.android.AIConfiguration(CLIENT_ID_DIALOGFLOW,
            ai.api.AIConfiguration.SupportedLanguages.German,
            ai.api.android.AIConfiguration.RecognitionEngine.System);

    private AIDataService aiDataService = new AIDataService(config);
    private AsyncDialogflowRequest asyncDialogflowRequest;
    private AIRequest aiRequest = new AIRequest();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        // Initialize View Objects
        msgInputText = (EditText)findViewById(R.id.chat_input_msg);
        btnMessageSend = (Button)findViewById(R.id.chat_send_msg);

        // Get RecyclerView object.
        recyclerView = (RecyclerView)findViewById(R.id.recyclerView);

        // Set RecyclerView layout manager.
        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(this);
        recyclerView.setLayoutManager(linearLayoutManager);

        // Create the initial data list.
        messageList = new ArrayList<>();

        // Create the data adapter with above data list.
        messageAdapter = new ChatMessageAdapter(messageList);

        // Set data adapter to RecyclerView.
        recyclerView.setAdapter(messageAdapter);

        // Self created 'Handshake': Sending an 'Hello' request via Dialogflow to the Server to get a quick
        // response with the current session id and then update the session id in the database of the server
        // with a Retrofit based http request
        aiRequest.setQuery("Hallo");
        AIContext aiContext = new AIContext(LoginActivity.person_id);
        aiContext.setLifespan(1);
        aiRequest.addContext(aiContext);

        asyncDialogflowRequest = new AsyncDialogflowRequest();
        asyncDialogflowRequest.execute(aiRequest);

        messageAdapter.setOnRecyclerButtonClickedListener(this);

        addThinkingMessage();   // Adding a thinking Message directly after sending Request to Dialogflow

        // Bei Senden einer Nachricht
        btnMessageSend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Getting the Text from EditText Field
                String msgContent = msgInputText.getText().toString();

                // Check if it's not empty
                if(!TextUtils.isEmpty(msgContent))
                {
                    // Add a new sent message to the list.
                    ChatMessage chatMessage = new ChatMessage(ChatMessage.MSG_SENT, msgContent);
                    addChatMessage(chatMessage);

                    // Empty the input edit text box.
                    msgInputText.setText("");

                    // If 'Auth-Flag' is set, send the authCode to the Server via Retrofit
                    if (nextIsForAuth) {
                        UserAPIInterface userAPIInterface = APIClient.getClient().create(UserAPIInterface.class);
                        String authCode = msgContent;
                        User user = new User(session_id, LoginActivity.androidIdToken, authCode);
                        Call<ResponseBody> call = userAPIInterface.sendAuthCode(user);
                        addThinkingMessage(); // add a thinking message directly after sending the code
                        call.enqueue(new Callback<ResponseBody>() {
                            @Override
                            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                                if (response.isSuccessful())
                                {
                                    removeThinkingMessage(); // remove thinking message right after getting the response
                                    String reply = "";
                                    try {
                                        reply = response.body().string();
                                        Log.e(TAG, reply);
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                    // add a new received message to the list
                                    ChatMessage chatMessage = new ChatMessage(ChatMessage.MSG_RECEIVED,reply);
                                    addChatMessage(chatMessage);
                                }

                            }

                            @Override
                            public void onFailure(Call<ResponseBody> call, Throwable t) {
                                try {
                                    Log.e(TAG,"Sending Auth Code -> onFailure:() " + t);
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }

                            }
                        });
                        nextIsForAuth = false;
                    }
                    else {
                        //AIRequest aiRequest = new AIRequest();
                        aiRequest.setQuery(msgContent);
                        //AsyncDialogflowRequest asyncDialogflowRequest = new AsyncDialogflowRequest();
                        asyncDialogflowRequest = new AsyncDialogflowRequest();
                        asyncDialogflowRequest.execute(aiRequest);
                        addThinkingMessage(); // Adding a thinking Message directly after sending Request to Dialogflow
                    }
                }

            }
        });

    }


    @Override
    protected void onStop() {
        super.onStop();
    }

    @Override
    protected void onPause() {
        super.onPause();
    }

    @Override
    protected void onStart() {
        super.onStart();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Get the current id_token when Activity Starts/Resumes
    }

    public void addChatMessage(ChatMessage chatMessage) {
        // Add to Chatmessage List
        messageList.add(chatMessage);
        int newMsgPosition = messageList.size() - 1;

        // Notify recycler view insert one new data.
        messageAdapter.notifyItemInserted(newMsgPosition);

        // Scroll RecyclerView to the last message.
        recyclerView.scrollToPosition(newMsgPosition);
    }

    public void addThinkingMessage() {
        // Adding " ... " to the ChatMessageView
        ChatMessage chatMessage = new ChatMessage(ChatMessage.MSG_RECEIVED,"chatbot is thinking...");
        addChatMessage(chatMessage);
    }

    public void removeThinkingMessage() {
        // Remove the last element
        int lastMsgPosition = messageList.size() - 1;
        messageList.remove(lastMsgPosition);

        // Notify recyler view that last element has been deleted
        messageAdapter.notifyItemRemoved(lastMsgPosition);

        // Scroll RecyclerView to the last Message
        recyclerView.scrollToPosition(lastMsgPosition);
    }

    public void updateSessionId(String newSessionId) {
        // Store new Session Id in the global session_id variable
        session_id = newSessionId;
        UserAPIInterface userApi = APIClient.getClient().create(UserAPIInterface.class);
        User user = new User(session_id, LoginActivity.androidIdToken, "");
        Call<ResponseBody> call = userApi.updateUser(user);
        call.enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                try {
                    Log.e(TAG, response.body().string());
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                try {
                    Log.e(TAG,"updateSessionId -> onFailure(): " + t);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
    }


    // Going back to LoginActivity when pressing the Back Button
    @Override
    public void onBackPressed() {
        finish();
    }

    @Override
    public void onRecyclerButtonClicked(String chatMsg, String dialogflowMsg) {
        ChatMessage chatMessage = new ChatMessage(ChatMessage.MSG_SENT, chatMsg);
        addChatMessage(chatMessage);
        aiRequest.setQuery(dialogflowMsg);
        asyncDialogflowRequest = new AsyncDialogflowRequest();
        asyncDialogflowRequest.execute(aiRequest);
        addThinkingMessage();

    }

    public class AsyncDialogflowRequest extends AsyncTask<AIRequest,Void,AIResponse>{

        @Override
        protected AIResponse doInBackground(AIRequest... aiRequests) {
            final AIRequest request = aiRequests[0];
            // If current Session ID has changed during the Usage of the App -> Update it
            String currentSessionId = request.getSessionId();
            if ((!session_id.equals(currentSessionId)) && (currentSessionId != null))
                updateSessionId(currentSessionId);

            // Sending request to Dialogflow and getting a response, which is returned to method 'onPostExecute'
            try {
                final AIResponse response = aiDataService.request(request);
                return response;
            } catch (AIServiceException e) {
                e.printStackTrace();
            }
            return null;
        }
        @Override
        protected void onPostExecute(AIResponse response) {
            if (response != null) {
                // remove thinking message right after getting the response
                removeThinkingMessage();

                String text;
                String type;

                // if Webhook is not used, it's a standard textmessage from dialogflow (text in fulfillment->speech)
                if ((response.getResult().getFulfillment().getSpeech().equals(null) == false) && (response.getResult().getFulfillment().getSpeech().equals("") == false))
                {
                    type = "textmessage";
                    text = response.getResult().getFulfillment().getSpeech();
                }
                else
                {
                    // getting the 'payload' (in v1: 'data') to decide what ui elemnt should be added to recyclerview
                    String payload = response.getResult().getFulfillment().getData().toString();
                    JsonObject android = new JsonParser().parse(payload).getAsJsonObject();
                    type = android.get("android").getAsJsonObject().get("type").getAsString();
                    text = android.get("android").getAsJsonObject().get("text").getAsString();

                }

                if (type.equals("textmessage"))
                {
                    // Adding a received message to the list
                    ChatMessage chatMessage = new ChatMessage(ChatMessage.MSG_RECEIVED, text);
                    addChatMessage(chatMessage);

                    // getting the source for authentification
                    String source = response.getResult().getFulfillment().getSource();

                    // If source has the generated AuthUrl in it, copy the link to the clipboard
                    // and set a 'flag' for the next sending message (nextIsForAuth)
                    if ((source != null) && (source != "agent") && (source != ""))
                    {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(source));
                        startActivity(browserIntent);
                        ClipboardManager clipboardManager = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                        ClipData clipData = ClipData.newPlainText("source", source);
                        clipboardManager.setPrimaryClip(clipData);
                        nextIsForAuth = true;
                    }
                }
                else if (type.equals("button"))
                {
                    ChatMessage chatMessage = new ChatMessage(ChatMessage.BUTTTON_YES_NO, text);
                    addChatMessage(chatMessage);
                }
                else if (type.equals("durationslider"))
                {
                    ChatMessage chatMessage = new ChatMessage(ChatMessage.SLIDER_DURATION, text);
                    addChatMessage(chatMessage);
                }

                // If current Session ID has changed during the Usage of the App -> Update it
                String currentSessionId = response.getSessionId();
                if ((!session_id.equals(currentSessionId)) && (currentSessionId != null))
                    updateSessionId(currentSessionId);
            }
        }
    }
}


