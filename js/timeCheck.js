/**
 * timeCheck.js
 * Handles all time-related validations and formatting.
 */

const TimeCheck = {
  /**
   * Checks if the current time is within the start and end time window.
   * @param {string} startTime - "HH:MM" 24h format
   * @param {string} endTime - "HH:MM" 24h format
   * @returns {boolean}
   */
  isClassActive(startTime, endTime) {
    if (!startTime || !endTime) return false;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    // Convert everything to minutes for easier comparison
    const nowMinutes = currentHours * 60 + currentMinutes;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  },

  /**
   * Returns true if the class has already ended.
   */
  isClassEnded(endTime) {
    if (!endTime) return false;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const [endH, endM] = endTime.split(':').map(Number);
    
    const nowMinutes = currentHours * 60 + currentMinutes;
    const endMinutes = endH * 60 + endM;
    
    return nowMinutes >= endMinutes;
  },

  /**
   * Returns today's date in YYYY-MM-DD format based on local time.
   */
  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Formats a time string "HH:MM" to "HH:MM AM/PM"
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }
};
