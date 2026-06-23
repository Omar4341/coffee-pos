import { useState, useEffect, useCallback } from 'react'

const statusBadge = (status) => {
  const cls = {
    'قيد الانتظار': 'badge-pending',
    'جاري التوصيل': 'badge-delivery',
    مكتمل: 'badge-completed'
  }
  return <span className={`badge ${cls[status] || ''}`}>{status}</span>
}

function Orders() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showItems, setShowItems] = useState(null)
  const [orderItems, setOrderItems] = useState([])

  const [form, setForm] = useState({
    customer_id: '',
    delivery_driver: '',
    delivery_fee: '',
    status: 'قيد الانتظار'
  })
  const [items, setItems] = useState([{ product_id: '', quantity: '1' }])

  const load = useCallback(() => {
    Promise.all([window.api.getOrders(), window.api.getProducts(), window.api.getCustomers()]).then(
      ([o, p, c]) => {
        setOrders(o)
        setProducts(p)
        setCustomers(c)
      }
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.getOrders(), window.api.getProducts(), window.api.getCustomers()]).then(
      ([o, p, c]) => {
        if (cancelled) return
        setOrders(o)
        setProducts(p)
        setCustomers(c)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  const openAdd = () => {
    setForm({ customer_id: '', delivery_driver: '', delivery_fee: '', status: 'قيد الانتظار' })
    setItems([{ product_id: '', quantity: '1' }])
    setShowModal(true)
  }

  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: '1' }])
  }

  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calcTotal = () => {
    let total = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === parseInt(item.product_id))
      if (!product) return sum
      return sum + product.price * (parseInt(item.quantity) || 0)
    }, 0)
    total += parseFloat(form.delivery_fee) || 0
    return total
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validItems = items.filter((i) => i.product_id)
    if (validItems.length === 0) return alert('أضف منتج واحد على الأقل')

    const orderData = {
      customer_id: form.customer_id ? parseInt(form.customer_id) : null,
      delivery_driver: form.delivery_driver || null,
      delivery_fee: parseFloat(form.delivery_fee) || 0,
      status: form.status,
      total_amount: calcTotal()
    }

    const orderItemsData = validItems.map((i) => {
      const product = products.find((p) => p.id === parseInt(i.product_id))
      return {
        product_id: parseInt(i.product_id),
        quantity: parseInt(i.quantity) || 1,
        unit_price: product ? product.price : 0
      }
    })

    await window.api.addOrder(orderData, orderItemsData)
    setShowModal(false)
    load()
  }

  const handleStatusChange = async (id, newStatus) => {
    await window.api.updateOrderStatus(id, newStatus)
    load()
  }

  const viewItems = async (orderId) => {
    const data = await window.api.getOrderItems(orderId)
    setOrderItems(data)
    setShowItems(orderId)
  }

  const handleDelete = async (id) => {
    if (confirm('هل تريد حذف هذا الطلب؟')) {
      await window.api.deleteOrder(id)
      load()
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'قيد الانتظار').length
  const deliveryCount = orders.filter((o) => o.status === 'جاري التوصيل').length

  return (
    <div>
      <div className="page-header">
        <h1>الطلبات والتوصيل</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + طلب جديد
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">إجمالي الطلبات</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">قيد الانتظار</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">جاري التوصيل</div>
          <div className="stat-value">{deliveryCount}</div>
        </div>
      </div>

      <div className="card">
        {orders.length === 0 ? (
          <div className="empty-state">لا توجد طلبات بعد. أنشئ أول طلب!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>العميل</th>
                <th>الحالة</th>
                <th>السائق</th>
                <th>رسوم التوصيل</th>
                <th>الإجمالي</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customer_name || 'عميل عابر'}</td>
                  <td>{statusBadge(o.status)}</td>
                  <td>{o.delivery_driver || '-'}</td>
                  <td>{o.delivery_fee.toFixed(2)} ج.م</td>
                  <td>
                    <strong>{o.total_amount.toFixed(2)} ج.م</strong>
                  </td>
                  <td>{new Date(o.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-primary" onClick={() => viewItems(o.id)}>
                      الأصناف
                    </button>
                    {o.status === 'قيد الانتظار' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStatusChange(o.id, 'جاري التوصيل')}
                      >
                        شحن
                      </button>
                    )}
                    {o.status === 'جاري التوصيل' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStatusChange(o.id, 'مكتمل')}
                      >
                        إكمال
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o.id)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* نافذة طلب جديد */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>طلب جديد</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>العميل</label>
                  <select
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  >
                    <option value="">عميل عابر</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>الحالة</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>قيد الانتظار</option>
                    <option>جاري التوصيل</option>
                    <option>مكتمل</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>سائق التوصيل</label>
                  <input
                    value={form.delivery_driver}
                    onChange={(e) => setForm({ ...form, delivery_driver: e.target.value })}
                    placeholder="اسم السائق"
                  />
                </div>
                <div className="form-group">
                  <label>رسوم التوصيل (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.delivery_fee}
                    onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                  />
                </div>
              </div>

              <h4 style={{ margin: '16px 0 8px' }}>أصناف الطلب</h4>
              {items.map((item, idx) => (
                <div key={idx} className="form-row" style={{ alignItems: 'end', marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>المنتج</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">اختر المنتج</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (المخزون: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0, width: 80 }}>
                      <label>الكمية</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(idx)}
                        style={{ marginBottom: 2 }}
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm"
                onClick={addItemRow}
                style={{ marginTop: 4, background: '#eee' }}
              >
                + إضافة صنف
              </button>

              <div style={{ marginTop: 16, textAlign: 'left', fontSize: 18, fontWeight: 700 }}>
                الإجمالي: {calcTotal().toFixed(2)} ج.م
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  إنشاء الطلب
                </button>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة أصناف الطلب */}
      {showItems && (
        <div className="modal-overlay" onClick={() => setShowItems(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>أصناف الطلب #{showItems}</h3>
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي الفرعي</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit_price.toFixed(2)} ج.م</td>
                    <td>{(item.quantity * item.unit_price).toFixed(2)} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowItems(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
