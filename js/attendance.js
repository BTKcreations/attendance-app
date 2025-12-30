import { Storage } from './storage.js';
import { Backfill } from './backfill.js';

/**
 * attendance.js
 * Core business logic for managing classes and attendance.
 * Separated from UI to keep code clean.
 */

export const AttendanceApp = {
    /**
     * Initialize logic (e.g. backfill checks)
     */
    init() {
        console.log("Attendance App Logic Initialized");
        try {
            Backfill.run();
        } catch (e) {
            console.error("Backfill error:", e);
        }
    },

    /**
     * Get all classes with their computed status for TODAY
     */
    getDashboardData() {
        const classes = Storage.getClasses();
        const todayStr = TimeCheck.getTodayDateString();

        // Day of week: 0 (Sun) - 6 (Sat)
        const currentDay = new Date().getDay();

        // Filter by day
        const todaysClasses = classes.filter(cls => {
            // If 'days' is missing/empty, we assume Every Day (migration fallback)
            if (!cls.days || cls.days.length === 0) return true;
            return cls.days.includes(currentDay);
        });

        return todaysClasses.map(cls => {
            // Get saved status from storage
            const record = Storage.getTodayStatus(cls.id);

            let status = 'pending'; // default
            let isActionable = false;

            const isActive = TimeCheck.isClassActive(cls.startTime, cls.endTime);
            const isEnded = TimeCheck.isClassEnded(cls.endTime);

            if (record) {
                status = record.status; // 'present', 'missed'
            } else {
                // Compute status based on time if not marked
                if (isActive) {
                    status = 'active'; // Can mark now
                    isActionable = true;
                } else if (isEnded) {
                    status = 'missed'; // Time passed, wasn't marked
                } else {
                    status = 'upcoming'; // Future class
                }
            }

            return {
                ...cls,
                computedStatus: status, // 'present', 'missed', 'active', 'upcoming', 'pending'
                isActionable: isActionable,
                isActiveNow: isActive
            };
        }).sort((a, b) => {
            return a.startTime.localeCompare(b.startTime); // simple string compare works for HH:MM
        });
    },

    /**
     * Attempt to mark attendance
     */
    checkIn(classId) {
        const classes = Storage.getClasses();
        const cls = classes.find(c => c.id === classId);
        if (!cls) throw new Error("Class not found");

        if (!TimeCheck.isClassActive(cls.startTime, cls.endTime)) {
            alert("You can only mark attendance during the class time!");
            return false;
        }

        Storage.markAttendance(classId, 'present');
        return true;
    },

    /**
     * Add a new class with simple validation
     */
    addNewClass(name, startTime, endTime, days = [], category = 'General') {
        if (startTime >= endTime) {
            throw new Error("Start time must be before end time.");
        }
        return Storage.addClass({
            name,
            category,
            startTime,
            endTime,
            days: days
        });
    },

    deleteClass(id) {
        Storage.deleteClass(id);
    },

    updateClass(id, name, start, end, days, category) {
        if (start >= end) throw new Error("Start time must be before end time.");
        return Storage.updateClass(id, { name, startTime: start, endTime: end, days, category });
    }
};
