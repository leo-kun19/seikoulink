let currentUser = null;
let allLinks = [];

function getCsrfToken() {
  var match = document.cookie.match(/(?:^|; )_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function init() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/login';
      return;
    }
    currentUser = await res.json();
    if (currentUser.is_admin && window.location.pathname === '/dashboard') {
      window.location.href = '/admin';
      return;
    }

    // Show verification alert if email not verified
    var verifyAlertEl = document.getElementById('verifyAlert');
    var verifyBadgeEl = document.getElementById('verifyBadge');
    var unverifyBadgeEl = document.getElementById('unverifyBadge');
    if (!currentUser.email_verified) {
      if (verifyAlertEl) {
        verifyAlertEl.hidden = false;
        verifyAlertEl.classList.add('is-shown');
      }
      if (verifyBadgeEl) verifyBadgeEl.hidden = true;
      if (unverifyBadgeEl) unverifyBadgeEl.hidden = false;
      showVerificationAlert();
    } else {
      if (verifyAlertEl) {
        verifyAlertEl.hidden = true;
        verifyAlertEl.classList.remove('is-shown');
      }
      if (verifyBadgeEl) verifyBadgeEl.hidden = false;
      if (unverifyBadgeEl) unverifyBadgeEl.hidden = true;
    }

    document.getElementById('previewLink').href = '/' + currentUser.username;
    if (currentUser.is_admin) {
      var adminLink = document.createElement('a');
      adminLink.href = '/admin';
      adminLink.className = 'dash-preview-btn';
      adminLink.innerHTML = '<i data-lucide="shield"></i><span>Admin</span>';
      document.querySelector('.dash-nav-right').insertBefore(adminLink, document.getElementById('previewLink'));
      lucide.createIcons();
    }
    loadProfile();
    loadLinks();
    loadStats();
  } catch (e) {
    window.location.href = '/login';
  }
}

function loadProfile() {
  var unameInput = document.getElementById('usernameInput');
  unameInput.value = currentUser.username || '';
  // Auto-lowercase + sanitize on input
  unameInput.addEventListener('input', function() {
    var caret = this.selectionStart;
    var sanitized = this.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (sanitized !== this.value) {
      this.value = sanitized;
      this.setSelectionRange(caret, caret);
    }
  });
  document.getElementById('displayName').value = currentUser.display_name || '';
  document.getElementById('bio').value = currentUser.bio || '';
  document.getElementById('accentColor').value = currentUser.accent_color || '#ff6b35';
  document.getElementById('accentValue').textContent = currentUser.accent_color || '#ff6b35';
  document.getElementById('bgColor').value = currentUser.bg_color || '#fffbf0';
  document.getElementById('bgValue').textContent = currentUser.bg_color || '#fffbf0';

  if (currentUser.avatar) {
    document.getElementById('avatarPreview').innerHTML = '<img src="/uploads/' + currentUser.avatar + '" alt="Avatar">';
  }
  if (currentUser.og_image) {
    document.getElementById('ogPreview').innerHTML = '<img src="/uploads/' + currentUser.og_image + '" alt="OG">';
  }
  if (currentUser.banner) {
    document.getElementById('bannerPreview').innerHTML = '<img src="/uploads/' + currentUser.banner + '" alt="Banner">';
    document.getElementById('bannerRemove').hidden = false;
  }

  renderThemeGrid();
}

async function loadLinks() {
  const res = await fetch('/api/links');
  allLinks = await res.json();
  renderLinks();
}

