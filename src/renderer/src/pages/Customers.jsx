import { useState, useEffect, useCallback } from 'react'

const emptyCustomer = { name: '', phone: '', address: '' }

function Customers() {
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyCustomer)
  const [showOrders, setShowOrders] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])

  const load = useCallback(() => {
    window.api.getCustomers().then(setCustomers)
  }, [])

  useEffect(() => {
    let cancelled = false
    window.api.getCustomers().then((data) => {
      if (!cancelled) setCustomers(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyCustomer)
    setShowModal(true)
  }

  const openEdit = (customer) => {
    setEditing(customer)
    setForm({ name: customer.name, phone: customer.phone || '', address: customer.address || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await window.api.updateCustomer({ ...form, id: editing.id })
    } else {
      await window.api.addCustomer(form)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('هل تريد حذف هذا العميل؟')) {
      await window.api.deleteCustomer(id)
      load()
    }
  }

  const viewOrders = async (customer) => {
    const orders = await window.api.getCustomerOrders(customer.id)
    setCustomerOrders(orders)
    setShowOrders(customer)
  }

  const statusBadge = (status) => {
    const cls = {
      'قيد الانتظار': 'badge-pending',
      'جاري التوصيل': 'badge-delivery',
      مكتمل: 'badge-completed'
    }
    return <span className={`badge ${cls[status] || ''}`}>{status}</span>
  }

  return (
    <div>
      <div className="page-header">
        <h1>إدارة العملاء</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + إضافة عميل
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">إجمالي العملاء</div>
          <div className="stat-value">{customers.length}</div>
        </div>
      </div>

      <div className="card">
        {customers.length === 0 ? (
          <div className="empty-state">لا يوجد عملاء بعد. أضف أول عميل!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>العنوان</th>
                <th>تاريخ التسجيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.address || '-'}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-primary" onClick={() => viewOrders(c)}>
                      الطلبات
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(c)}>
                      تعديل
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* نافذة إضافة/تعديل */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'تعديل العميل' : 'إضافة عميل جديد'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>الاسم</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="مثال: 01012345678"
                  />
                </div>
                <div className="form-group">
                  <label>العنوان</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="عنوان التوصيل"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editing ? 'تحديث' : 'إضافة العميل'}
                </button>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة طلبات العميل */}
      {showOrders && (
        <div className="modal-overlay" onClick={() => setShowOrders(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>طلبات {showOrders.name}</h3>
            {customerOrders.length === 0 ? (
              <div className="empty-state">لا توجد طلبات لهذا العميل بعد.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الحالة</th>
                    <th>الإجمالي</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{statusBadge(o.status)}</td>
                      <td>{o.total_amount.toFixed(2)} ج.م</td>
                      <td>{new Date(o.created_at).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowOrders(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
