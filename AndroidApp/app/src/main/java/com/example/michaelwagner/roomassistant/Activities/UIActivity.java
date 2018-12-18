package com.example.michaelwagner.roomassistant.Activities;

import android.support.v4.view.ViewPager;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.Toast;

import com.example.michaelwagner.roomassistant.R;
import com.synnapps.carouselview.CarouselView;
import com.synnapps.carouselview.ImageClickListener;
import com.synnapps.carouselview.ImageListener;
import com.synnapps.carouselview.ViewListener;

import java.util.ArrayList;
import java.util.List;

public class UIActivity extends AppCompatActivity {

    // Schlüssel, TAGs, etc.
    private static final String TAG = "UIActivity";

    // GUI elements
    CarouselView carouselView;
    Button btnBook;

    // List for roomImages in CarouselView
    ArrayList<Integer> roomImages = new ArrayList<Integer>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ui);

        btnBook = (Button)findViewById(R.id.btnBook);

        // adding rooms dynamically to CarouselView
        roomImages.add(R.drawable.raum_r1);
        roomImages.add(R.drawable.raum_r2);
        roomImages.add(R.drawable.raum_r3);
        roomImages.add(R.drawable.raum_r4);
        roomImages.add(R.drawable.raum_r6);

        // Defining CarouselView
        carouselView = (CarouselView) findViewById(R.id.carouselView);
        carouselView.setPageCount(roomImages.size());
        carouselView.setImageListener(new ImageListener() {
            @Override
            public void setImageForPosition(int position, ImageView imageView) {
                imageView.setImageResource(roomImages.get(position));
                imageView.setScaleType(ImageView.ScaleType.FIT_CENTER);
            }
        });

        carouselView.setImageClickListener(new ImageClickListener() {
            @Override
            public void onClick(int position) {
                Toast.makeText(UIActivity.this, "Clicked item: " + position, Toast.LENGTH_SHORT).show();
            }
        });

        carouselView.addOnPageChangeListener(new ViewPager.OnPageChangeListener() {
            @Override
            public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {}

            @Override
            public void onPageSelected(int position) {
                Toast.makeText(UIActivity.this, "Changed item: " + position, Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onPageScrollStateChanged(int state) {}
        });

        btnBook.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Toast.makeText(UIActivity.this, "Currently selected item: " + carouselView.getCurrentItem(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
