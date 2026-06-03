/* ================================================================
   District Collectorate Assistance System — Frontend JavaScript
   Multi-Agent RAG Application
   ================================================================ */

const API = 'http://localhost:8000/api';

// ── Tab Switching ───────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  const panel = document.getElementById(`panel-${tabName}`);
  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');
  if (tabName === 'announcements') loadAnnouncements();
  if (tabName === 'home') loadHomeStats();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Citizen Sub-tabs ────────────────────────────────────────────
function setSubTab(tab) {
  ['complaint', 'appointment', 'thanksgiving'].forEach(t => {
    const el = document.getElementById(`subtab-${t}`);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  document.querySelectorAll('#citizen-subtabs .sub-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.subtab === tab);
  });
  switchTab('citizen');
}

// ── Collector Dashboard Sub-tabs ────────────────────────────────
function showDashTab(tab) {
  ['complaints', 'appointments', 'messages', 'announce'].forEach(t => {
    const el = document.getElementById(`dash-${t}`);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  document.querySelectorAll('.collector-dashboard .sub-tab-btn').forEach(b => {
    b.classList.remove('active');
  });
  event.target.classList.add('active');
  if (tab === 'complaints')   loadDashboardComplaints();
  if (tab === 'appointments') loadDashboardAppointments();
  if (tab === 'messages')     loadDashboardMessages();
  if (tab === 'announce')     loadRecentAnnouncements();
}

// ── Modal ───────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── Toast Notifications ─────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API Helper ──────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${endpoint}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Server error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      throw new Error('Cannot connect to backend. Make sure the Python server is running on port 8000.');
    }
    throw e;
  }
}

// ── Format Helpers ──────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function priorityBadge(p) {
  const map = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' };
  return `<span class="badge ${map[p] || 'badge-low'}">${p || 'N/A'}</span>`;
}
function statusBadge(s) {
  const map = {
    'Received': 'badge-received', 'In Progress': 'badge-progress',
    'Resolved': 'badge-resolved', 'Closed': 'badge-pending',
    'Pending Review': 'badge-pending', 'Confirmed': 'badge-resolved',
    'Rejected': 'badge-critical'
  };
  return `<span class="badge ${map[s] || 'badge-pending'}">${s || 'Pending'}</span>`;
}

// ═══════════════════════════════════════════════════════════════
// HOME PAGE STATS
// ═══════════════════════════════════════════════════════════════
async function loadHomeStats() {
  try {
    const [cData, aData, mData] = await Promise.all([
      apiCall('/collector/complaints'),
      apiCall('/collector/appointments'),
      apiCall('/collector/messages')
    ]);
    const complaints   = cData.complaints || [];
    const appointments = aData.appointments || [];
    const messages     = mData.messages || [];
    const resolved     = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;

    document.getElementById('stat-complaints').textContent   = complaints.length;
    document.getElementById('stat-appointments').textContent = appointments.length;
    document.getElementById('stat-thanks').textContent       = messages.length;
    document.getElementById('stat-resolved').textContent     = resolved;
  } catch (e) {
    // Backend not yet running — show zeros silently
  }
}

// ═══════════════════════════════════════════════════════════════
// CITIZEN — FILE COMPLAINT
// ═══════════════════════════════════════════════════════════════
document.getElementById('complaint-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('complaint-submit-btn');
  const resultEl = document.getElementById('complaint-result');
  btn.disabled = true;
  btn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⚙️</span> AI Agents Processing...';

  const payload = {
    name:           document.getElementById('c-name').value.trim(),
    phone:          document.getElementById('c-phone').value.trim(),
    address:        document.getElementById('c-address').value.trim(),
    description:    document.getElementById('c-desc').value.trim(),
    complaint_type: document.getElementById('c-type').value
  };

  try {
    const res = await apiCall('/complaint/file', 'POST', payload);
    resultEl.innerHTML = `
      <div class="alert alert-success" style="margin-bottom:1rem">
        <div>
          <strong>✅ Complaint Registered Successfully!</strong><br/>
          <strong>Ticket ID:</strong> <code style="color:#fff;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:4px">${res.ticket_id}</code><br/>
          <strong>Category:</strong> ${res.category} &nbsp;|&nbsp; 
          <strong>Priority:</strong> ${res.priority}<br/>
          <span style="font-size:0.82rem;margin-top:4px;display:block">${res.message}</span>
        </div>
      </div>`;
    document.getElementById('complaint-form').reset();
    showToast(`Complaint filed! Ticket: ${res.ticket_id}`, 'success');
    loadHomeStats();
  } catch (err) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Submit with AI Analysis';
  }
});

