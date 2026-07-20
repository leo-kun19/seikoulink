var currentAdmin = null;

async function init() {
  var res = await fetch('/api/auth/me');
  if (!res.ok) {
    window.location.href = '/login';
    return;
  }
  currentAdmin = await res.json();
  if (!currentAdmin.is_admin) {
    window.location.href = '/dashboard';
    return;
  }
  loadStats();
  loadUsers();
  load2FAStatus();
  initTabs();
}

function getCsrfToken() {
  var match = document.cookie.match(/(?:^|; )_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function loadStats() {
  var res = await fetch('/api/admin/stats');
  if (!res.ok) return;
  var stats = await res.json();
  document.getElementById('totalUsers').textContent = stats.total_users;
  document.getElementById('totalLinks').textContent = stats.total_links;
  document.getElementById('totalClicks').textContent = stats.total_clicks;
  document.getElementById('totalViews').textContent = stats.total_views;
}

async function loadUsers() {
  var res = await fetch('/api/admin/users');
  if (!res.ok) return;
  var users = await res.json();
  var tbody = document.getElementById('usersBody');

  tbody.innerHTML = users.map(function(u) {
    var status = u.is_active
      ? '<span class="badge-active">Aktif</span>'
      : '<span class="badge-banned">Banned</span>';

    var verifiedBadge = u.email_verified
      ? '<span class="badge-verified">✓ Verified</span>'
      : '<span class="badge-unverified">✗ Unverified</span>';

    // Calculate days since registration for unverified users
    var warningText = '';
    if (!u.email_verified && !u.is_admin) {
      var created = new Date(u.created_at);
      var now = new Date();
      var diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      var remaining = 3 - diffDays;
      if (remaining <= 0) {
        warningText = '<span class="badge-expired">⚠ Expired</span>';
      } else {
        warningText = '<span class="badge-warning">' + remaining + ' hari lagi</span>';
      }
    }

    var date = new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    var actions = '';
    if (!u.is_admin) {
      var toggleLabel = u.is_active ? 'Ban' : 'Unban';
      var verifyBtn = !u.email_verified
        ? '<button class="btn-action btn-success" data-action="verify" data-id="' + u.id + '">Verify</button>'
        : '';
      actions = verifyBtn +
        '<button class="btn-action" data-action="toggle" data-id="' + u.id + '">' + toggleLabel + '</button>' +
        '<button class="btn-action btn-danger" data-action="delete" data-id="' + u.id + '" data-username="' + u.username + '">Hapus</button>';
    } else {
      actions = '<span style="color:var(--muted);font-size:0.75rem">Owner</span>';
    }

    return '<tr>' +
      '<td data-label="Username"><a class="user-link" href="/' + u.username + '" target="_blank">' + u.username + '</a></td>' +
      '<td data-label="Email" style="word-break:break-all">' + u.email + '</td>' +
      '<td data-label="Links">' + (u.link_count || 0) + '</td>' +
      '<td data-label="Clicks">' + (u.total_clicks || 0) + '</td>' +
      '<td data-label="Daftar">' + date + '</td>' +
      '<td data-label="Status">' + status + '</td>' +
      '<td data-label="Verifikasi">' + verifiedBadge + warningText + '</td>' +
      '<td data-label="Aksi">' + actions + '</td>' +
      '</tr>';
  }).join('');
}

window.toggleUser = async function(id) {
  var res = await fetch('/api/admin/users/' + id + '/toggle', { method: 'PUT', headers: { 'X-CSRF-Token': getCsrfToken() } });
  if (!res.ok) {
    var data = await res.json().catch(function() { return { error: 'Gagal' }; });
    alert(data.error || 'Gagal toggle user');
    return;
  }
  loadUsers();
};

window.verifyUser = async function(id) {
  if (!confirm('Verifikasi user ini secara manual?')) return;
  var res = await fetch('/api/admin/users/' + id + '/verify', { method: 'PUT', headers: { 'X-CSRF-Token': getCsrfToken() } });
  if (!res.ok) {
    var data = await res.json().catch(function() { return { error: 'Gagal' }; });
    alert(data.error || 'Gagal verifikasi user');
    return;
  }
  loadUsers();
};

window.deleteUser = async function(id, username) {
  if (!confirm('Hapus user "' + username + '" beserta semua link-nya? Tidak bisa di-undo.')) return;
  var res = await fetch('/api/admin/users/' + id, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
  if (!res.ok) {
    var data = await res.json().catch(function() { return { error: 'Gagal' }; });
    alert(data.error || 'Gagal hapus user');
    return;
  }
  loadUsers();
  loadStats();
};

document.getElementById('logoutBtn').addEventListener('click', async function() {
  await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': getCsrfToken() } });
  window.location.href = '/login';
});

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(c) { c.hidden = true; });
      btn.classList.add('active');
      var tab = document.getElementById('tab-' + btn.dataset.tab);
      tab.hidden = false;
      if (btn.dataset.tab === 'audit') loadAuditLogs(1);
      if (btn.dataset.tab === 'blocked') loadBlockedLinks(1);
    });
  });
}

