/**
 * attendance.js
 * Main business logic layer.
 */

const AttendanceApp = {
    /**
     * Initialize or migration logic if needed
     */
    init() {
        console.log("Attendance App Logic Initialized");
    },

    /**
     * Get all classes with their computed status for TODAY
     */
    getDashboardData() {
        const classes = Storage.getClasses();
        const todayStr = TimeCheck.getTodayDateString();

        return classes.map(cls => {
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
    addNewClass(name, startTime, endTime) {
        if (startTime >= endTime) {
            throw new Error("Start time must be before end time.");
        }
        return Storage.addClass({
            name,
            startTime,
            endTime,
            days: [] // For future recurring logic
        });
    }
};