// ═══════════════════════════════════════════════════════════════
// CITIZEN — REQUEST APPOINTMENT
// ═══════════════════════════════════════════════════════════════
// Set min date for appointment picker
document.getElementById('a-date').min = new Date().toISOString().split('T')[0];

document.getElementById('appointment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('appt-submit-btn');
  const resultEl = document.getElementById('appointment-result');
  btn.disabled = true;
  btn.innerHTML = '⚙️ Processing...';

  const payload = {
    name:           document.getElementById('a-name').value.trim(),
    phone:          document.getElementById('a-phone').value.trim(),
    address:        document.getElementById('a-address').value.trim(),
    purpose:        document.getElementById('a-purpose').value.trim(),
    preferred_date: document.getElementById('a-date').value || null
  };

  try {
    const res = await apiCall('/appointment/request', 'POST', payload);
    resultEl.innerHTML = `
      <div class="alert alert-success" style="margin-bottom:1rem">
        <div>
          <strong>✅ Appointment Request Submitted!</strong><br/>
          <strong>Appointment ID:</strong> <code style="color:#fff;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:4px">${res.appointment_id}</code><br/>
          <strong>Urgency:</strong> ${res.urgency} &nbsp;|&nbsp;
          <strong>Suggested:</strong> ${res.suggested_date} at ${res.suggested_time}<br/>
          <span style="font-size:0.82rem;margin-top:4px;display:block">${res.message}</span>
        </div>
      </div>`;
    document.getElementById('appointment-form').reset();
    showToast(`Appointment requested! ID: ${res.appointment_id}`, 'success');
    loadHomeStats();
  } catch (err) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📅 Request Appointment';
  }
});

// ═══════════════════════════════════════════════════════════════
// CITIZEN — THANKSGIVING
// ═══════════════════════════════════════════════════════════════
document.getElementById('thanksgiving-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('thanks-submit-btn');
  const resultEl = document.getElementById('thanks-result');
  btn.disabled = true;
  btn.innerHTML = '⚙️ Submitting...';

  const payload = {
    name:       document.getElementById('t-name').value.trim(),
    phone:      document.getElementById('t-phone').value.trim(),
    department: document.getElementById('t-dept').value,
    message:    document.getElementById('t-msg').value.trim()
  };

  try {
    const res = await apiCall('/thanksgiving/submit', 'POST', payload);
    resultEl.innerHTML = `
      <div class="alert alert-success" style="margin-bottom:1rem">
        <div>
          <strong>🙏 Appreciation Sent!</strong><br/>
          <strong>Message ID:</strong> <code style="color:#fff;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:4px">${res.message_id}</code><br/>
          <span style="font-size:0.82rem;margin-top:4px;display:block">${res.message}</span>
        </div>
      </div>`;
    document.getElementById('thanksgiving-form').reset();
    showToast('Appreciation message sent! 🙏', 'success');
    loadHomeStats();
  } catch (err) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🙏 Send Appreciation';
  }
});

