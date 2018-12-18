package com.example.michaelwagner.roomassistant.ChatApp;

import android.support.v7.widget.RecyclerView;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import com.example.michaelwagner.roomassistant.R;


public class ChatMessageViewHolder extends RecyclerView.ViewHolder {

    // Left text message
    LinearLayout chat_left_msg_layout;
    TextView chat_left_msg_text_view;

    // Right text message
    LinearLayout chat_right_msg_layout;
    TextView chat_right_msg_text_view;

    // ConfirmMessage Yes/No
    LinearLayout chat_yes_no_layout;
    TextView chat_yes_no_text_view;
    Button chat_yes_no_btn_yes;
    Button chat_yes_no_btn_no;

    // Slider for Duration
    LinearLayout chat_slider_duration_layout;
    TextView chat_slider_duration_question_text_view;
    TextView chat_slider_duration_value_text_view;
    SeekBar chat_slider_duration_seekbar;
    Button chat_slider_duration_button;

    public ChatMessageViewHolder(View itemView) {
        super(itemView);

        if(itemView!=null) {
            chat_left_msg_layout = (LinearLayout) itemView.findViewById(R.id.chat_left_msg_layout);
            chat_left_msg_text_view = (TextView) itemView.findViewById(R.id.chat_left_msg_text_view);

            chat_right_msg_layout = (LinearLayout) itemView.findViewById(R.id.chat_right_msg_layout);
            chat_right_msg_text_view = (TextView) itemView.findViewById(R.id.chat_right_msg_text_view);

            chat_yes_no_layout = (LinearLayout) itemView.findViewById(R.id.chat_yes_no_layout);
            chat_yes_no_text_view = (TextView) itemView.findViewById(R.id.chat_yes_no_text_view);
            chat_yes_no_btn_yes = (Button) itemView.findViewById(R.id.chat_yes_no_btn_yes);
            chat_yes_no_btn_no = (Button) itemView.findViewById(R.id.chat_yes_no_btn_no);

            chat_slider_duration_layout = (LinearLayout) itemView.findViewById(R.id.chat_slider_duration_layout);
            chat_slider_duration_question_text_view = (TextView) itemView.findViewById(R.id.chat_slider_duration_question_text_view);
            chat_slider_duration_value_text_view = (TextView) itemView.findViewById(R.id.chat_slider_duration_value_text_view);
            chat_slider_duration_seekbar = (SeekBar) itemView.findViewById(R.id.chat_slider_duration_seekbar);
            chat_slider_duration_button = (Button) itemView.findViewById(R.id.chat_slider_duration_button);
        }
    }
}