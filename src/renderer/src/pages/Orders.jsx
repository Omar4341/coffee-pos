import { useState, useEffect, useCallback } from 'react'

const statusBadge = (status) => {
  const cls = {
    'قيد الانتظار': 'badge-pending',
    'جاري التوصيل': 'badge-delivery',
    مكتمل: 'badge-completed',
    ملغي: 'badge-cancelled'
  }
  return <span className={`badge ${cls[status] || ''}`}>{status}</span>
}

function Orders() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [deliveryPersons, setDeliveryPersons] = useState([])
  const [deliveryZones, setDeliveryZones] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showItems, setShowItems] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [editingOrder, setEditingOrder] = useState(null)

  const [customerMode, setCustomerMode] = useState('existing') // 'existing' | 'new'
  const [customerSearch, setCustomerSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', phone2: '', address: '' })

  const [form, setForm] = useState({
    customer_id: '',
    delivery_person_id: '',
    delivery_zone_id: '',
    delivery_address: '',
    delivery_fee: '',
    status: 'قيد الانتظار'
  })
  const [items, setItems] = useState([{ product_id: '', quantity: '1' }])

  const load = useCallback(() => {
    Promise.all([
      window.api.getOrders(),
      window.api.getProducts(),
      window.api.getCustomers(),
      window.api.getDeliveryPersons(),
      window.api.getDeliveryZones()
    ]).then(([o, p, c, dp, dz]) => {
      setOrders(o)
      setProducts(p)
      setCustomers(c)
      setDeliveryPersons(dp)
      setDeliveryZones(dz)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      window.api.getOrders(),
      window.api.getProducts(),
      window.api.getCustomers(),
      window.api.getDeliveryPersons(),
      window.api.getDeliveryZones()
    ]).then(([o, p, c, dp, dz]) => {
      if (cancelled) return
      setOrders(o)
      setProducts(p)
      setCustomers(c)
      setDeliveryPersons(dp)
      setDeliveryZones(dz)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openAdd = () => {
    setEditingOrder(null)
    setCustomerMode('existing')
    setCustomerSearch('')
    setSearchResults([])
    setNewCustomer({ name: '', phone: '', phone2: '', address: '' })
    setForm({
      customer_id: '',
      delivery_person_id: '',
      delivery_zone_id: '',
      delivery_address: '',
      delivery_fee: '',
      status: 'قيد الانتظار'
    })
    setItems([{ product_id: '', quantity: '1' }])
    setShowModal(true)
  }

  const openEdit = async (order) => {
    const orderItemsData = await window.api.getOrderItems(order.id)
    setEditingOrder(order)
    setCustomerMode('existing')
    setCustomerSearch('')
    setSearchResults([])
    setNewCustomer({ name: '', phone: '', phone2: '', address: '' })
    setForm({
      customer_id: order.customer_id ? String(order.customer_id) : '',
      delivery_person_id: order.delivery_person_id ? String(order.delivery_person_id) : '',
      delivery_zone_id: order.delivery_zone_id ? String(order.delivery_zone_id) : '',
      delivery_address: order.delivery_address || '',
      delivery_fee: String(order.delivery_fee || ''),
      status: order.status
    })
    setItems(
      orderItemsData.map((i) => ({
        product_id: String(i.product_id),
        quantity: String(i.quantity)
      }))
    )
    setShowModal(true)
  }

  const handleCustomerSearch = async (query) => {
    setCustomerSearch(query)
    if (query.length >= 2) {
      const results = await window.api.searchCustomers(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  const selectSearchResult = (customer) => {
    setForm({ ...form, customer_id: String(customer.id) })
    setCustomerSearch(`${customer.name} - ${customer.phone || ''}`)
    setSearchResults([])
  }

  const handleZoneChange = (zoneId) => {
    setForm((prev) => {
      const zone = deliveryZones.find((z) => z.id === parseInt(zoneId))
      return {
        ...prev,
        delivery_zone_id: zoneId,
        delivery_fee: zone ? String(zone.delivery_fee) : prev.delivery_fee
      }
    })
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

    // Check stock
    for (const item of validItems) {
      const product = products.find((p) => p.id === parseInt(item.product_id))
      if (product && product.stock_quantity < parseInt(item.quantity)) {
        return alert(`المخزون غير كافي لـ "${product.name}". المتاح: ${product.stock_quantity}`)
      }
    }

    let customerId = form.customer_id ? parseInt(form.customer_id) : null

    // Handle new customer
    if (customerMode === 'new' && newCustomer.name) {
      // Check if customer exists by name+phone
      if (newCustomer.phone) {
        const existing = await window.api.findCustomerByNameAndPhone(
          newCustomer.name,
          newCustomer.phone
        )
        if (existing) {
          customerId = existing.id
        } else {
          const result = await window.api.addCustomer(newCustomer)
          customerId = result.lastInsertRowid
        }
      } else {
        const result = await window.api.addCustomer(newCustomer)
        customerId = result.lastInsertRowid
      }
    }

    const orderData = {
      customer_id: customerId,
      delivery_person_id: form.delivery_person_id ? parseInt(form.delivery_person_id) : null,
      delivery_zone_id: form.delivery_zone_id ? parseInt(form.delivery_zone_id) : null,
      delivery_address: form.delivery_address || null,
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

    try {
      if (editingOrder) {
        await window.api.updateOrder({ ...orderData, id: editingOrder.id }, orderItemsData)
      } else {
        await window.api.addOrder(orderData, orderItemsData)
      }
      setShowModal(false)
      load()
    } catch (err) {
      alert(err.message || 'حدث خطأ')
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    await window.api.updateOrderStatus(id, newStatus)
    load()
  }

  const handleCancel = async (id) => {
    if (confirm('هل تريد إلغاء هذا الطلب؟ سيتم إرجاع المخزون.')) {
      await window.api.cancelOrder(id)
      load()
    }
  }

  const viewItems = async (orderId) => {
    const data = await window.api.getOrderItems(orderId)
    setOrderItems(data)
    setShowItems(orderId)
  }

  const handleDelete = async (id) => {
    if (confirm('هل تريد حذف هذا الطلب نهائياً؟')) {
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
                <th>الدليفري</th>
                <th>المنطقة</th>
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
                  <td>{o.customer_name || 'عميل جديد'}</td>
                  <td>{statusBadge(o.status)}</td>
                  <td>{o.delivery_person_name || '-'}</td>
                  <td>{o.zone_name || '-'}</td>
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
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStatusChange(o.id, 'جاري التوصيل')}
                        >
                          شحن
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => openEdit(o)}
                          style={{ background: '#eee' }}
                        >
                          تعديل
                        </button>
                      </>
                    )}
                    {o.status === 'جاري التوصيل' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStatusChange(o.id, 'مكتمل')}
                        >
                          إكمال
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => openEdit(o)}
                          style={{ background: '#eee' }}
                        >
                          تعديل
                        </button>
                      </>
                    )}
                    {(o.status === 'قيد الانتظار' || o.status === 'جاري التوصيل') && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleCancel(o.id)}>
                        إلغاء
                      </button>
                    )}
                    {o.status === 'ملغي' && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o.id)}>
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* نافذة طلب جديد / تعديل */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3>{editingOrder ? `تعديل الطلب #${editingOrder.id}` : 'طلب جديد'}</h3>
            <form onSubmit={handleSubmit}>
              {/* Customer Section */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${customerMode === 'existing' ? 'btn-primary' : ''}`}
                    onClick={() => setCustomerMode('existing')}
                    style={customerMode !== 'existing' ? { background: '#eee' } : {}}
                  >
                    عميل حالي
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${customerMode === 'new' ? 'btn-primary' : ''}`}
                    onClick={() => {
                      setCustomerMode('new')
                      setForm({ ...form, customer_id: '' })
                    }}
                    style={customerMode !== 'new' ? { background: '#eee' } : {}}
                  >
                    عميل جديد
                  </button>
                </div>

                {customerMode === 'existing' && (
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>بحث عن العميل (بالاسم أو رقم التلفون)</label>
                    <input
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      placeholder="اكتب اسم العميل أو رقم تلفونه..."
                    />
                    {searchResults.length > 0 && (
                      <div className="search-dropdown">
                        {searchResults.map((c) => (
                          <div
                            key={c.id}
                            className="search-item"
                            onClick={() => selectSearchResult(c)}
                          >
                            <strong>{c.name}</strong> — {c.phone || 'بدون رقم'}
                            {c.address && (
                              <span style={{ fontSize: 11, color: '#888' }}> ({c.address})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!customerSearch && (
                      <select
                        value={form.customer_id}
                        onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                        style={{ marginTop: 6 }}
                      >
                        <option value="">اختر عميل</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {customerMode === 'new' && (
                  <div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>اسم العميل</label>
                        <input
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>رقم التلفون</label>
                        <input
                          value={newCustomer.phone}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, phone: e.target.value })
                          }
                          placeholder="01xxxxxxxxx"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>رقم تلفون آخر (اختياري)</label>
                        <input
                          value={newCustomer.phone2}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, phone2: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>العنوان</label>
                        <input
                          value={newCustomer.address}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, address: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Section */}
              <div className="form-row">
                <div className="form-group">
                  <label>الدليفري</label>
                  <select
                    value={form.delivery_person_id}
                    onChange={(e) => setForm({ ...form, delivery_person_id: e.target.value })}
                  >
                    <option value="">اختر الدليفري</option>
                    {deliveryPersons.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name} {dp.phone ? `(${dp.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>المنطقة</label>
                  <select
                    value={form.delivery_zone_id}
                    onChange={(e) => handleZoneChange(e.target.value)}
                  >
                    <option value="">اختر المنطقة</option>
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.area_name} ({z.delivery_fee} ج.م)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>العنوان التفصيلي</label>
                  <input
                    value={form.delivery_address}
                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                    placeholder="العنوان بالتفصيل..."
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

              {/* Items Section */}
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
                        <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                          {p.name} (المخزون: {p.stock_quantity <= 0 ? 'نفذ' : p.stock_quantity})
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
                        max={
                          item.product_id
                            ? products.find((p) => p.id === parseInt(item.product_id))
                                ?.stock_quantity || 999
                            : 999
                        }
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
                  {editingOrder ? 'تحديث الطلب' : 'إنشاء الطلب'}
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