function renderLinks() {
  const container = document.getElementById('linksList');

  if (allLinks.length === 0) {
    container.innerHTML = '<div class="link-empty">Belum ada link. Klik "Tambah Link" untuk mulai.</div>';
    return;
  }

  container.innerHTML = '';

  allLinks.forEach(function(link) {
    var item = document.createElement('div');
    item.setAttribute('data-id', link.id);
    item.draggable = true;

    if (link.is_divider) {
      item.className = 'link-item link-item-divider';
      item.innerHTML = '<div class="link-item-drag"><i data-lucide="grip-vertical"></i></div>' +
        '<div class="link-item-info" style="flex:1">' +
          '<div class="link-item-title divider-title">— ' + escapeText(link.title) + ' —</div>' +
        '</div>' +
        '<div class="link-item-actions">' +
          '<button class="btn-edit" aria-label="Edit"><i data-lucide="pencil"></i></button>' +
          '<button class="btn-delete" aria-label="Hapus"><i data-lucide="trash-2"></i></button>' +
        '</div>';
    } else {
      var iconName = link.icon;
      if (!iconName || iconName === 'auto' || iconName === 'link') {
        iconName = detectIconFromUrl(link.url);
      }

      var lockIcon = link.has_password ? '<span class="link-item-lock" title="Password protected"><i data-lucide="lock"></i></span>' : '';
      var scheduleIcon = (link.schedule_start || link.schedule_end) ? '<span class="link-item-schedule" title="Scheduled"><i data-lucide="clock"></i></span>' : '';

      item.className = 'link-item';
      item.innerHTML = '<div class="link-item-drag"><i data-lucide="grip-vertical"></i></div>' +
        '<div class="link-item-icon">' + getIconSvg(iconName) + '</div>' +
        '<div class="link-item-info">' +
          '<div class="link-item-title"></div>' +
          '<div class="link-item-url"></div>' +
        '</div>' +
        '<div class="link-item-meta">' + lockIcon + scheduleIcon + '</div>' +
        '<div class="link-item-clicks">' + link.click_count + ' clicks</div>' +
        '<div class="link-item-actions">' +
          '<button class="btn-edit" aria-label="Edit link"><i data-lucide="pencil"></i></button>' +
          '<button class="btn-delete" aria-label="Hapus link"><i data-lucide="trash-2"></i></button>' +
        '</div>';

      item.querySelector('.link-item-title').textContent = link.title;
      item.querySelector('.link-item-url').textContent = link.url;
    }

    item.querySelector('.btn-edit').addEventListener('click', function() {
      openEditModal(link);
    });

    item.querySelector('.btn-delete').addEventListener('click', function() {
      deleteLink(link.id);
    });

    container.appendChild(item);
  });

  lucide.createIcons();
  initDragAndDrop();
}

