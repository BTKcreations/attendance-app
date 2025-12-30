
import { AttendanceApp } from './attendance.js';
import { UI } from './ui.js';

// Initialize Core Logic
AttendanceApp.init();

// Initialize UI
// Bind UI methods to window for HTML event handlers (onclick="UI.xxx")
window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
