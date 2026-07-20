# Deployment Guide - LinkStack

## VPS Specs
- 2 Core, 4GB RAM (lebih dari cukup)
- OS: Ubuntu 20.04+ / Debian 11+

## 1. DNS di Cloudflare (Sudah Done)

Record yang sudah ada di Cloudflare:
```
Type: A
Name: link
Value: [IP VPS]
Proxy: Proxied (orange cloud) ← recommended
```

### Cloudflare Settings yang WAJIB diatur:

1. **SSL/TLS → Overview** → Pilih **"Full"**
   - Jangan "Flexible" (bikin redirect loop)
   - Jangan "Full (Strict)" kecuali pakai Cloudflare Origin Certificate

2. **SSL/TLS → Edge Certificates** → Always Use HTTPS: **ON**

3. **PASTIKAN** record lain (`www`, `mail`, `@`, MX) **TIDAK DIUBAH**
   - Subdomain `link` berdiri sendiri, tidak ganggu yang lain

## 2. Install Dependencies di VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools (untuk better-sqlite3 & sharp)
    sudo apt install -y build-essential python3

# Install Nginx (kalau belum ada)
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

## 3. Deploy Aplikasi

```bash
# Buat directory
sudo mkdir -p /var/www/linkstack
sudo mkdir -p /var/log/linkstack
sudo chown -R $USER:$USER /var/www/linkstack

# Copy files ke VPS (dari local)
# scp -r ./linkstack/* user@IP_VPS:/var/www/linkstack/

# Di VPS:
cd /var/www/linkstack
npm install --production

# Setup (buat .env, database, admin user)
npm run setup
```

## 4. Setup Nginx

```bash
# Copy nginx config
sudo cp /var/www/linkstack/nginx/link.seikoupay.com.conf /etc/nginx/sites-available/

# Tambahkan rate limit config
# Edit /etc/nginx/nginx.conf, di dalam http { } tambahkan:
# limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Enable site
sudo ln -s /etc/nginx/sites-available/link.seikoupay.com.conf /etc/nginx/sites-enabled/

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

## 5. SSL (Cloudflare Handle)

Karena pakai Cloudflare Proxied (orange cloud), SSL sudah otomatis di-handle Cloudflare.
Tidak perlu certbot. Visitor akses via HTTPS, Cloudflare forward ke VPS via HTTP (port 80).

Kalau mau extra security (encrypt antara Cloudflare ↔ VPS juga):
```bash
# Option A: Cloudflare Origin Certificate (recommended, gratis 15 tahun)
# 1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
# 2. Download .pem dan .key
# 3. Simpan di VPS:
sudo mkdir -p /etc/ssl/cloudflare
# Upload cert dan key ke /etc/ssl/cloudflare/
# 4. Update nginx untuk listen 443 juga (optional, Cloudflare tetap connect via 80)

# Option B: Self-signed (simple, karena Cloudflare yang validate ke visitor)
# Tidak perlu apa-apa, mode "Full" sudah cukup dengan HTTP
```

## 6. Start dengan PM2

```bash
cd /var/www/linkstack
pm2 start ecosystem.config.js

# Auto-start saat reboot
pm2 startup
pm2 save
```

## 7. Verifikasi

- Buka: http://link.seikoupay.com → Landing page
- Buka: http://link.seikoupay.com/login → Login page
- Buka: http://link.seikoupay.com/admin → Login sebagai admin
- Buka: http://link.seikoupay.com/namauser → Profile page

## Keamanan Tambahan

```bash
# Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Pastikan port 3500 TIDAK terbuka ke publik
# Nginx yang handle reverse proxy
```

## Maintenance

```bash
# Lihat logs
pm2 logs linkstack

# Restart
pm2 restart linkstack

# Update code
cd /var/www/linkstack
git pull  # atau scp ulang
npm install --production
pm2 restart linkstack
```

## Backup Database

```bash
# Backup SQLite
cp /var/www/linkstack/data/linkstack.db /backup/linkstack_$(date +%Y%m%d).db

# Cron backup harian (tambah ke crontab -e)
0 2 * * * cp /var/www/linkstack/data/linkstack.db /backup/linkstack_$(date +\%Y\%m\%d).db
```
