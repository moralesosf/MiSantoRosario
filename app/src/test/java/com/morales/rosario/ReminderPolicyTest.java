package com.morales.rosario;

import org.junit.Test;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;
import static org.junit.Assert.*;

public class ReminderPolicyTest {
    private final ZoneId mexico = ZoneId.of("America/Mexico_City");
    private ZonedDateTime time(int hour, int minute) {
        return LocalDate.of(2026, 10, 11).atTime(hour, minute).atZone(mexico);
    }
    private boolean eligible(boolean evening, ZonedDateTime now, boolean enabled,
            boolean endOfDay, boolean allowed, Set<String> days, String daily, String late, long last) {
        return ReminderPolicy.shouldNotify(evening, LocalDate.of(2026, 10, 11), now,
                enabled, endOfDay, allowed, days, daily, late, last);
    }
    @Test public void nextAlarmUsesTodayBeforeChosenHourAndTomorrowAfterIt() {
        assertEquals(time(20, 30), ReminderPolicy.nextTime(time(19, 0), 20, 30));
        assertEquals(time(20, 30).plusDays(1), ReminderPolicy.nextTime(time(20, 30), 20, 30));
        assertEquals(time(0, 0).plusDays(1), ReminderPolicy.nextTime(time(23, 59), 0, 0));
    }
    @Test public void nextAlarmHandlesSpringClockGapAndFallOverlap() {
        ZoneId zone = ZoneId.of("America/New_York");
        ZonedDateTime spring = LocalDate.of(2026, 3, 8).atTime(0, 0).atZone(zone);
        assertEquals(3, ReminderPolicy.nextTime(spring, 2, 30).getHour());
        assertEquals(30, ReminderPolicy.nextTime(spring, 2, 30).getMinute());
        ZonedDateTime fall = LocalDate.of(2026, 11, 1).atTime(0, 0).atZone(zone);
        assertEquals(fall.toLocalDate(), ReminderPolicy.nextTime(fall, 1, 30).toLocalDate());
    }
    @Test public void completedDaySuppressesBothNotifications() {
        for (boolean evening : new boolean[]{false, true})
            assertFalse(eligible(evening, time(22, 0), true, true, true,
                    Set.of("2026-10-11"), "", "", 0));
    }
    @Test public void disabledRemindersOrDeniedPermissionSuppressEveryNotification() {
        for (boolean evening : new boolean[]{false, true}) {
            assertFalse(eligible(evening, time(22, 0), false, true, true, Set.of(), "", "", 0));
            assertFalse(eligible(evening, time(22, 0), true, true, false, Set.of(), "", "", 0));
        }
    }
    @Test public void eveningCanBeDisabledWithoutDisablingDailyReminder() {
        assertFalse(eligible(true, time(22, 0), true, false, true, Set.of(), "", "", 0));
        assertTrue(eligible(false, time(20, 0), true, false, true, Set.of(), "", "", 0));
    }
    @Test public void alarmDelayedBeyondMidnightDoesNotSendYesterdaysMessage() {
        assertFalse(eligible(true, time(0, 10).plusDays(1), true, true, true, Set.of(), "", "", 0));
    }
    @Test public void repeatedDeliveryCannotDuplicateEitherAlert() {
        assertFalse(eligible(false, time(20, 5), true, true, true, Set.of(), "2026-10-11", "", 0));
        assertFalse(eligible(true, time(22, 5), true, true, true, Set.of(), "", "2026-10-11", 0));
    }
    @Test public void dailyAndEveningAlertsDoNotFireBackToBack() {
        long previous = time(21, 50).toInstant().toEpochMilli();
        assertFalse(eligible(true, time(22, 0), true, true, true, Set.of(), "2026-10-11", "", previous));
        assertTrue(eligible(true, time(22, 30), true, true, true, Set.of(), "2026-10-11", "", previous));
    }
    @Test public void chosenLateHourStillWorksAfterEveningReminder() {
        assertTrue(eligible(false, time(23, 0), true, true, true, Set.of(), "", "2026-10-11",
                time(22, 0).toInstant().toEpochMilli()));
    }
    @Test public void streakWarningOnlyClaimsExistingStreak() {
        assertTrue(ReminderPolicy.hasStreak(Set.of("2026-10-10"), time(22, 0).toLocalDate()));
        assertFalse(ReminderPolicy.hasStreak(Set.of("2026-10-09"), time(22, 0).toLocalDate()));
    }
}
