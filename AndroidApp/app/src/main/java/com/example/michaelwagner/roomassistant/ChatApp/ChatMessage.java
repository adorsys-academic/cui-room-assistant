package com.example.michaelwagner.roomassistant.ChatApp;


public class ChatMessage {

    public final static String MSG_SENT = "MSG_SENT";

    public final static String MSG_RECEIVED = "MSG_RECEIVED";

    public final static String BUTTTON_YES_NO = "BUTTON_YES_NO";

    public final static String SLIDER_DURATION = "SLIDER_DURATION";


    // Message content.
    private String msgContent;

    // Message type.
    private String msgType;

    public ChatMessage(String msgType, String msgContent) {
        this.msgType = msgType;
        this.msgContent = msgContent;
    }

    public String getMsgContent() {
        return msgContent;
    }

    public void setMsgContent(String msgContent) {
        this.msgContent = msgContent;
    }

    public String getMsgType() {
        return msgType;
    }

    public void setMsgType(String msgType) {
        this.msgType = msgType;
    }
}