/**
 * ui.js
 * Handles all DOM interactions and rendering.
 */

const UI = {
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

            card.className = cardClass;
            card.innerHTML = `
        <div class="card-class-actions">
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
        const present = classes.filter(c => c.computedStatus === 'present').length;
        const total = classes.length;
        document.getElementById('today-stats').textContent = `${present}/${total}`;
        // Streak stats placeholder
        document.getElementById('streak-stats').textContent = `🔥 ${present > 0 ? 1 : 0}`;
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        const records = Storage.getAttendanceRecords().reverse(); // Newest first

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
                html += `
          <div style="padding: 15px 20px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>${className}</span>
            <span style="color: var(--success);">✅ Present</span>
          </div>
        `;
            });
        });

        list.innerHTML = html;
    },

    // Actions

    handleAddClass() {
        const name = document.getElementById('inp-name').value;
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
            AttendanceApp.addNewClass(name, start, end, days);
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

// Initialize App
document.addEventListener('DOMContentLoaded', () => UI.init());