// ═══════════════════════════════════════════════════════════════
// TRACK COMPLAINT
// ═══════════════════════════════════════════════════════════════
async function trackComplaint() {
  const ticketId = document.getElementById('track-id').value.trim().toUpperCase();
  const resultEl = document.getElementById('track-result');
  if (!ticketId) {
    resultEl.innerHTML = `<div class="alert alert-warning">⚠️ Please enter a Ticket ID.</div>`;
    return;
  }
  resultEl.innerHTML = `<div class="alert alert-info">🔍 Searching...</div>`;
  try {
    const res = await apiCall(`/complaint/track/${ticketId}`);
    if (res.success) {
      const c = res.complaint;
      resultEl.innerHTML = `
        <div class="card" style="border-color:rgba(108,99,255,0.3);margin-top:1rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <strong style="font-family:'Outfit',sans-serif;font-size:1rem">${c.ticket_id}</strong>
            ${statusBadge(c.status)}
          </div>
          <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${c.name}</span></div>
          <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${c.category}</span></div>
          <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value">${priorityBadge(c.priority)}</span></div>
          <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${formatDate(c.submitted_at)}</span></div>
          <div class="detail-row"><span class="detail-label">Last Updated</span><span class="detail-value">${formatDate(c.updated_at)}</span></div>
          <div style="margin-top:1rem;padding:12px;background:rgba(255,255,255,0.03);border-radius:var(--radius-sm)">
            <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">DESCRIPTION</p>
            <p style="font-size:0.88rem">${c.description}</p>
          </div>
          ${c.collector_response ? `
          <div style="margin-top:1rem;padding:12px;background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);border-radius:var(--radius-sm)">
            <p style="font-size:0.78rem;color:var(--accent);margin-bottom:6px;font-weight:600">🛡️ OFFICIAL RESPONSE</p>
            <p style="font-size:0.88rem">${c.collector_response}</p>
            ${c.resolved_at ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">Resolved: ${formatDate(c.resolved_at)}</p>` : ''}
          </div>` : '<div style="margin-top:1rem"><p style="font-size:0.82rem;color:var(--text-muted);font-style:italic">Response pending from Collector\'s office...</p></div>'}
        </div>`;
    } else {
      resultEl.innerHTML = `<div class="alert alert-error">❌ ${res.message}</div>`;
    }
  } catch (err) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════
async function loadAnnouncements() {
  const container = document.getElementById('announcements-list');
  try {
    const res = await apiCall('/announcements');
    const anns = res.announcements || [];
    if (anns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📢</div>
          <h3>No Announcements Yet</h3>
          <p>The collector hasn't posted any announcements. Check back soon.</p>
        </div>`;
      return;
    }
    container.innerHTML = anns.map(a => `
      <div class="announcement-card">
        <div class="ann-header">
          <div>
            <span class="ann-type-badge">${a.type}</span>
            <h3 class="ann-title" style="margin-top:8px">${a.title}</h3>
          </div>
          <span class="ann-date">${formatDate(a.posted_at)}</span>
        </div>
        <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.7;margin-top:8px">${a.content}</p>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-top:10px">— ${a.collector_name}</p>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// COLLECTOR — LOGIN
// ═══════════════════════════════════════════════════════════════
async function collectorLogin() {
  const pass = document.getElementById('collector-pass').value;
  const resultEl = document.getElementById('login-result');
  try {
    const res = await apiCall('/collector/login', 'POST', { password: pass });
    if (res.success) {
      document.getElementById('collector-login-screen').style.display = 'none';
      document.getElementById('collector-dashboard').classList.add('visible');
      localStorage.setItem('collector_auth', 'true');
      loadDashboardComplaints();
      loadDashboardStats();
      showToast('Welcome, District Collector!', 'success');
    }
  } catch (err) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ ${err.message || 'Invalid password'}</div>`;
  }
}

function collectorLogout() {
  localStorage.removeItem('collector_auth');
  document.getElementById('collector-login-screen').style.display = 'block';
  document.getElementById('collector-dashboard').classList.remove('visible');
  document.getElementById('collector-pass').value = '';
  showToast('Logged out successfully', 'info');
}

// Auto-login if stored
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('collector_auth') === 'true') {
    document.getElementById('collector-login-screen').style.display = 'none';
    document.getElementById('collector-dashboard').classList.add('visible');
  }
  loadHomeStats();
  loadQuickQuestions();
  // Set min date
  document.getElementById('a-date').min = new Date().toISOString().split('T')[0];
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════
async function loadDashboardStats() {
  try {
    const [cData, aData] = await Promise.all([
      apiCall('/collector/complaints'),
      apiCall('/collector/appointments')
    ]);
    const complaints = cData.complaints || [];
    const appointments = aData.appointments || [];
    document.getElementById('d-total-complaints').textContent = complaints.length;
    document.getElementById('d-critical').textContent = complaints.filter(c => c.priority === 'CRITICAL').length;
    document.getElementById('d-resolved').textContent = complaints.filter(c => c.status === 'Resolved').length;
    document.getElementById('d-appointments').textContent = appointments.length;
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — COMPLAINTS TABLE
// ═══════════════════════════════════════════════════════════════
async function loadDashboardComplaints() {
  const container = document.getElementById('complaints-table-container');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Loading complaints...</h3></div>';
  const statusFilter   = document.getElementById('filter-status')?.value || '';
  const priorityFilter = document.getElementById('filter-priority')?.value || '';

  try {
    const res = await apiCall('/collector/complaints');
    let complaints = res.complaints || [];
    if (statusFilter)   complaints = complaints.filter(c => c.status === statusFilter);
    if (priorityFilter) complaints = complaints.filter(c => c.priority === priorityFilter);

    if (complaints.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No complaints found</h3></div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Ticket ID</th><th>Name</th><th>Category</th>
            <th>Priority</th><th>Status</th><th>Submitted</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${complaints.map(c => `
            <tr>
              <td><code style="color:var(--primary-light)">${c.ticket_id}</code></td>
              <td>${c.name}</td>
              <td><span style="font-size:0.82rem">${c.category}</span></td>
              <td>${priorityBadge(c.priority)}</td>
              <td>${statusBadge(c.status)}</td>
              <td style="font-size:0.78rem;color:var(--text-muted)">${formatDate(c.submitted_at)}</td>
              <td>
                <button class="btn btn-sm btn-outline" onclick="viewComplaint('${c.ticket_id}')">View</button>
                <button class="btn btn-sm btn-primary" onclick="openRespondModal('${c.ticket_id}')">Respond</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    loadDashboardStats();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

async function viewComplaint(ticketId) {
  const res = await apiCall(`/complaint/track/${ticketId}`);
  if (!res.success) return;
  const c = res.complaint;
  document.getElementById('modal-title').textContent = `Complaint: ${c.ticket_id}`;
  document.getElementById('modal-body').innerHTML = `
    <div>
      <div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap">
        ${statusBadge(c.status)} ${priorityBadge(c.priority)}
        <span class="badge badge-medium">${c.category}</span>
      </div>
      <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${c.name}</span></div>
      <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${c.phone}</span></div>
      <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${c.address || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${formatDate(c.submitted_at)}</span></div>
      <div style="margin-top:1rem;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px">
        <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">DESCRIPTION</p>
        <p style="font-size:0.88rem;line-height:1.7">${c.description}</p>
      </div>
      ${c.collector_response ? `
      <div style="margin-top:1rem;padding:12px;background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);border-radius:8px">
        <p style="font-size:0.75rem;color:var(--accent);font-weight:600;margin-bottom:6px">COLLECTOR RESPONSE</p>
        <p style="font-size:0.88rem">${c.collector_response}</p>
      </div>` : ''}
    </div>`;
  openModal('complaint-modal');
}

async function openRespondModal(ticketId) {
  const res = await apiCall(`/complaint/track/${ticketId}`);
  if (!res.success) return;
  const c = res.complaint;
  document.getElementById('modal-title').textContent = `Respond to ${ticketId}`;
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:1rem;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.85rem">
      <strong>${c.name}</strong> · ${c.category} · ${priorityBadge(c.priority)}<br/>
      <p style="margin-top:8px;color:var(--text-secondary)">${c.description.substring(0, 200)}${c.description.length > 200 ? '...' : ''}</p>
    </div>
    <div class="form-group">
      <label>Update Status</label>
      <select id="resp-status">
        <option value="Received">Received</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
        <option value="Closed">Closed</option>
      </select>
    </div>
    <div class="form-group">
      <label>Official Response / Action Taken</label>
      <textarea id="resp-text" rows="4" placeholder="Describe the action taken or response to the citizen..."></textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="submitComplaintResponse('${ticketId}')">
      ✅ Submit Official Response
    </button>`;
  openModal('complaint-modal');
}

async function submitComplaintResponse(ticketId) {
  const status   = document.getElementById('resp-status').value;
  const response = document.getElementById('resp-text').value.trim();
  if (!response) { showToast('Please enter a response', 'warning'); return; }
  try {
    await apiCall('/collector/complaint/respond', 'POST', { ticket_id: ticketId, status, response });
    closeModal('complaint-modal');
    showToast(`Complaint ${ticketId} updated successfully!`, 'success');
    loadDashboardComplaints();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — APPOINTMENTS TABLE
// ═══════════════════════════════════════════════════════════════
async function loadDashboardAppointments() {
  const container = document.getElementById('appointments-table-container');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Loading...</h3></div>';
  try {
    const res = await apiCall('/collector/appointments');
    const apts = res.appointments || [];
    if (apts.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><h3>No appointment requests</h3></div>`;
      return;
    }
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Apt ID</th><th>Name</th><th>Urgency</th><th>Suggested Date</th>
            <th>Status</th><th>Submitted</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apts.map(a => `
            <tr>
              <td><code style="color:var(--accent)">${a.appointment_id}</code></td>
              <td>${a.name}</td>
              <td><span class="badge ${a.urgency === 'URGENT' ? 'badge-urgent' : 'badge-low'}">${a.urgency}</span></td>
              <td style="font-size:0.82rem">${a.suggested_date} · ${a.suggested_time}</td>
              <td>${statusBadge(a.status)}</td>
              <td style="font-size:0.78rem;color:var(--text-muted)">${formatDate(a.submitted_at)}</td>
              <td><button class="btn btn-sm btn-primary" onclick="openApptModal('${a.appointment_id}')">Respond</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

async function openApptModal(aptId) {
  const res = await apiCall('/collector/appointments');
  const apt = (res.appointments || []).find(a => a.appointment_id === aptId);
  if (!apt) return;
  document.getElementById('appt-modal-body').innerHTML = `
    <div style="margin-bottom:1rem;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.85rem">
      <strong>${apt.name}</strong> · ${apt.phone}<br/>
      <span class="badge ${apt.urgency === 'URGENT' ? 'badge-urgent' : 'badge-low'}" style="margin-top:6px">${apt.urgency}</span>
      <p style="margin-top:8px;color:var(--text-secondary)">${apt.purpose}</p>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="appt-status">
        <option value="Pending Review">Pending Review</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Rejected">Rejected</option>
        <option value="Completed">Completed</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Confirmed Date</label>
        <input type="date" id="appt-conf-date" value="${apt.suggested_date ? '' : ''}" />
      </div>
      <div class="form-group">
        <label>Confirmed Time</label>
        <select id="appt-conf-time">
          <option>11:00 AM</option><option>11:30 AM</option><option>12:00 PM</option>
          <option>12:30 PM</option><option>3:00 PM</option><option>3:30 PM</option>
          <option>4:00 PM</option><option>4:30 PM</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Note to Citizen</label>
      <textarea id="appt-note" rows="3" placeholder="Any instructions or note to the citizen..."></textarea>
    </div>
    <button class="btn btn-accent btn-full" onclick="submitApptResponse('${aptId}')">✅ Confirm Response</button>`;
  openModal('appt-modal');
}

async function submitApptResponse(aptId) {
  const payload = {
    appointment_id:  aptId,
    status:          document.getElementById('appt-status').value,
    confirmed_date:  document.getElementById('appt-conf-date').value,
    confirmed_time:  document.getElementById('appt-conf-time').value,
    note:            document.getElementById('appt-note').value
  };
  try {
    await apiCall('/collector/appointment/respond', 'POST', payload);
    closeModal('appt-modal');
    showToast('Appointment updated!', 'success');
    loadDashboardAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — MESSAGES
// ═══════════════════════════════════════════════════════════════
async function loadDashboardMessages() {
  const container = document.getElementById('messages-list-container');
  try {
    const res = await apiCall('/collector/messages');
    const msgs = res.messages || [];
    if (msgs.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🙏</div><h3>No appreciation messages yet</h3></div>`;
      return;
    }
    container.innerHTML = msgs.map(m => `
      <div class="card" style="margin-bottom:1rem;border-color:${m.acknowledged ? 'var(--glass-border)' : 'rgba(247,183,49,0.3)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <strong>${m.name}</strong> · <span style="color:var(--text-secondary);font-size:0.85rem">${m.department}</span>
            ${!m.acknowledged ? '<span class="badge badge-high" style="margin-left:8px">New</span>' : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:0.75rem;color:var(--text-muted)">${formatDate(m.submitted_at)}</span>
            ${!m.acknowledged ? `<button class="btn btn-sm btn-gold" onclick="acknowledgeMsg('${m.message_id}')">Acknowledge</button>` : ''}
          </div>
        </div>
        <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.7">🙏 ${m.message}</p>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">ID: ${m.message_id} · ${m.phone}</p>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

async function acknowledgeMsg(msgId) {
  try {
    await apiCall(`/collector/message/acknowledge/${msgId}`, 'POST');
    showToast('Message acknowledged!', 'success');
    loadDashboardMessages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — POST ANNOUNCEMENT
// ═══════════════════════════════════════════════════════════════
document.getElementById('announce-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title:             document.getElementById('ann-title').value.trim(),
    content:           document.getElementById('ann-content').value.trim(),
    announcement_type: document.getElementById('ann-type').value,
    collector_name:    document.getElementById('ann-collector').value.trim()
  };
  try {
    await apiCall('/collector/announce', 'POST', payload);
    document.getElementById('announce-form').reset();
    document.getElementById('ann-collector').value = 'District Collector, Coimbatore';
    showToast('Announcement published!', 'success');
    loadRecentAnnouncements();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function loadRecentAnnouncements() {
  const container = document.getElementById('recent-announcements-dash');
  try {
    const res = await apiCall('/announcements');
    const anns = (res.announcements || []).slice(0, 5);
    if (anns.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:2rem"><div class="empty-icon">📢</div><h3>No announcements yet</h3></div>`;
      return;
    }
    container.innerHTML = anns.map(a => `
      <div style="padding:10px;border-bottom:1px solid var(--glass-border);font-size:0.85rem">
        <span class="ann-type-badge">${a.type}</span>
        <p style="margin-top:6px;font-weight:600">${a.title}</p>
        <p style="color:var(--text-muted);font-size:0.75rem;margin-top:4px">${formatDate(a.posted_at)}</p>
      </div>`).join('');
  } catch (err) {}
}

// ═══════════════════════════════════════════════════════════════
// AI CHATBOT
// ═══════════════════════════════════════════════════════════════
let chatOpen = false;

function toggleChat() {
  chatOpen ? closeChat() : openChat();
}
function openChat() {
  chatOpen = true;
  document.getElementById('chat-window').classList.remove('hidden');
  document.getElementById('chat-fab').innerHTML = '✕';
}
function closeChat() {
  chatOpen = false;
  document.getElementById('chat-window').classList.add('hidden');
  document.getElementById('chat-fab').innerHTML = '🤖';
}

async function loadQuickQuestions() {
  const container = document.getElementById('quick-questions');
  try {
    const res = await apiCall('/chat/questions');
    const qs = res.questions || [];
    container.innerHTML = qs.map(q =>
      `<button class="quick-q-btn" onclick="sendQuickQ('${q.replace(/'/g, "\\'")}')">${q}</button>`
    ).join('');
  } catch (e) {
    // Show default questions if backend not running
    const defaults = [
      'How to file a complaint?', 'How to book appointment?',
      'What schemes are available?', 'Emergency contacts?',
      'How to get income certificate?', 'Track complaint status?'
    ];
    container.innerHTML = defaults.map(q =>
      `<button class="quick-q-btn" onclick="sendQuickQ('${q}')">${q}</button>`
    ).join('');
  }
}

function sendQuickQ(q) {
  document.getElementById('chat-input').value = q;
  sendChat();
}

function appendMessage(role, text) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-avatar">${role === 'bot' ? '🤖' : '👤'}</div>
    <div class="msg-bubble">${text.replace(/\n/g, '<br/>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'typing-msg';
  div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing-msg');
  if (t) t.remove();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';
  openChat();
  appendMessage('user', question);
  showTyping();
  try {
    const res = await apiCall('/chat', 'POST', { question });
    hideTyping();
    appendMessage('bot', res.answer || 'I could not find an answer. Please contact the collectorate directly.');
  } catch (err) {
    hideTyping();
    // Fallback local answers when backend is offline
    const localAnswers = {
      'complaint': 'To file a complaint, go to the Citizen Portal tab → File Complaint. Fill in your details and describe the issue. You will receive a unique Ticket ID for tracking.',
      'appointment': 'To book an appointment, visit Citizen Portal → Book Appointment. Describe your purpose clearly. The Collector\'s office responds within 2-3 working days.',
      'scheme': 'Coimbatore offers PMAY (housing), MGNREGS (employment), Kalaignar Magalir Urimai Thittam (women support), Ayushman Bharat (health), and many more schemes.',
      'emergency': 'Emergency numbers: Police: 100 | Fire: 101 | Ambulance: 108 | Women Helpline: 181 | Child Helpline: 1098 | CM Cell: 1100',
      'track': 'Enter your Ticket ID (CMP-XXXX) in the Track Status tab to check your complaint status.',
      'income': 'For income certificate, visit nearest Tahsildar office with Aadhaar and ration card. Takes 7 working days. Also available at e-Sevai centers.',
      'thank': 'To send appreciation, go to Citizen Portal → Send Appreciation. Your message will be forwarded to the official.',
      'ration': 'For ration card issues, file a complaint under PDS/Ration category in the Citizen Portal.',
      'default': 'I\'m your District Collectorate AI Assistant! The backend server seems to be offline. Please start the Python backend to enable full AI features. Meanwhile, use the tabs above to file complaints and requests.'
    };
    let answer = localAnswers.default;
    const q = question.toLowerCase();
    for (const [key, val] of Object.entries(localAnswers)) {
      if (q.includes(key)) { answer = val; break; }
    }
    appendMessage('bot', answer);
  }
}

// ── Keyboard shortcut: Enter to track ──────────────────────────
document.getElementById('track-id').addEventListener('keydown', e => {
  if (e.key === 'Enter') trackComplaint();
});

// ── CSS animation for loading spinner ──────────────────────────
const style = document.createElement('style');
style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