function escapeText(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function openEditModal(link) {
  document.getElementById('modalTitle').textContent = link.is_divider ? 'Edit Divider' : 'Edit Link';
  document.getElementById('linkId').value = link.id;
  document.getElementById('linkTitle').value = link.title;
  document.getElementById('linkUrl').value = link.url || '';
  document.getElementById('linkIcon').value = link.icon || 'auto';
  document.getElementById('linkSocial').checked = !!link.is_social;
  document.getElementById('linkPassword').value = '';
  document.getElementById('passwordHint').textContent = link.has_password
    ? 'Sudah ada password. Isi untuk ganti, kosongkan untuk hapus password.'
    : 'Visitor harus masukkan password untuk akses link ini';
  document.getElementById('linkScheduleStart').value = link.schedule_start ? link.schedule_start.slice(0, 16) : '';
  document.getElementById('linkScheduleEnd').value = link.schedule_end ? link.schedule_end.slice(0, 16) : '';
  toggleDividerMode(!!link.is_divider);
  document.getElementById('linkModal').dataset.isDivider = link.is_divider ? '1' : '0';
  document.getElementById('linkModal').hidden = false;
}

function toggleDividerMode(isDivider) {
  var hideFields = ['linkUrl', 'linkIcon', 'linkSocial', 'linkPassword', 'linkScheduleStart', 'linkScheduleEnd'];
  var modal = document.getElementById('linkModal');
  var groups = modal.querySelectorAll('.form-group');
  groups.forEach(function(g) {
    var input = g.querySelector('input, select');
    if (input && hideFields.indexOf(input.id) >= 0) {
      g.style.display = isDivider ? 'none' : '';
      if (input.hasAttribute('required')) {
        if (isDivider) {
          input.dataset.wasRequired = '1';
          input.removeAttribute('required');
        } else if (input.dataset.wasRequired) {
          input.setAttribute('required', '');
        }
      }
    }
    var checkbox = g.querySelector('#linkSocial');
    if (checkbox) {
      g.style.display = isDivider ? 'none' : '';
    }
    var schedRow = g.querySelector('.schedule-row');
    if (schedRow) {
      g.style.display = isDivider ? 'none' : '';
    }
  });
}

async function deleteLink(id) {
  var ok = await showConfirm('Hapus link ini?', 'Hapus Link');
  if (!ok) return;
  var res = await fetch('/api/links/' + id, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
  if (res.ok) {
    loadLinks();
    loadStats();
    showToast('Link dihapus');
  }
}

async function loadStats() {
  var res = await fetch('/api/profile/stats');
  var stats = await res.json();
  document.getElementById('statViews').textContent = stats.total_views;
  document.getElementById('statClicks').textContent = stats.total_clicks;
  document.getElementById('statLinks').textContent = stats.total_links;
  document.getElementById('statToday').textContent = stats.clicks_today;

  if (stats.country_stats && stats.country_stats.length > 0) {
    document.getElementById('countryStats').hidden = false;
    var max = stats.country_stats[0].count;
    document.getElementById('countryList').innerHTML = stats.country_stats.map(function(c) {
      var pct = (c.count / max) * 100;
      var name = countryName(c.country);
      return '<div class="country-row">' +
        '<span class="country-flag">' + countryFlag(c.country) + '</span>' +
        '<span class="country-name">' + name + '</span>' +
        '<div class="country-bar"><div class="country-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="country-count">' + c.count + '</span>' +
        '</div>';
    }).join('');
  } else {
    document.getElementById('countryStats').hidden = true;
  }
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  var codePoints = code.toUpperCase().split('').map(function(c) { return 127397 + c.charCodeAt(0); });
  return String.fromCodePoint.apply(String, codePoints);
}

var COUNTRY_NAMES = { 'ID':'Indonesia','US':'United States','SG':'Singapore','MY':'Malaysia','JP':'Japan','KR':'South Korea','GB':'UK','DE':'Germany','FR':'France','AU':'Australia','CN':'China','IN':'India','TH':'Thailand','PH':'Philippines','VN':'Vietnam','BR':'Brazil','RU':'Russia','CA':'Canada','NL':'Netherlands','IT':'Italy','ES':'Spain','MX':'Mexico','TR':'Turkey','SA':'Saudi Arabia','AE':'UAE','HK':'Hong Kong','TW':'Taiwan' };

function countryName(code) {
  return COUNTRY_NAMES[code] || code;
}

var modal = document.getElementById('linkModal');
var linkForm = document.getElementById('linkForm');

document.getElementById('addLinkBtn').addEventListener('click', function() {
  document.getElementById('modalTitle').textContent = 'Tambah Link';
  document.getElementById('linkId').value = '';
  document.getElementById('linkTitle').value = '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkIcon').value = 'auto';
  document.getElementById('linkSocial').checked = false;
  document.getElementById('linkPassword').value = '';
  document.getElementById('passwordHint').textContent = 'Visitor harus masukkan password untuk akses link ini';
  document.getElementById('linkScheduleStart').value = '';
  document.getElementById('linkScheduleEnd').value = '';
  toggleDividerMode(false);
  modal.dataset.isDivider = '0';
  modal.hidden = false;
});

document.getElementById('addDividerBtn').addEventListener('click', function() {
  document.getElementById('modalTitle').textContent = 'Tambah Divider';
  document.getElementById('linkId').value = '';
  document.getElementById('linkTitle').value = '';
  toggleDividerMode(true);
  modal.dataset.isDivider = '1';
  modal.hidden = false;
});

document.getElementById('modalClose').addEventListener('click', function() { modal.hidden = true; });
document.getElementById('modalCancelBtn').addEventListener('click', function() { modal.hidden = true; });

modal.addEventListener('click', function(e) {
  if (e.target === modal) modal.hidden = true;
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
});

linkForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var id = document.getElementById('linkId').value;
  var title = document.getElementById('linkTitle').value;
  var isDivider = modal.dataset.isDivider === '1';

  var payload = { title: title, is_divider: isDivider ? 1 : 0 };

  if (!isDivider) {
    var url = document.getElementById('linkUrl').value.trim();
    if (!url) {
      showToast('URL wajib diisi');
      return;
    }
    var icon = document.getElementById('linkIcon').value;

    if (url && !url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }

    if (icon === 'auto') {
      icon = detectIconFromUrl(url);
    }

    payload.url = url;
    payload.icon = icon;
    payload.is_social = document.getElementById('linkSocial').checked ? 1 : 0;
    payload.password = document.getElementById('linkPassword').value;
    payload.schedule_start = document.getElementById('linkScheduleStart').value || null;
    payload.schedule_end = document.getElementById('linkScheduleEnd').value || null;
  }

  var method = id ? 'PUT' : 'POST';
  var endpoint = id ? '/api/links/' + id : '/api/links';

  var res = await fetch(endpoint, {
    method: method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    modal.hidden = true;
    loadLinks();
    loadStats();
    showToast(id ? 'Tersimpan' : 'Ditambahkan');
  } else {
    var err = await res.json();
    showToast(err.error || 'Gagal menyimpan');
  }
});

