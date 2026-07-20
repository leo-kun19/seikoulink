const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formError = document.getElementById('formError');

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// Show error modal based on URL param
(function handleUrlError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (!error) return;

  const errorMap = {
    'banned': {
      icon: '🚫',
      title: 'Akun Diblokir',
      message: 'Akun kamu telah di-ban oleh admin karena pelanggaran ketentuan layanan. Hubungi admin jika kamu merasa ini kesalahan.'
    },
    'oauth_failed': {
      icon: '⚠',
      title: 'Login Google Gagal',
      message: 'Proses login dengan Google gagal. Coba lagi.'
    },
    'oauth_state': {
      icon: '⚠',
      title: 'Sesi Tidak Valid',
      message: 'Sesi OAuth tidak valid atau sudah expired. Silakan coba login lagi.'
    },
    'oauth_token': {
      icon: '⚠',
      title: 'Token Tidak Valid',
      message: 'Gagal mendapatkan token dari Google. Silakan coba lagi.'
    },
    'oauth_email': {
      icon: '⚠',
      title: 'Email Tidak Terbaca',
      message: 'Email akun Google kamu tidak bisa dibaca. Pastikan akun Google kamu valid.'
    },
    'oauth_error': {
      icon: '⚠',
      title: 'Error Login',
      message: 'Terjadi kesalahan saat login dengan Google. Coba lagi atau pakai email & password.'
    }
  };

  const errorInfo = errorMap[error] || {
    icon: '⚠',
    title: 'Error',
    message: 'Terjadi kesalahan: ' + error
  };

  const modal = document.getElementById('errorModal');
  if (!modal) return;
  document.getElementById('errorModalIcon').textContent = errorInfo.icon;
  document.getElementById('errorModalTitle').textContent = errorInfo.title;
  document.getElementById('errorModalMessage').textContent = errorInfo.message;
  modal.hidden = false;

  function closeModal() {
    modal.hidden = true;
    // Clean URL
    const url = new URL(window.location);
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url);
  }

  document.getElementById('errorModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
})();

if (registerForm) {
  const usernameInput = document.getElementById('username');
  const preview = document.getElementById('usernamePreview');

  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    usernameInput.value = val;
    preview.textContent = val || 'username';
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const btn = registerForm.querySelector('.btn-submit');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        formError.textContent = data.error;
        btn.disabled = false;
        btn.textContent = 'Buat Akun';
        return;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      formError.textContent = 'Terjadi kesalahan. Coba lagi.';
      btn.disabled = false;
      btn.textContent = 'Buat Akun';
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    const btn = loginForm.querySelector('.btn-submit');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ login, password })
      });
      const data = await res.json();

      if (!res.ok) {
        formError.textContent = data.error;
        btn.disabled = false;
        btn.textContent = 'Masuk';
        return;
      }

      // Handle 2FA
      if (data.requires_2fa) {
        btn.disabled = false;
        btn.textContent = 'Masuk';
        show2FAPrompt(data.temp_token);
        return;
      }

      if (data.is_admin) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      formError.textContent = 'Terjadi kesalahan. Coba lagi.';
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });
}

function show2FAPrompt(tempToken) {
  // Create 2FA modal
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  overlay.innerHTML = '<div style="background:#fff;border:3px solid #1a1a1a;box-shadow:6px 6px 0 #1a1a1a;padding:2rem;max-width:360px;width:90%">' +
    '<h3 style="margin-bottom:1rem;font-size:1.2rem">Kode 2FA</h3>' +
    '<p style="font-size:0.9rem;color:#666;margin-bottom:1rem">Masukkan kode dari aplikasi authenticator:</p>' +
    '<input type="text" id="totpInput" maxlength="6" pattern="[0-9]{6}" style="width:100%;padding:0.75rem;font-size:1.2rem;text-align:center;border:2px solid #1a1a1a;font-family:monospace;letter-spacing:0.3em;margin-bottom:1rem" autofocus>' +
    '<div id="totpError" style="color:#dc2626;font-size:0.85rem;margin-bottom:0.5rem;display:none"></div>' +
    '<button id="totpSubmit" style="width:100%;padding:0.75rem;background:#ff6b35;color:#fff;font-weight:700;border:3px solid #1a1a1a;box-shadow:4px 4px 0 #1a1a1a;cursor:pointer;font-size:1rem">Verifikasi</button>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = document.getElementById('totpInput');
  var btn = document.getElementById('totpSubmit');
  var err = document.getElementById('totpError');
  input.focus();

  async function submit2FA() {
    var code = input.value.trim();
    if (code.length !== 6) { err.textContent = 'Kode harus 6 digit'; err.style.display = 'block'; return; }
    btn.disabled = true;
    btn.textContent = 'Memverifikasi...';
    err.style.display = 'none';
    try {
      var r = await fetch('/api/auth/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ temp_token: tempToken, totp_code: code })
      });
      var d = await r.json();
      if (!r.ok) { err.textContent = d.error; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Verifikasi'; input.value = ''; input.focus(); return; }
      if (d.is_admin) { window.location.href = '/admin'; } else { window.location.href = '/dashboard'; }
    } catch (e) { err.textContent = 'Gagal. Coba lagi.'; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Verifikasi'; }
  }

  btn.addEventListener('click', submit2FA);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') submit2FA(); });
}