async function loadBlockedLinks(page) {
  var res = await fetch('/api/admin/blocked-links?page=' + page);
  if (!res.ok) return;
  var data = await res.json();
  var list = document.getElementById('blockedList');

  if (data.logs.length === 0) {
    list.innerHTML = '<p style="color:var(--muted);padding:1rem">Belum ada link yang diblokir. Bagus!</p>';
    return;
  }

  list.innerHTML = '<table class="users-table"><thead><tr><th>Waktu</th><th>User</th><th>Kategori</th><th>URL/Title</th><th>Alasan</th><th>IP</th></tr></thead><tbody>' +
    data.logs.map(function(log) {
      var date = new Date(log.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
      var d = {};
      try { d = JSON.parse(log.details); } catch(e) {}
      var category = d.category || '-';
      var catColor = category === 'gambling' ? '#dc2626' : category === 'pornography' ? '#9333ea' : category === 'malware' ? '#f59e0b' : '#666';
      var content = (d.url || '') + (d.title ? ' • ' + d.title : '');
      return '<tr>' +
        '<td>' + date + '</td>' +
        '<td>' + (log.username || '-') + '</td>' +
        '<td><span style="background:' + catColor + ';color:#fff;padding:2px 8px;font-size:0.7rem;font-weight:700;text-transform:uppercase">' + category + '</span></td>' +
        '<td style="font-size:0.75rem;max-width:300px;word-break:break-all">' + escapeHtml(content) + '</td>' +
        '<td style="font-size:0.75rem">' + escapeHtml(d.reason || '-') + '</td>' +
        '<td style="font-family:monospace;font-size:0.7rem">' + (log.ip || '-') + '</td>' +
      '</tr>';
    }).join('') + '</tbody></table>';

  var pag = document.getElementById('blockedPagination');
  if (data.pages > 1) {
    var btns = '';
    for (var i = 1; i <= data.pages; i++) {
      btns += '<button class="btn-action' + (i === data.page ? ' active' : '') + '" data-page="' + i + '" data-pager="blocked">' + i + '</button>';
    }
    pag.innerHTML = btns;
  } else {
    pag.innerHTML = '';
  }
}
window.loadBlockedLinks = loadBlockedLinks;

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

async function loadAuditLogs(page) {
  var res = await fetch('/api/admin/audit-logs?page=' + page);
  if (!res.ok) return;
  var data = await res.json();
  var list = document.getElementById('auditList');

  if (data.logs.length === 0) {
    list.innerHTML = '<p style="color:var(--muted);padding:1rem">Belum ada log.</p>';
    return;
  }

  list.innerHTML = '<table class="users-table"><thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>IP</th><th>Detail</th></tr></thead><tbody>' +
    data.logs.map(function(log) {
      var date = new Date(log.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
      var details = '';
      try { var d = JSON.parse(log.details); details = Object.entries(d).map(function(e) { return e[0] + ':' + e[1]; }).join(', '); } catch(e) {}
      return '<tr><td>' + date + '</td><td>' + (log.username || '-') + '</td><td><span class="audit-action">' + log.action + '</span></td><td style="font-family:monospace;font-size:0.75rem">' + (log.ip || '-') + '</td><td style="font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">' + details + '</td></tr>';
    }).join('') + '</tbody></table>';

  var pag = document.getElementById('auditPagination');
  if (data.pages > 1) {
    var btns = '';
    for (var i = 1; i <= data.pages; i++) {
      btns += '<button class="btn-action' + (i === data.page ? ' active' : '') + '" data-page="' + i + '" data-pager="audit">' + i + '</button>';
    }
    pag.innerHTML = btns;
  } else {
    pag.innerHTML = '';
  }
}
window.loadAuditLogs = loadAuditLogs;

// Event delegation for all dynamic action buttons (CSP-compliant)
document.addEventListener('click', function(e) {
  var btn = e.target.closest('button[data-action], button[data-page]');
  if (!btn) return;

  var action = btn.dataset.action;
  var page = btn.dataset.page;
  var pager = btn.dataset.pager;
  var id = btn.dataset.id;

  if (action === 'toggle') return window.toggleUser(id);
  if (action === 'verify') return window.verifyUser(id);
  if (action === 'delete') return window.deleteUser(id, btn.dataset.username);

  if (page && pager === 'audit') return loadAuditLogs(parseInt(page));
  if (page && pager === 'blocked') return loadBlockedLinks(parseInt(page));
});

async function load2FAStatus() {
  var area = document.getElementById('2faSetupArea');
  var status = document.getElementById('2faStatus');

  if (currentAdmin.totp_enabled) {
    status.textContent = '2FA aktif. Akun kamu dilindungi authenticator app.';
    area.innerHTML = '<button class="btn-action btn-danger" id="disable2fa">Nonaktifkan 2FA</button>';
    document.getElementById('disable2fa').addEventListener('click', async function() {
      var pw = prompt('Masukkan password untuk nonaktifkan 2FA:');
      if (!pw) return;
      var r = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ password: pw })
      });
      var d = await r.json();
      if (r.ok) { alert('2FA dinonaktifkan'); location.reload(); }
      else { alert(d.error); }
    });
  } else {
    status.textContent = '2FA belum aktif. Aktifkan untuk keamanan ekstra.';
    area.innerHTML = '<button class="btn-action" id="setup2fa">Setup 2FA</button>';
    document.getElementById('setup2fa').addEventListener('click', async function() {
      var r = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() }
      });
      var d = await r.json();
      if (!r.ok) { alert(d.error); return; }
      area.innerHTML = '<div style="text-align:center;margin:1rem 0"><p style="margin-bottom:1rem">Scan QR code ini dengan Google Authenticator:</p><img src="' + d.qr + '" style="width:200px;height:200px;border:3px solid #1a1a1a;margin-bottom:1rem"><p style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem">Atau masukkan manual: <code style="background:#f0f0f0;padding:2px 6px">' + d.secret + '</code></p><input type="text" id="verify2faCode" placeholder="Masukkan kode 6 digit" maxlength="6" style="padding:0.5rem;border:2px solid #1a1a1a;font-size:1rem;text-align:center;width:200px;margin-bottom:0.5rem"><br><button class="btn-action" id="verify2faBtn">Verifikasi & Aktifkan</button></div>';
      document.getElementById('verify2faBtn').addEventListener('click', async function() {
        var code = document.getElementById('verify2faCode').value;
        var vr = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({ code: code })
        });
        var vd = await vr.json();
        if (vr.ok) { alert('2FA berhasil diaktifkan!'); location.reload(); }
        else { alert(vd.error); }
      });
    });
  }
}

init();