document.getElementById('profileForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var data = {
    display_name: document.getElementById('displayName').value,
    bio: document.getElementById('bio').value,
    accent_color: document.getElementById('accentColor').value,
    bg_color: document.getElementById('bgColor').value,
    theme_preset: currentUser.theme_preset || 'default'
  };

  var res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    showToast('Profil disimpan');
  }
});

document.getElementById('accentColor').addEventListener('input', function(e) {
  document.getElementById('accentValue').textContent = e.target.value;
});

document.getElementById('bgColor').addEventListener('input', function(e) {
  document.getElementById('bgValue').textContent = e.target.value;
});

document.getElementById('avatarBtn').addEventListener('click', function() {
  document.getElementById('avatarInput').click();
});

document.getElementById('avatarInput').addEventListener('change', async function(e) {
  var file = e.target.files[0];
  if (!file) return;

  var formData = new FormData();
  formData.append('avatar', file);

  var res = await fetch('/api/profile/avatar', {
    method: 'POST',
    headers: { 'X-CSRF-Token': getCsrfToken() },
    body: formData
  });

  if (res.ok) {
    var data = await res.json();
    document.getElementById('avatarPreview').innerHTML = '<img src="/uploads/' + data.avatar + '" alt="Avatar">';
    showToast('Avatar diupload');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async function() {
  await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': getCsrfToken() } });
  window.location.href = '/login';
});

function initDragAndDrop() {
  var container = document.getElementById('linksList');
  var dragItem = null;

  container.querySelectorAll('.link-item').forEach(function(item) {
    item.addEventListener('dragstart', function(e) {
      dragItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.getAttribute('data-id'));
      setTimeout(function() {
        item.style.opacity = '0.4';
      }, 0);
    });

    item.addEventListener('dragend', function() {
      item.classList.remove('dragging');
      item.style.opacity = '1';
      dragItem = null;
      saveOrder();
    });

    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dragItem || item === dragItem) return;

      var rect = item.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        container.insertBefore(dragItem, item);
      } else {
        if (item.nextSibling) {
          container.insertBefore(dragItem, item.nextSibling);
        } else {
          container.appendChild(dragItem);
        }
      }
    });

    item.addEventListener('drop', function(e) {
      e.preventDefault();
    });
  });

  container.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
}

async function saveOrder() {
  var container = document.getElementById('linksList');
  var items = container.querySelectorAll('.link-item');
  var orders = [];

  items.forEach(function(item, index) {
    orders.push({ id: parseInt(item.getAttribute('data-id')), sort_order: index + 1 });
  });

  var res = await fetch('/api/links/reorder/batch', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
    body: JSON.stringify({ orders: orders })
  });

  if (res.ok) {
    showToast('Urutan disimpan');
  }
}

function showToast(msg) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

