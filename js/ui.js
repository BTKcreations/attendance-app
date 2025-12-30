import { AttendanceApp } from './attendance.js';
import { Storage } from './storage.js';
import { TimeCheck } from './timeCheck.js';

/**
 * ui.js
 * Handles all DOM interactions and rendering.
 */

export const UI = {
    init() {
        this.bindEvents();
        this.renderDate();
        this.startClock();
        this.renderDashboard();

        // Switch to dashboard by default
        this.switchTab('view-dashboard');
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');
                this.switchTab(targetId);
            });
        });

        // FAB
        const fab = document.getElementById('fab-add');
        if (fab) fab.addEventListener('click', () => {
            document.getElementById('add-class-form').reset();
            this.showModal('add-class-modal');
        });

        // Modal Closing
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });

        // Close modal on outside click
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                this.hideModal();
            }
        };

        // Add Class Form
        const form = document.getElementById('add-class-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddClass();
            });
        }
    },

    switchTab(tabId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        // Show target
        document.getElementById(tabId).classList.add('active');

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === tabId) {
                item.classList.add('active');
            }
        });

        // Refresh data when switching
        if (tabId === 'view-dashboard') this.renderDashboard();
        if (tabId === 'view-history') this.renderHistory();
    },

    renderDate() {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = new Date().toLocaleDateString('en-US', options);
        document.getElementById('current-date').textContent = dateStr;
    },

    startClock() {
        const update = () => {
            const now = new Date();
            document.getElementById('live-clock').textContent =
                now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            // Also strictly refresh dashboard status every minute to enable/disable buttons
            if (now.getSeconds() === 0) {
                this.renderDashboard(); // Re-evaluate time windows
            }
        };
        update();
        setInterval(update, 1000);
    },

    renderDashboard() {
        const container = document.getElementById('classes-list');
        const classes = AttendanceApp.getDashboardData();

        this.updateStats(classes);

        if (classes.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
           <p>No classes scheduled for today.</p>
           <button class="btn-text" onclick="UI.showModal('add-class-modal')">+ Add Class</button>
        </div>
      `;
            return;
        }

        container.innerHTML = '';

        classes.forEach(cls => {
            const card = document.createElement('div');

            // Determine card styles based on status
            let cardClass = 'class-card';
            let btnText = 'Not Time Yet';
            let btnClass = 'btn-mark disabled';
            let onClick = '';
            let statusIcon = '⏳';

            if (cls.computedStatus === 'present') {
                cardClass += ' present';
                btnText = 'Marked Present';
                btnClass = 'btn-mark success';
                statusIcon = '✅';
            } else if (cls.computedStatus === 'missed') {
                cardClass += ' missed';
                btnText = 'Missed';
                btnClass = 'btn-mark danger';
                statusIcon = '❌';
            } else if (cls.computedStatus === 'active') {
                cardClass += ' active';
                btnText = 'Mark Attendance';
                btnClass = 'btn-mark enabled';
                onClick = `UI.handleCheckIn('${cls.id}')`;
                statusIcon = '🟢';
            } else {
                // Upcoming
                btnText = 'Wait for ' + TimeCheck.formatTime(cls.startTime);
            }

            // Calculate Stats for this subject
            const subjectRecords = Storage.getAttendanceRecords().filter(r => r.classId === cls.id);
            const totalAttended = subjectRecords.filter(r => r.status === 'present').length;
            const totalMissed = subjectRecords.filter(r => r.status === 'missed').length;
            const totalSessions = totalAttended + totalMissed;
            const percentage = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0;

            card.className = cardClass;
            card.innerHTML = `
        <div class="card-class-actions">
           <span style="font-size: 0.8rem; color: var(--text-secondary); margin-right: auto;">
                ${percentage}% Attendance (${totalAttended}/${totalSessions})
           </span>
           <button class="btn-mini delete" onclick="UI.handleDeleteClass('${cls.id}')" title="Delete">🗑️</button>
        </div>
        <div class="card-header">
            <div>
                <div class="class-name">${cls.name}</div>
                <div class="class-time">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${TimeCheck.formatTime(cls.startTime)} - ${TimeCheck.formatTime(cls.endTime)}
                </div>
            </div>
            <div style="font-size: 1.2rem;">${statusIcon}</div>
        </div>
        <div class="card-actions">
            <button class="${btnClass}" ${onClick ? `onclick="${onClick}"` : 'disabled'}>
                ${btnText}
            </button>
        </div>
      `;
            container.appendChild(card);
        });
    },

    updateStats(classes) {
        const records = Storage.getAttendanceRecords();
        const todayStr = TimeCheck.getTodayDateString();

        // Today's stats
        const todayRecords = records.filter(r => r.date === todayStr && r.status === 'present');
        const presentCount = todayRecords.length;
        const totalToday = classes.length;

        document.getElementById('today-stats').textContent = `${presentCount}/${totalToday}`;

        // Simple Streak Logic: Count consecutive days (working backwards from today or yesterday) where at least one class was attended
        const dates = [...new Set(records.filter(r => r.status === 'present').map(r => r.date))].sort().reverse();

        let streak = 0;
        if (dates.length > 0) {
            let currentCheck = new Date();
            // If today has no attendance yet, start checking from yesterday
            if (!dates.includes(todayStr)) {
                currentCheck.setDate(currentCheck.getDate() - 1);
            }

            // Loop back
            while (true) {
                const dateString = TimeCheck.formatDate(currentCheck);
                if (dates.includes(dateString)) {
                    streak++;
                    currentCheck.setDate(currentCheck.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        document.getElementById('streak-stats').textContent = `🔥 ${streak}`;
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        const records = Storage.getAttendanceRecords().reverse(); // Newest first

        // --- Heatmap Logic ---
        if (!this.currentHeatmapRange) this.currentHeatmapRange = 'year';
        this.renderHeatmap(this.currentHeatmapRange);

        if (records.length === 0) {
            list.innerHTML = '<p class="empty-state">No history yet.</p>';
            return;
        }

        // Group by date
        const grouped = {};
        records.forEach(r => {
            if (!grouped[r.date]) grouped[r.date] = [];
            grouped[r.date].push(r);
        });

        let html = '';
        const classesMap = Storage.getClasses().reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

        Object.keys(grouped).forEach(date => {
            html += `<div style="padding: 20px; font-weight: 600; color: var(--accent); border-bottom: 1px solid rgba(255,255,255,0.05);">${date}</div>`;

            grouped[date].forEach(r => {
                const className = classesMap[r.classId] || 'Unknown Class';
                let statusIcon = '✅ Present';
                let statusColor = 'var(--success)';

                if (r.status === 'missed') {
                    statusIcon = '❌ Missed';
                    statusColor = 'var(--danger)';
                }

                html += `
          <div style="padding: 15px 20px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>${className}</span>
            <span style="color: ${statusColor};">${statusIcon}</span>
          </div>
        `;
            });
        });

        // --- Category Stats ---
        this.renderCategoryStats();

        list.innerHTML = html;
    },

    renderCategoryStats() {
        const container = document.getElementById('category-stats');
        const classes = Storage.getClasses();
        const records = Storage.getAttendanceRecords();

        if (classes.length === 0) {
            container.innerHTML = '';
            return;
        }

        // 1. Group classes by Category
        // Map: CategoryName -> [ClassId, ClassId...]
        const catMap = {};
        classes.forEach(c => {
            const cat = c.category || 'General';
            if (!catMap[cat]) catMap[cat] = [];
            catMap[cat].push(c.id);
        });

        // 2. Calculate Stats per Category
        let html = '';
        Object.keys(catMap).forEach(cat => {
            const classIds = catMap[cat];

            // Filter records for these classes
            const catRecords = records.filter(r => classIds.includes(r.classId));
            const attended = catRecords.filter(r => r.status === 'present').length;
            const missed = catRecords.filter(r => r.status === 'missed').length;
            const total = attended + missed;

            const percent = total > 0 ? Math.round((attended / total) * 100) : 0;

            html += `
            <div class="cat-stat-card">
                <div class="cat-header">
                    <span>${cat}</span>
                    <span style="color: var(--accent);">${percent}%</span>
                </div>
                <div class="cat-progress-bg">
                    <div class="cat-progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="cat-meta">
                    <span>${attended} Attended</span>
                    <span>${total} Total</span>
                </div>
            </div>
            `;
        });

        container.innerHTML = html;
    },

    setHeatmapRange(range) {
        this.currentHeatmapRange = range;

        // Update Buttons
        document.querySelectorAll('.range-btn').forEach(btn => btn.classList.remove('active'));
        // This is a bit brittle, finding by text content would be better or ID
        const btns = document.querySelectorAll('.range-btn');
        if (range === 'year' && btns[0]) btns[0].classList.add('active');
        if (range === 'month' && btns[1]) btns[1].classList.add('active');
        if (range === 'week' && btns[2]) btns[2].classList.add('active');

        this.renderHeatmap(range);
    },

    renderHeatmap(range) {
        const grid = document.getElementById('heatmap-grid');
        grid.className = `heatmap-grid ${range}`;
        grid.innerHTML = ''; // Clear

        const today = new Date();
        const records = Storage.getAttendanceRecords();

        // Determine number of days to show
        let daysToShow = 365;
        if (range === 'month') daysToShow = 30;
        if (range === 'week') daysToShow = 7;

        // Generate dates
        const startDate = new Date();
        startDate.setDate(today.getDate() - daysToShow + 1);

        // Pre-process records for quick lookup
        // Map: "YYYY-MM-DD" -> count
        const counts = {};
        records.forEach(r => {
            if (r.status === 'present') {
                counts[r.date] = (counts[r.date] || 0) + 1;
            }
        });

        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = TimeCheck.formatDate(d);

            const count = counts[dateStr] || 0;
            let level = 0;
            if (count > 0) level = 1;
            if (count > 2) level = 2; // Arbitrary thresholds
            if (count > 4) level = 3;

            const cell = document.createElement('div');
            cell.className = `heat-cell heat-level-${level}`;
            cell.setAttribute('data-title', `${dateStr}: ${count} classes`);
            grid.appendChild(cell);
        }
    },

    // Actions

    handleAddClass() {
        const name = document.getElementById('inp-name').value;
        const category = document.getElementById('inp-category').value.trim() || 'General';
        const start = document.getElementById('inp-start').value;
        const end = document.getElementById('inp-end').value;

        // Get Checked Days
        const days = [];
        document.querySelectorAll('.days-selector input:checked').forEach(cb => {
            days.push(parseInt(cb.value));
        });

        if (days.length === 0) {
            alert("Please select at least one day for this class.");
            return;
        }

        try {
            AttendanceApp.addNewClass(name, start, end, days, category);
            this.hideModal();
            document.getElementById('add-class-form').reset();
            this.renderDashboard();
        } catch (e) {
            alert(e.message);
        }
    },

    handleCheckIn(classId) {
        try {
            const success = AttendanceApp.checkIn(classId);
            if (success) {
                if (navigator.vibrate) navigator.vibrate(50);
                this.renderDashboard();
            }
        } catch (e) {
            alert(e.message);
        }
    },

    handleDeleteClass(id) {
        if (confirm('Are you sure you want to delete this class? It cannot be undone.')) {
            AttendanceApp.deleteClass(id);
            this.renderDashboard();
        }
    },

    // Settings
    showSettings() {
        this.showModal('settings-modal');
    },

    handleExport() {
        const data = Storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    },

    handleImport(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = Storage.importData(e.target.result);
            if (success) {
                alert("Data imported successfully!");
                location.reload();
            } else {
                alert("Failed to import data. Invalid file.");
            }
        };
        reader.readAsText(file);
    },

    // Modal helpers
    showModal(id) {
        document.getElementById(id).classList.add('active');
    },
    hideModal() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }
};

// End of UI Module
