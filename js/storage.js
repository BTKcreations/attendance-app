/**
 * storage.js
 * Wrapper for localStorage to manage app data.
 */

const Storage = {
    KEYS: {
        CLASSES: 'attendance_app_classes',
        RECORDS: 'attendance_app_records'
    },

    // --- Classes Management ---

    getClasses() {
        const data = localStorage.getItem(this.KEYS.CLASSES);
        return data ? JSON.parse(data) : [];
    },

    addClass(classObj) {
        const classes = this.getClasses();
        // basic validation could go here
        classObj.id = classObj.id || 'cls_' + Date.now();
        classes.push(classObj);
        localStorage.setItem(this.KEYS.CLASSES, JSON.stringify(classes));
        return classObj;
    },

    deleteClass(classId) {
        let classes = this.getClasses();
        classes = classes.filter(c => c.id !== classId);
        localStorage.setItem(this.KEYS.CLASSES, JSON.stringify(classes));
    },

    updateClass(classId, updatedData) {
        let classes = this.getClasses();
        const index = classes.findIndex(c => c.id === classId);
        if (index !== -1) {
            classes[index] = { ...classes[index], ...updatedData };
            localStorage.setItem(this.KEYS.CLASSES, JSON.stringify(classes));
            return true;
        }
        return false;
    },

    // --- Data Portability ---

    exportData() {
        const data = {
            classes: this.getClasses(),
            records: this.getAttendanceRecords(),
            version: 1,
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.classes && Array.isArray(data.classes)) {
                localStorage.setItem(this.KEYS.CLASSES, JSON.stringify(data.classes));
            }
            if (data.records && Array.isArray(data.records)) {
                localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(data.records));
            }
            return true;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    },

    // --- Attendance Records Management ---

    getAttendanceRecords() {
        const data = localStorage.getItem(this.KEYS.RECORDS);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Get attendance for a specific date (default: today)
     */
    getAttendanceForDate(dateStr) {
        const records = this.getAttendanceRecords();
        return records.filter(r => r.date === dateStr);
    },

    /**
     * Mark attendance for a class
     */
    markAttendance(classId, status = 'present') {
        const records = this.getAttendanceRecords();
        const dateStr = TimeCheck.getTodayDateString();

        // Check if already marked for today
        const existingIndex = records.findIndex(r => r.classId === classId && r.date === dateStr);

        const newRecord = {
            classId,
            date: dateStr,
            status, // 'present', 'missed', etc.
            timestamp: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            records[existingIndex] = newRecord; // Update existing
        } else {
            records.push(newRecord);
        }

        localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(records));
        return newRecord;
    },

    /**
     * Check if a class is marked for today
     * returns record object or null
     */
    getTodayStatus(classId) {
        const dateStr = TimeCheck.getTodayDateString();
        const records = this.getAttendanceRecords();
        return records.find(r => r.classId === classId && r.date === dateStr) || null;
    }
};
