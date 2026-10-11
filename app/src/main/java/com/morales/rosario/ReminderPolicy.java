package com.morales.rosario;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.Set;

/** Calendar logic independent of Android, including DST and delayed alarms. */
final class ReminderPolicy {
    static final int EVENING_HOUR = 22;
    static ZonedDateTime nextTime(ZonedDateTime now, int hour, int minute) {
        LocalTime time = LocalTime.of(hour, minute);
        ZonedDateTime candidate = now.toLocalDate().atTime(time).atZone(now.getZone());
        if (!candidate.isAfter(now)) candidate = now.toLocalDate().plusDays(1)
                .atTime(time).atZone(now.getZone());
        return candidate;
    }
    static boolean shouldNotify(boolean evening, LocalDate due, ZonedDateTime now,
            boolean enabled, boolean eveningEnabled, boolean allowed, Set<String> days,
            String dailySent, String eveningSent, long lastNotificationMillis) {
        String today = now.toLocalDate().toString();
        if (!enabled || !allowed || !due.equals(now.toLocalDate()) || days.contains(today)) return false;
        if (evening && (!eveningEnabled || today.equals(eveningSent))) return false;
        if (!evening && today.equals(dailySent)) return false;
        // A reminder chosen near 22:00 must not produce two successive alerts.
        long elapsed = now.toInstant().toEpochMilli() - lastNotificationMillis;
        return lastNotificationMillis == 0 || elapsed < 0 || elapsed >= 30 * 60_000L;
    }
    static boolean hasStreak(Set<String> days, LocalDate today) {
        return days.contains(today.minusDays(1).toString());
    }
}
