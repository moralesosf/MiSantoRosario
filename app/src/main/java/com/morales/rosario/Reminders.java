package com.morales.rosario;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.Set;

final class Reminders {
    static final String DAILY = "com.morales.rosario.REMIND_DAILY";
    static final String EVENING = "com.morales.rosario.REMIND_EVENING";
    static final String CHANNEL = "daily_rosary";
    static final int NOTIFICATION = 7010;
    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("rosary_reminders", Context.MODE_PRIVATE);
    }
    static boolean allowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context,
                Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
        NotificationChannel channel = context.getSystemService(NotificationManager.class)
                .getNotificationChannel(CHANNEL);
        return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }
    static void createChannel(Context context) {
        NotificationChannel channel = new NotificationChannel(CHANNEL,
                context.getString(R.string.reminder_channel), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(context.getString(R.string.reminder_channel_description));
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    static JSONObject state(Context context) {
        SharedPreferences p = prefs(context);
        JSONObject value = new JSONObject();
        try {
            value.put("enabled", p.getBoolean("enabled", false));
            value.put("hour", p.getInt("hour", 20));
            value.put("minute", p.getInt("minute", 0));
            value.put("endOfDay", p.getBoolean("endOfDay", true));
            value.put("permissionGranted", allowed(context));
        } catch (Exception ignored) { }
        return value;
    }
    static void syncDays(Context context, JSONArray input) {
        if (input == null || input.length() > 30000) return;
        Set<String> days = new HashSet<>();
        LocalDate today = LocalDate.now();
        for (int i = 0; i < input.length(); i++) {
            try {
                String value = input.getString(i);
                LocalDate day = LocalDate.parse(value);
                if (day.toString().equals(value) && !day.isAfter(today)) days.add(value);
            } catch (Exception ignored) { }
        }
        prefs(context).edit().putStringSet("days", days).apply();
        if (days.contains(today.toString())) NotificationManagerCompat.from(context).cancel(NOTIFICATION);
    }
    static PendingIntent alarmIntent(Context context, boolean evening, long epochDay) {
        Intent intent = new Intent(context, ReminderReceiver.class).setAction(evening ? EVENING : DAILY);
        intent.putExtra("dueDay", epochDay);
        return PendingIntent.getBroadcast(context, evening ? 7002 : 7001, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        // Replace both alarms to handle changes of hour, date, zone and permission.
        alarms.cancel(alarmIntent(context, false, 0));
        alarms.cancel(alarmIntent(context, true, 0));
        SharedPreferences p = prefs(context);
        if (!p.getBoolean("enabled", false) || !allowed(context)) return;
        createChannel(context);
        ZonedDateTime now = ZonedDateTime.now();
        int hour = p.getInt("hour", 20), minute = p.getInt("minute", 0);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return;
        setAlarm(context, alarms, false, ReminderPolicy.nextTime(now, hour, minute));
        if (p.getBoolean("endOfDay", true)) setAlarm(context, alarms, true,
                ReminderPolicy.nextTime(now, ReminderPolicy.EVENING_HOUR, 0));
    }
    private static void setAlarm(Context context, AlarmManager alarms, boolean evening,
            ZonedDateTime time) {
        // Inexact alarms avoid special exact-alarm permissions and foreground services.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time.toInstant().toEpochMilli(),
                alarmIntent(context, evening, time.toLocalDate().toEpochDay()));
    }
    static void deliver(Context context, boolean evening, long epochDay) {
        SharedPreferences p = prefs(context);
        ZonedDateTime now = ZonedDateTime.now();
        LocalDate due;
        try { due = LocalDate.ofEpochDay(epochDay); }
        catch (Exception ignored) { schedule(context); return; }
        Set<String> days = p.getStringSet("days", new HashSet<>());
        boolean notify = ReminderPolicy.shouldNotify(evening, due, now,
                p.getBoolean("enabled", false), p.getBoolean("endOfDay", true), allowed(context),
                days, p.getString("dailySent", ""), p.getString("eveningSent", ""),
                p.getLong("lastNotificationMillis", 0));
        if (notify) {
            createChannel(context);
            boolean streak = ReminderPolicy.hasStreak(days, now.toLocalDate());
            Intent open = new Intent(context, MainActivity.class)
                    .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent tap = PendingIntent.getActivity(context, NOTIFICATION, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            int title = evening && streak ? R.string.streak_reminder_title : R.string.daily_reminder_title;
            int body = evening ? (streak ? R.string.streak_reminder_body : R.string.evening_reminder_body)
                    : R.string.daily_reminder_body;
            NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL)
                    .setSmallIcon(R.drawable.notification_rosary).setColor(0xff967959)
                    .setContentTitle(context.getString(title)).setContentText(context.getString(body))
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(context.getString(body)))
                    .setContentIntent(tap).setAutoCancel(true).setOnlyAlertOnce(false)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            try {
                if (allowed(context)) {
                    NotificationManagerCompat.from(context).notify(NOTIFICATION, notification.build());
                    p.edit().putString(evening ? "eveningSent" : "dailySent", due.toString())
                            .putLong("lastNotificationMillis", now.toInstant().toEpochMilli()).apply();
                }
            } catch (SecurityException ignored) { }
        }
        schedule(context);
    }
}
