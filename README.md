🚀 Rota CRM WhatsApp Service

**Railway deployment için hazırlanmış WhatsApp entegrasyon servisi**

## 📋 Özellikler

- ✅ WhatsApp Web API entegrasyonu (Baileys)
- ✅ QR kod tabanlı authentication
- ✅ Türkçe telefon numarası formatı desteği
- ✅ CORS yapılandırması (Railway + Vercel uyumlu)
- ✅ Health check endpoints
- ✅ Otomatik reconnection
- ✅ Production-ready logging

## 🏗️ Railway Deployment

### Adım 1: GitHub Repository

```bash
git init
git add .
git commit -m "Initial WhatsApp service setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rota-whatsapp-service.git
git push -u origin main
```

### Adım 2: Railway Setup

1. **Railway.app**'e gidin
2. **New Project** → **Deploy from GitHub repo**
3. Repository'yi seçin: `rota-whatsapp-service`
4. **Deploy** butonuna basın

### Adım 3: Environment Variables

Railway dashboard'da **Variables** tab'ına gidin ve ekleyin:

```env
PORT=3000
NODE_ENV=production
```

### Adım 4: Domain URL'ini Alın

Deploy bittikten sonra Railway size bir URL verecek:
```
https://rota-whatsapp-service-production.up.railway.app
```

### Adım 5: Ana Backend'i Güncelleyin

Ana CRM backend'inde Railway Variables'a ekleyin:
```env
WHATSAPP_SERVICE_URL=https://rota-whatsapp-service-production.up.railway.app
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### WhatsApp Status
```http
GET /status
```

### QR Code
```http
GET /qr
```

### Send Message
```http
POST /send-message
Content-Type: application/json

{
  "phone": "05xxxxxxxxx",
  "message": "Merhaba! Bu test mesajıdır."
}
```

### Send Test Message
```http
POST /send-test
Content-Type: application/json

{
  "phone": "05xxxxxxxxx"
}
```

### Restart Service
```http
POST /restart
```

## 🔧 Local Development

```bash
# Dependencies yükle
yarn install

# Development mode
yarn dev

# Production mode
yarn start
```

## 📱 WhatsApp Authentication

1. Service başladıktan sonra `/qr` endpoint'inden QR kod alın
2. WhatsApp uygulamasında QR kodu tarayın
3. Bağlantı kurulduktan sonra `/status` ile kontrol edin

## 🔒 CORS Configuration

Service şu origin'lere izin verir:
- `https://rota-crm-production.up.railway.app` (Ana backend)
- `https://*.vercel.app` (Frontend)
- `http://localhost:*` (Development)

## 📝 Telefon Numarası Formatları

Desteklenen formatlar:
- `05xxxxxxxxx` → `905xxxxxxxxx`
- `5xxxxxxxxx` → `905xxxxxxxxx`
- `905xxxxxxxxx` → `905xxxxxxxxx`

## 🚨 Önemli Notlar

1. **Auth Persistence**: `auth_info/` klasörü Railway'de persistent storage gerektirir
2. **Memory Limits**: Railway free tier memory limitlerini dikkate alın
3. **Connection Stability**: WhatsApp bağlantısı zaman zaman kopabilir, otomatik reconnection var
4. **QR Code Expiry**: QR kodları belirli süre sonra expire olur, yeniden generate edilir

## 🔍 Troubleshooting

### Service Çalışmıyor
```bash
# Health check
curl https://your-service.railway.app/health

# Status kontrol
curl https://your-service.railway.app/status
```

### WhatsApp Bağlanamıyor
1. QR kod expire olmuş olabilir → `/qr` endpoint'ini tekrar çağırın
2. WhatsApp session sonlanmış → `/restart` endpoint'i ile yeniden başlatın
3. Railway service restart edin

### CORS Hatası
Ana backend'deki `WHATSAPP_SERVICE_URL` environment variable'ının doğru olduğundan emin olun.

## 📊 Monitoring

- **Health**: `/health` endpoint'i ile service durumunu kontrol edin
- **Logs**: Railway dashboard'da real-time logs'u takip edin
- **Status**: `/status` endpoint'i ile WhatsApp bağlantı durumunu kontrol edin

## 🏷️ Version

- **Service Version**: 1.0.0
- **Baileys Version**: ^6.6.0
- **Node.js**: >=18.0.0

---

**Rota Kalite & Danışmanlık** - WhatsApp Integration Service
