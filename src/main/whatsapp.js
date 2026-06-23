import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import { app } from 'electron'
import { join } from 'path'

let client = null
let qrCodeData = null
let connectionStatus = 'disconnected' // disconnected, qr_pending, connecting, connected
let mainWindow = null

export function setMainWindow(win) {
  mainWindow = win
}

function emitStatus(status, data = null) {
  connectionStatus = status
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('whatsapp:status', { status, data })
  }
}

export function getWhatsAppStatus() {
  return { status: connectionStatus, qrCode: qrCodeData }
}

export function initWhatsApp() {
  if (client) return

  const authPath = join(app.getPath('userData'), 'whatsapp-auth')

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    }
  })

  client.on('qr', (qr) => {
    qrCodeData = qr
    qrcode.generate(qr, { small: true })
    emitStatus('qr_pending', qr)
  })

  client.on('loading_screen', () => {
    emitStatus('connecting')
  })

  client.on('authenticated', () => {
    qrCodeData = null
    emitStatus('connecting')
  })

  client.on('ready', () => {
    qrCodeData = null
    emitStatus('connected')
    console.log('[WhatsApp] Client is ready')
  })

  client.on('auth_failure', () => {
    qrCodeData = null
    emitStatus('disconnected')
    console.error('[WhatsApp] Authentication failed')
  })

  client.on('disconnected', (reason) => {
    qrCodeData = null
    emitStatus('disconnected')
    console.log('[WhatsApp] Disconnected:', reason)
    client = null
  })

  client.initialize()
}

export function disconnectWhatsApp() {
  if (client) {
    client.destroy()
    client = null
    qrCodeData = null
    emitStatus('disconnected')
  }
}

function formatPhone(phone) {
  if (!phone) return null
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  // Egyptian numbers: if starts with 0, replace with 20
  if (cleaned.startsWith('0')) {
    cleaned = '20' + cleaned.slice(1)
  }
  // If doesn't start with country code, assume Egypt (20)
  if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned
  }
  return cleaned + '@c.us'
}

export async function sendOrderStatusMessage(order, items, customerPhone, newStatus) {
  if (!client || connectionStatus !== 'connected') {
    return { success: false, error: 'واتساب غير متصل' }
  }

  const chatId = formatPhone(customerPhone)
  if (!chatId) {
    return { success: false, error: 'رقم التلفون غير صالح' }
  }

  let statusText = ''
  let emoji = ''
  if (newStatus === 'جاري التوصيل') {
    statusText = 'جاري التوصيل 🚚'
    emoji = '📦'
  } else if (newStatus === 'مكتمل') {
    statusText = 'تم التوصيل ✅'
    emoji = '🎉'
  } else {
    return { success: false, error: 'لا يتم إرسال رسائل لهذه الحالة' }
  }

  // Build order summary
  const itemLines = items
    .map(
      (item) =>
        `  • ${item.product_name || item.name} × ${item.quantity} = ${(item.unit_price * item.quantity).toFixed(2)} ج.م`
    )
    .join('\n')

  const message = `${emoji} *سيستم بن العرايشي*

مرحباً${order.customer_name ? ' ' + order.customer_name : ''}،

حالة طلبك #${order.id}: *${statusText}*

📋 *تفاصيل الطلب:*
${itemLines}
${order.delivery_fee > 0 ? `  🚚 رسوم التوصيل: ${order.delivery_fee.toFixed(2)} ج.م` : ''}
💰 *الإجمالي: ${order.total_amount.toFixed(2)} ج.م*
${order.delivery_address ? `\n📍 العنوان: ${order.delivery_address}` : ''}
${newStatus === 'جاري التوصيل' ? '\nالطلب في الطريق إليك! 🏃‍♂️' : '\nشكراً لتعاملك معنا! نتمنى لك يوماً سعيداً ☕'}

— بن العرايشي`

  try {
    await client.sendMessage(chatId, message)
    return { success: true }
  } catch (err) {
    console.error('[WhatsApp] Send error:', err.message)
    return { success: false, error: err.message }
  }
}
