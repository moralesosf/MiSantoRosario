package com.morales.rosario;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.NumberPicker;
import android.widget.TextView;
import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.core.content.ContextCompat;
import java.util.Locale;

final class ReminderUi {
    private final ComponentActivity activity;
    private final ActivityResultLauncher<String> permission;
    private final Runnable changed;
    private AlertDialog dialog;
    ReminderUi(ComponentActivity activity, ActivityResultLauncher<String> permission, Runnable changed) {
        this.activity = activity; this.permission = permission; this.changed = changed;
    }
    void firstCompletion() {
        if (Reminders.prefs(activity).getBoolean("offered", false)) return;
        Reminders.prefs(activity).edit().putBoolean("completionSeen", true).apply();
        activity.getWindow().getDecorView().postDelayed(() -> {
            if (!activity.isFinishing() && !activity.isDestroyed()) timePicker(true);
        }, 1200);
    }
    void resumeOffer() {
        if (Reminders.prefs(activity).getBoolean("completionSeen", false)) firstCompletion();
    }
    void timePicker(boolean first) { timePicker(first, first); }
    private void timePicker(boolean first, boolean activate) {
        if (first && Reminders.prefs(activity).getBoolean("offered", false)) return;
        if (dialog != null && dialog.isShowing()) return;
        LinearLayout content = new LinearLayout(activity);
        content.setOrientation(LinearLayout.VERTICAL);
        int padding = dp(24);
        content.setPadding(padding, dp(8), padding, dp(8));
        TextView intro = new TextView(activity);
        intro.setText(first ? R.string.reminder_offer_body : R.string.reminder_choose_time);
        intro.setTextColor(Color.rgb(36, 38, 52));
        intro.setTextSize(16);
        content.addView(intro);
        LinearLayout wheels = new LinearLayout(activity);
        wheels.setGravity(Gravity.CENTER);
        NumberPicker hours = wheel(23, Reminders.prefs(activity).getInt("hour", 20), R.string.hours);
        NumberPicker minutes = wheel(59, Reminders.prefs(activity).getInt("minute", 0), R.string.minutes);
        wheels.addView(hours, new LinearLayout.LayoutParams(dp(110), dp(165)));
        TextView colon = new TextView(activity);
        colon.setText(R.string.time_separator); colon.setTextSize(26);
        wheels.addView(colon);
        wheels.addView(minutes, new LinearLayout.LayoutParams(dp(110), dp(165)));
        content.addView(wheels);
        TextView note = new TextView(activity);
        note.setText(R.string.reminder_evening_note);
        note.setTextColor(Color.rgb(88, 67, 46));
        note.setTextSize(14);
        content.addView(note);
        TextView title = new TextView(activity);
        title.setText(first ? R.string.reminder_offer_title : R.string.reminder_time_title);
        title.setTextColor(Color.rgb(36, 38, 52)); title.setTextSize(29);
        title.setPadding(dp(24), dp(24), dp(24), dp(8));
        title.setTypeface(Typeface.createFromAsset(activity.getAssets(), "rosario/fonts/Michelangelus-Regular.ttf"));
        dialog = new AlertDialog.Builder(activity)
                .setCustomTitle(title)
                .setView(content)
                .setNegativeButton(first ? R.string.not_now : R.string.cancel, (d, which) -> changed.run())
                .setPositiveButton(first ? R.string.activate : R.string.save, (d, which) -> {
                    boolean enabled = activate || Reminders.prefs(activity).getBoolean("enabled", false);
                    android.content.SharedPreferences.Editor edit = Reminders.prefs(activity).edit()
                            .putBoolean("enabled", enabled).putInt("hour", hours.getValue())
                            .putInt("minute", minutes.getValue());
                    if (enabled) edit.putBoolean("offered", true);
                    edit.apply();
                    if (enabled) requestPermission(); else changed.run();
                }).create();
        dialog.setOnCancelListener(d -> changed.run());
        dialog.setOnDismissListener(d -> dialog = null);
        dialog.show();
        if (first) Reminders.prefs(activity).edit().putBoolean("offered", true).apply();
        Window window = dialog.getWindow();
        if (window != null) {
            GradientDrawable background = new GradientDrawable();
            background.setColor(0xf2eddcc6);
            background.setCornerRadius(dp(28));
            background.setStroke(dp(1), 0x80ffffff);
            window.setBackgroundDrawable(background);
            window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            window.setDimAmount(0.25f);
            if (Build.VERSION.SDK_INT >= 31) {
                window.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND);
                window.setBackgroundBlurRadius(dp(24));
                WindowManager.LayoutParams attributes = window.getAttributes();
                attributes.setBlurBehindRadius(dp(20)); window.setAttributes(attributes);
            }
        }
    }
    private NumberPicker wheel(int max, int current, int description) {
        NumberPicker picker = new NumberPicker(activity);
        picker.setMinValue(0); picker.setMaxValue(max); picker.setValue(current);
        picker.setWrapSelectorWheel(true);
        picker.setFormatter(value -> String.format(Locale.ROOT, "%02d", value));
        picker.setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
        picker.setContentDescription(activity.getString(description));
        if (Build.VERSION.SDK_INT >= 29) picker.setTextColor(Color.rgb(36, 38, 52));
        return picker;
    }
    void setEnabled(boolean enabled) {
        if (enabled) { timePicker(false, true); return; }
        Reminders.prefs(activity).edit().putBoolean("enabled", false).apply();
        Reminders.schedule(activity);
        androidx.core.app.NotificationManagerCompat.from(activity).cancel(Reminders.NOTIFICATION);
        changed.run();
    }
    void setEvening(boolean enabled) {
        Reminders.prefs(activity).edit().putBoolean("endOfDay", enabled).apply();
        Reminders.schedule(activity); changed.run();
    }
    void requestPermission() {
        Reminders.createChannel(activity);
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(activity,
                Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permission.launch(Manifest.permission.POST_NOTIFICATIONS);
        } else if (!Reminders.allowed(activity)) notificationSettings();
        else { Reminders.schedule(activity); changed.run(); }
    }
    void permissionResult(boolean granted) {
        Reminders.schedule(activity); changed.run();
        if (!granted) new AlertDialog.Builder(activity).setTitle(R.string.notification_permission_title)
                .setMessage(R.string.notification_permission_body)
                .setNegativeButton(R.string.not_now, null)
                .setPositiveButton(R.string.open_settings, (d, which) -> notificationSettings()).show();
    }
    void notificationSettings() {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
        activity.startActivity(intent);
    }
    void close() { if (dialog != null) dialog.dismiss(); }
    private int dp(int value) { return Math.round(value * activity.getResources().getDisplayMetrics().density); }
}
