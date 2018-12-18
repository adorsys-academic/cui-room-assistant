package com.example.michaelwagner.roomassistant.ChatApp;

import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.SeekBar;

import com.example.michaelwagner.roomassistant.R;

import java.util.ArrayList;
import java.util.List;

public class ChatMessageAdapter extends RecyclerView.Adapter<ChatMessageViewHolder> {

    OnRecyclerButtonClickedCallback onRecyclerButtonClickedCallback;

    public interface OnRecyclerButtonClickedCallback {
        public void onRecyclerButtonClicked(String chatMsg, String dialogflowMsg);
    }

    public void setOnRecyclerButtonClickedListener(OnRecyclerButtonClickedCallback onRecyclerButtonClickedListener) {
        this.onRecyclerButtonClickedCallback = onRecyclerButtonClickedListener;
    }

    private List<ChatMessage> msgDtoList = null;

    public ChatMessageAdapter(List<ChatMessage> msgDtoList) {
        this.msgDtoList = msgDtoList;
    }

    @Override
    public void onBindViewHolder(final ChatMessageViewHolder holder, int position) {
        ChatMessage msgDto = this.msgDtoList.get(position);
        // If the message is a received message.
        if(msgDto.MSG_RECEIVED.equals(msgDto.getMsgType()))
        {
            // Show received message in left linearlayout.
            holder.chat_left_msg_layout.setVisibility(LinearLayout.VISIBLE);
            holder.chat_left_msg_text_view.setText(msgDto.getMsgContent());
            // Remove all the others
            holder.chat_right_msg_layout.setVisibility(LinearLayout.GONE);
            holder.chat_yes_no_layout.setVisibility(LinearLayout.GONE);
            holder.chat_slider_duration_layout.setVisibility(LinearLayout.GONE);
        }
        // If the message is a sent message.
        else if(msgDto.MSG_SENT.equals(msgDto.getMsgType()))
        {
            // Show sent message in right linearlayout.
            holder.chat_right_msg_layout.setVisibility(LinearLayout.VISIBLE);
            holder.chat_right_msg_text_view.setText(msgDto.getMsgContent());
            // Remove all the others
            holder.chat_left_msg_layout.setVisibility(LinearLayout.GONE);
            holder.chat_yes_no_layout.setVisibility(LinearLayout.GONE);
            holder.chat_slider_duration_layout.setVisibility(LinearLayout.GONE);
        }
        else if (msgDto.BUTTTON_YES_NO.equals(msgDto.getMsgType()))
        {
            holder.chat_yes_no_layout.setVisibility(LinearLayout.VISIBLE);
            holder.chat_yes_no_text_view.setText(msgDto.getMsgContent());
            // Remove all the others
            holder.chat_left_msg_layout.setVisibility(LinearLayout.GONE);
            holder.chat_right_msg_layout.setVisibility(LinearLayout.GONE);
            holder.chat_slider_duration_layout.setVisibility(LinearLayout.GONE);
        }
        else if (msgDto.SLIDER_DURATION.equals(msgDto.getMsgType()))
        {
            holder.chat_slider_duration_layout.setVisibility(LinearLayout.VISIBLE);
            holder.chat_slider_duration_question_text_view.setText(msgDto.getMsgContent());
            int seekbarValue = holder.chat_slider_duration_seekbar.getProgress();
            String queryText = getQueryFromDurationForTextView(seekbarValue);
            holder.chat_slider_duration_value_text_view.setText(queryText);
            // Remove all the others
            holder.chat_left_msg_layout.setVisibility(LinearLayout.GONE);
            holder.chat_right_msg_layout.setVisibility(LinearLayout.GONE);
            holder.chat_yes_no_layout.setVisibility(LinearLayout.GONE);
        }

        holder.chat_yes_no_btn_yes.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                onRecyclerButtonClickedCallback.onRecyclerButtonClicked("Ja", "Ja");
            }
        });

        holder.chat_yes_no_btn_no.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                onRecyclerButtonClickedCallback.onRecyclerButtonClicked("Nein", "Nein");
            }
        });

        holder.chat_slider_duration_seekbar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int seekbarValue, boolean b) {
                String queryText = getQueryFromDurationForTextView(seekbarValue);
                holder.chat_slider_duration_value_text_view.setText(queryText);
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {

            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {

            }
        });

        holder.chat_slider_duration_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                int seekbarValue = holder.chat_slider_duration_seekbar.getProgress();
                String queryTextChatMsg = getQueryFromDurationForTextView(seekbarValue);
                String queryTextDialogflow = getQueryFromDurationForDialogflow(seekbarValue);
                onRecyclerButtonClickedCallback.onRecyclerButtonClicked(queryTextChatMsg, queryTextDialogflow);
            }
        });

    }

    @Override
    public ChatMessageViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        LayoutInflater layoutInflater = LayoutInflater.from(parent.getContext());
        View view = layoutInflater.inflate(R.layout.activity_chat_app_item_view, parent, false);
        return new ChatMessageViewHolder(view);
    }

    @Override
    public int getItemCount() {
        if(msgDtoList==null)
        {
            msgDtoList = new ArrayList<ChatMessage>();
        }
        return msgDtoList.size();
    }

    private String getQueryFromDurationForTextView(int seekbarValue){

        String queryText = "";

        seekbarValue = seekbarValue + 1;    // seekbar starts from '0' -> for easier calculation, let it start at '1'

        int fullhours = seekbarValue / 2;
        int halfhours = seekbarValue % 2;

        if (fullhours == 1)
            queryText += "1 Stunde";
        else if (fullhours>1)
            queryText += fullhours + " Stunden";

        if (halfhours == 1)
            queryText += " 30 Minuten";

        return queryText;
    }

    private String getQueryFromDurationForDialogflow(int seekbarValue){

        String queryText = "";

        seekbarValue = seekbarValue + 1;    // seekbar starts from '0' -> for easier calculation, let it start at '1'

        int fullhours = seekbarValue / 2;
        int halfhours = seekbarValue % 2;

        queryText += fullhours;

        if (halfhours == 1)
            queryText += ",5 Stunden";
        else
            queryText += " Stunden";

        if ((fullhours == 1) && (halfhours == 0))
            queryText = "1 Stunde";

        return queryText;
    }
}