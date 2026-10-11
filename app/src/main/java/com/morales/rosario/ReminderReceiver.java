package com.morales.rosario;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Reminders.DAILY.equals(action) || Reminders.EVENING.equals(action)) {
            Reminders.deliver(context, Reminders.EVENING.equals(action),
                    intent.getLongExtra("dueDay", Long.MIN_VALUE));
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Reminders.schedule(context);
        }
    }
}
