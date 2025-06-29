const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const express = require('express')
const cors = require('cors')
const QRCode = require('qrcode-terminal')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// CORS - Railway production için güncellenmiş
app.use(cors({
    origin: [
        'https://rota-crm-production.up.railway.app',
        'https://*.vercel.app',
        'http://localhost:8001',
        'http://localhost:3000',
        '*' // Development için
    ],
    credentials: true
}))

app.use(express.json())

// WhatsApp bağlantı durumu
let sock = null
let qrCode = null
let connectionState = 'disconnected'
let connectedUser = null

// WhatsApp başlatma fonksiyonu
async function initWhatsApp() {
    try {
        console.log('🚀 WhatsApp servisi başlatılıyor...')
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info')

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Rota CRM Bot', 'Chrome', '1.0.0'],
            markOnlineOnConnect: false
        })

        // Bağlantı durumu takibi
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                qrCode = qr
                connectionState = 'qr_required'
                console.log('📱 QR kod oluşturuldu - Taranmayı bekliyor...')
                // Terminal'de QR göster (development için)
                QRCode.generate(qr, {small: true})
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('❌ Bağlantı kapandı:', lastDisconnect?.error, ', Yeniden bağlanılıyor:', shouldReconnect)

                if (shouldReconnect) {
                    connectionState = 'reconnecting'
                    setTimeout(initWhatsApp, 5000)
                } else {
                    connectionState = 'logged_out'
                    qrCode = null
                    connectedUser = null
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp başarıyla bağlandı!')
                qrCode = null
                connectionState = 'connected'
                connectedUser = sock.user
                
                // Bağlantı bilgisini logla
                console.log('👤 Bağlı kullanıcı:', sock.user.name || sock.user.id)
            }
        })

        // Kimlik bilgileri güncellemesi
        sock.ev.on('creds.update', saveCreds)

        // Mesaj alma olayı (isteğe bağlı)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const message = messages[0]
            if (!message.key.fromMe && message.message) {
                console.log('📨 Yeni mesaj alındı:', message.key.remoteJid)
            }
        })

    } catch (error) {
        console.error('❌ WhatsApp başlatma hatası:', error)
        connectionState = 'error'
        setTimeout(initWhatsApp, 10000)
    }
}

// Türk telefon numarası formatla
function formatTurkishPhoneNumber(phoneNumber) {
    try {
        // Sadece rakamları al
        let cleanNumber = phoneNumber.replace(/\D/g, '')
        
        // Türk numarası formatla
        if (cleanNumber.startsWith('0')) {
            // 05xxxxxxxxx -> 905xxxxxxxxx
            cleanNumber = '90' + cleanNumber.substring(1)
        } else if (cleanNumber.startsWith('5') && cleanNumber.length === 10) {
            // 5xxxxxxxxx -> 905xxxxxxxxx
            cleanNumber = '90' + cleanNumber
        } else if (!cleanNumber.startsWith('90')) {
            // Diğer durumlar için 90 ekle
            cleanNumber = '90' + cleanNumber
        }
        
        // WhatsApp JID formatı
        return `${cleanNumber}@s.whatsapp.net`
    } catch (error) {
        throw new Error('Geçersiz telefon numarası formatı')
    }
}

// WhatsApp mesajı gönder
async function sendWhatsAppMessage(phoneNumber, message) {
    try {
        if (!sock || connectionState !== 'connected') {
            return { 
                success: false, 
                error: 'WhatsApp bağlı değil. Lütfen QR kod tarayın.' 
            }
        }

        const jid = formatTurkishPhoneNumber(phoneNumber)
        
        console.log(`📤 Mesaj gönderiliyor: ${phoneNumber} -> ${jid}`)
        
        await sock.sendMessage(jid, { text: message })
        
        console.log('✅ Mesaj başarıyla gönderildi')
        return { success: true, message: 'Mesaj başarıyla gönderildi' }

    } catch (error) {
        console.error('❌ Mesaj gönderme hatası:', error)
        return { 
            success: false, 
            error: `Mesaj gönderilemedi: ${error.message}` 
        }
    }
}

// REST API Endpoints

// QR kodu al
app.get('/qr', (req, res) => {
    res.json({ 
        qr: qrCode,
        connectionState: connectionState
    })
})

// Bağlantı durumu
app.get('/status', (req, res) => {
    res.json({
        connected: connectionState === 'connected',
        connectionState: connectionState,
        user: connectedUser,
        timestamp: new Date().toISOString()
    })
})

// Mesaj gönder (ana backend uyumlu)
app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body
        
        if (!phone || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Telefon numarası ve mesaj gerekli' 
            })
        }

        const result = await sendWhatsAppMessage(phone, message)
        res.json(result)
        
    } catch (error) {
        console.error('API Error:', error)
        res.status(500).json({ 
            success: false, 
            message: error.message 
        })
    }
})

// Mesaj gönder (eski endpoint)
app.post('/send', async (req, res) => {
    try {
        const { phone_number, message } = req.body
        
        if (!phone_number || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Telefon numarası ve mesaj gerekli' 
            })
        }

        const result = await sendWhatsAppMessage(phone_number, message)
        
        if (result.success) {
            res.json(result)
        } else {
            res.status(400).json(result)
        }
        
    } catch (error) {
        console.error('API Error:', error)
        res.status(500).json({ 
            success: false, 
            error: error.message 
        })
    }
})

// Test mesajı gönder
app.post('/test', async (req, res) => {
    try {
        const { phone_number } = req.body
        
        const testMessage = `🧪 Test Mesajı

Merhaba! Bu Rota CRM sisteminden gönderilen bir test mesajıdır.

📅 Tarih: ${new Date().toLocaleString('tr-TR')}
✅ WhatsApp entegrasyonu çalışıyor!

Bu mesajı alıyorsanız, sistem düzgün çalışıyor demektir.

İyi günler! 🌟`

        const result = await sendWhatsAppMessage(phone_number, testMessage)
        res.json(result)
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        })
    }
})

// Sağlık kontrolü
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Rota CRM WhatsApp Service',
        timestamp: new Date().toISOString(),
        connectionState: connectionState
    })
})

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 WhatsApp servisi çalışıyor: http://localhost:${PORT}`)
    console.log(`📱 Health check: http://localhost:${PORT}/health`)
    console.log(`🔍 QR kod: http://localhost:${PORT}/qr`)
    console.log(`📊 Status: http://localhost:${PORT}/status`)
    
    // WhatsApp'ı başlat
    initWhatsApp()
})

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 WhatsApp servisi kapatılıyor...')
    if (sock) {
        sock.end()
    }
    process.exit(0)
})

module.exports = { sendWhatsAppMessage }
