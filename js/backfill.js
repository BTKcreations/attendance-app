/**
 * backfill.js
 * Handles auto-marking of past classes as "missed" if the app wasn't opened.
 */

import { Storage } from './storage.js';
import { TimeCheck } from './timeCheck.js';

export const Backfill = {
    run() {
        const lastDate = Storage.getLastOpenDate();
        const today = TimeCheck.getTodayDateString();

        if (!lastDate) {
            // First run ever, set today
            Storage.setLastOpenDate(today);
            return;
        }

        if (lastDate === today) {
            // Already opened today, nothing to do
            return;
        }

        console.log(`Backfilling from ${lastDate} to ${today}...`);

        // Iterate from lastDate + 1 day until yesterday
        let currentDate = new Date(lastDate);
        currentDate.setDate(currentDate.getDate() + 1);

        const todayDate = new Date(today); // 00:00 today

        const classes = Storage.getClasses();

        while (currentDate < todayDate) {
            const dateStr = this.formatDate(currentDate);
            const dayOfWeek = currentDate.getDay(); // 0-6

            // Find all classes that should have happened on this day
            const activeClasses = classes.filter(cls => {
                if (!cls.days || cls.days.length === 0) return true; // Daily assumption
                return cls.days.includes(dayOfWeek);
            });

            // Mark them as missed
            activeClasses.forEach(cls => {
                // Check if a record already exists (unlikely if we are backfilling, but safe)
                const records = Storage.getAttendanceForDate(dateStr);
                const exists = records.find(r => r.classId === cls.id);

                if (!exists) {
                    Storage.markAttendanceDirectly(cls.id, dateStr, 'missed');
                    console.log(`Marked ${cls.name} as missed on ${dateStr}`);
                }
            });

            // Next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Finally update last open date to today
        Storage.setLastOpenDate(today);
    },

    formatDate(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};