function renderThemeGrid() {
  var grid = document.getElementById('themeGrid');
  if (!grid || typeof themePresets === 'undefined') return;
  grid.innerHTML = '';

  // Color presets section
  var colorLabel = document.createElement('div');
  colorLabel.className = 'theme-section-label';
  colorLabel.textContent = 'Warna';
  grid.appendChild(colorLabel);

  var colorRow = document.createElement('div');
  colorRow.className = 'theme-row';
  Object.keys(themePresets).forEach(function(key) {
    var t = themePresets[key];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-btn' + (currentUser.theme_preset === key ? ' active' : '');
    btn.title = t.name;
    btn.style.background = t.bg;
    btn.style.borderColor = t.accent;
    btn.innerHTML = '<span style="background:' + t.accent + ';width:12px;height:12px;display:block;border-radius:50%"></span>';
    btn.addEventListener('click', function() {
      document.getElementById('accentColor').value = t.accent;
      document.getElementById('accentValue').textContent = t.accent;
      document.getElementById('bgColor').value = t.bg;
      document.getElementById('bgValue').textContent = t.bg;
      currentUser.theme_preset = key;
      grid.querySelectorAll('.theme-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    colorRow.appendChild(btn);
  });
  grid.appendChild(colorRow);

  // Premium themes section
  if (typeof premiumThemes !== 'undefined') {
    var premiumLabel = document.createElement('div');
    premiumLabel.className = 'theme-section-label';
    premiumLabel.textContent = 'Tema Premium';
    grid.appendChild(premiumLabel);

    var premiumGrid = document.createElement('div');
    premiumGrid.className = 'premium-grid';
    Object.keys(premiumThemes).forEach(function(key) {
      var t = premiumThemes[key];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'premium-theme-card' + (currentUser.theme_preset === key ? ' active' : '');
      card.innerHTML = '<span class="premium-dot" style="background:' + t.preview + '"></span>' +
        '<span class="premium-name">' + t.name + '</span>' +
        '<span class="premium-desc">' + t.desc + '</span>';
      card.addEventListener('click', function() {
        currentUser.theme_preset = key;
        grid.querySelectorAll('.theme-btn, .premium-theme-card').forEach(function(b) { b.classList.remove('active'); });
        card.classList.add('active');
      });
      premiumGrid.appendChild(card);
    });
    grid.appendChild(premiumGrid);
  }
}

var qrCardData = null;

document.getElementById('qrBtn').addEventListener('click', async function() {
  var res = await fetch('/api/profile/qrcode');
  if (!res.ok) return;
  var data = await res.json();
  qrCardData = data;
  document.getElementById('qrImage').src = data.qr;
  document.getElementById('qrCardName').textContent = '@' + data.username;
  document.getElementById('qrCardUrl').textContent = data.url.replace(/^https?:\/\//, '');
  document.getElementById('qrCard').style.setProperty('--qr-accent', data.accent);
  document.getElementById('qrModal').hidden = false;
  lucide.createIcons();
});

document.getElementById('qrModalClose').addEventListener('click', function() {
  document.getElementById('qrModal').hidden = true;
});

document.getElementById('qrModal').addEventListener('click', function(e) {
  if (e.target === this) this.hidden = true;
});

document.getElementById('qrDownload').addEventListener('click', async function() {
  if (!qrCardData) return;

  var canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1100;
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = qrCardData.accent;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fffbf0';
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(40, 40, canvas.width - 80, 8);
  ctx.fillRect(40, canvas.height - 48, canvas.width - 80, 8);
  ctx.fillRect(40, 40, 8, canvas.height - 80);
  ctx.fillRect(canvas.width - 48, 40, 8, canvas.height - 80);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 24px "Space Grotesk", sans-serif';
  ctx.fillText('SEIKOULINK', 90, 110);

  ctx.fillStyle = qrCardData.accent;
  ctx.font = 'bold 56px "Space Grotesk", sans-serif';
  ctx.fillText('@' + qrCardData.username, 90, 180);

  var qrImg = new Image();
  qrImg.onload = function() {
    var qrSize = 580;
    var qrX = (canvas.width - qrSize) / 2;
    var qrY = 240;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = qrCardData.accent;
    var badgeW = 200;
    var badgeH = 60;
    var badgeX = (canvas.width - badgeW) / 2;
    var badgeY = qrY + qrSize + 30;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(badgeX + 4, badgeY + 4, badgeW, badgeH);
    ctx.fillStyle = qrCardData.accent;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN ME', canvas.width / 2, badgeY + 40);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '500 22px "Space Grotesk", monospace';
    var urlText = qrCardData.url.replace(/^https?:\/\//, '');
    ctx.textAlign = 'center';
    ctx.fillText(urlText, canvas.width / 2, badgeY + badgeH + 50);

    var link = document.createElement('a');
    link.download = 'qrcode-' + qrCardData.username + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('QR Card di-download');
  };
  qrImg.src = qrCardData.qr;
});

document.getElementById('qrCopyUrl').addEventListener('click', function() {
  if (!qrCardData) return;
  navigator.clipboard.writeText(qrCardData.url);
  showToast('Link disalin!');
});

document.getElementById('ogBtn').addEventListener('click', function() {
  document.getElementById('ogInput').click();
});

document.getElementById('ogInput').addEventListener('change', async function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var formData = new FormData();
  formData.append('og_image', file);
  var res = await fetch('/api/profile/og-image', { method: 'POST', headers: { 'X-CSRF-Token': getCsrfToken() }, body: formData });
  if (res.ok) {
    var data = await res.json();
    document.getElementById('ogPreview').innerHTML = '<img src="/uploads/' + data.og_image + '" alt="OG">';
    showToast('OG Image diupload');
  }
});

document.getElementById('bannerBtn').addEventListener('click', function() {
  document.getElementById('bannerInput').click();
});

document.getElementById('bannerInput').addEventListener('change', async function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var formData = new FormData();
  formData.append('banner', file);
  var res = await fetch('/api/profile/banner', { method: 'POST', headers: { 'X-CSRF-Token': getCsrfToken() }, body: formData });
  if (res.ok) {
    var data = await res.json();
    document.getElementById('bannerPreview').innerHTML = '<img src="/uploads/' + data.banner + '" alt="Banner">';
    document.getElementById('bannerRemove').hidden = false;
    showToast('Banner diupload');
  }
});

document.getElementById('bannerRemove').addEventListener('click', async function() {
  var ok = await showConfirm('Hapus banner?', 'Hapus Banner');
  if (!ok) return;
  var res = await fetch('/api/profile/banner', { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
  if (res.ok) {
    document.getElementById('bannerPreview').innerHTML = '';
    document.getElementById('bannerRemove').hidden = true;
    showToast('Banner dihapus');
  }
});

// Custom confirm modal (replaces native window.confirm)
function showConfirm(message, title) {
  return new Promise(function(resolve) {
    var modal = document.getElementById('confirmModal');
    var titleEl = document.getElementById('confirmTitle');
    var msgEl = document.getElementById('confirmMessage');
    var okBtn = document.getElementById('confirmOk');
    var cancelBtn = document.getElementById('confirmCancel');
    var closeBtn = document.getElementById('confirmClose');

    titleEl.textContent = title || 'Konfirmasi';
    msgEl.textContent = message;
    modal.hidden = false;

    function cleanup(result) {
      modal.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onOverlay);
      resolve(result);
    }

    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onOverlay(e) { if (e.target === modal) cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onOverlay);
  });
}

lucide.createIcons();
init();

// Change username handler
document.getElementById('changeUsernameBtn').addEventListener('click', async function() {
  var input = document.getElementById('usernameInput');
  var newUsername = input.value.toLowerCase().trim();

  if (!newUsername || newUsername === currentUser.username) {
    showToast('Masukkan username baru');
    return;
  }

  if (!/^[a-z0-9_-]{3,30}$/.test(newUsername)) {
    showToast('Username: 3-30 huruf kecil, angka, dash, underscore');
    return;
  }

  var ok = await showConfirm('Ubah username jadi "' + newUsername + '"?', 'Ubah Username');
  if (!ok) return;

  var btn = this;
  btn.disabled = true;
  btn.textContent = '...';

  try {
    var res = await fetch('/api/profile/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify({ username: newUsername })
    });
    var data = await res.json();
    if (res.ok) {
      currentUser.username = data.username;
      showToast('Username diubah');
      document.getElementById('previewLink').href = '/' + data.username;
      btn.textContent = 'Ubah';
      btn.disabled = false;
    } else {
      showToast(data.error || 'Gagal ubah username');
      input.value = currentUser.username;
      btn.textContent = 'Ubah';
      btn.disabled = false;
    }
  } catch (e) {
    showToast('Gagal ubah username');
    btn.textContent = 'Ubah';
    btn.disabled = false;
  }
});

function showVerificationAlert() {
  var alert = document.getElementById('verifyAlert');
  if (!alert) return;
  alert.hidden = false;

  var resendBtn = document.getElementById('resendVerifyBtn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async function() {
      resendBtn.disabled = true;
      resendBtn.textContent = 'Mengirim...';
      try {
        var r = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'X-CSRF-Token': getCsrfToken() }
        });
        var data = await r.json();
        if (r.ok) {
          resendBtn.textContent = '✓ Email Terkirim!';
          showToast('Email verifikasi dikirim ulang. Cek inbox kamu.');
          setTimeout(function() {
            resendBtn.textContent = 'Kirim Ulang Email';
            resendBtn.disabled = false;
          }, 60000);
        } else {
          resendBtn.textContent = 'Kirim Ulang Email';
          resendBtn.disabled = false;
          showToast(data.error || 'Gagal mengirim email');
        }
      } catch (e) {
        resendBtn.textContent = 'Kirim Ulang Email';
        resendBtn.disabled = false;
        showToast('Gagal mengirim email');
      }
    });
  }
}
