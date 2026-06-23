import { useState, useEffect, useRef } from 'react'

// eslint-disable-next-line react/prop-types
function QRCodeDisplay({ value }) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(value)}`

  return <img src={qrImageUrl} alt="WhatsApp QR Code" style={{ width: 256, height: 256 }} />
}

export default function WhatsApp() {
  const [status, setStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      window.api.whatsappGetStatus().then((result) => {
        setStatus(result.status)
        if (result.qrCode) setQrCode(result.qrCode)
      })
    }
    const unsubscribe = window.api.onWhatsAppStatus((data) => {
      setStatus(data.status)
      if (data.data && data.status === 'qr_pending') {
        setQrCode(data.data)
      } else {
        setQrCode(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  async function handleConnect() {
    setLoading(true)
    await window.api.whatsappInit()
  }

  async function handleDisconnect() {
    setLoading(true)
    await window.api.whatsappDisconnect()
    setStatus('disconnected')
    setQrCode(null)
    setLoading(false)
  }

  function getStatusBadge() {
    switch (status) {
      case 'connected':
        return <span className="badge badge-success">متصل</span>
      case 'qr_pending':
        return <span className="badge badge-warning">في انتظار مسح QR</span>
      case 'connecting':
        return <span className="badge badge-info">جاري الاتصال...</span>
      default:
        return <span className="badge badge-danger">غير متصل</span>
    }
  }

  return (
    <div>
      <h1>واتساب</h1>

      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <h3 style={{ marginBottom: 16 }}>حالة الاتصال</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          {getStatusBadge()}
          {status === 'disconnected' && (
            <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
              {loading ? 'جاري التشغيل...' : 'تشغيل واتساب'}
            </button>
          )}
          {status === 'connected' && (
            <button className="btn btn-danger" onClick={handleDisconnect} disabled={loading}>
              قطع الاتصال
            </button>
          )}
        </div>

        {status === 'qr_pending' && qrCode && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ marginBottom: 12, fontWeight: 'bold' }}>
              امسح هذا الكود من تطبيق واتساب على هاتفك:
            </p>
            <div
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 12,
                display: 'inline-block'
              }}
            >
              <QRCodeDisplay value={qrCode} />
            </div>
            <p style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
              افتح واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز
            </p>
          </div>
        )}

        {status === 'connecting' && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <p>جاري تسجيل الدخول...</p>
          </div>
        )}

        {status === 'connected' && (
          <div style={{ marginTop: 20, padding: 16, background: '#e8f5e9', borderRadius: 8 }}>
            <p style={{ fontWeight: 'bold', color: '#2e7d32' }}>واتساب متصل بنجاح!</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>سيتم إرسال رسائل تلقائية للعملاء عند:</p>
            <ul style={{ fontSize: 14, marginTop: 4, paddingRight: 20 }}>
              <li>تغيير حالة الطلب إلى &quot;جاري التوصيل&quot;</li>
              <li>تغيير حالة الطلب إلى &quot;مكتمل&quot;</li>
            </ul>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 600, margin: '20px auto' }}>
        <h3 style={{ marginBottom: 12 }}>كيف يعمل</h3>
        <ol style={{ paddingRight: 20, lineHeight: 2 }}>
          <li>اضغط &quot;تشغيل واتساب&quot; لبدء الاتصال</li>
          <li>امسح كود QR من هاتفك (مرة واحدة فقط)</li>
          <li>بعد الاتصال، عند تغيير حالة أي طلب سيتم إرسال رسالة تلقائية للعميل</li>
          <li>الرسالة تتضمن: ملخص الطلب + حالة التوصيل + الإجمالي</li>
        </ol>
      </div>
    </div>
  )
}
