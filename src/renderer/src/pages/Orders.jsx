import { useState, useEffect, useCallback } from 'react'

const statusBadge = (status) => {
  const cls = {
    Pending: 'badge-pending',
    'Out for Delivery': 'badge-delivery',
    Completed: 'badge-completed'
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
    status: 'Pending'
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
    setForm({ customer_id: '', delivery_driver: '', delivery_fee: '', status: 'Pending' })
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
    if (validItems.length === 0) return alert('Add at least one product')

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
    const items = await window.api.getOrderItems(orderId)
    setOrderItems(items)
    setShowItems(orderId)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this order?')) {
      await window.api.deleteOrder(id)
      load()
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'Pending').length
  const deliveryCount = orders.filter((o) => o.status === 'Out for Delivery').length

  return (
    <div>
      <div className="page-header">
        <h1>Orders &amp; Delivery</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + New Order
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Out for Delivery</div>
          <div className="stat-value">{deliveryCount}</div>
        </div>
      </div>

      <div className="card">
        {orders.length === 0 ? (
          <div className="empty-state">No orders yet. Create your first order!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Delivery Fee</th>
                <th>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customer_name || 'Walk-in'}</td>
                  <td>{statusBadge(o.status)}</td>
                  <td>{o.delivery_driver || '-'}</td>
                  <td>${o.delivery_fee.toFixed(2)}</td>
                  <td>
                    <strong>${o.total_amount.toFixed(2)}</strong>
                  </td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-primary" onClick={() => viewItems(o.id)}>
                      Items
                    </button>
                    {o.status === 'Pending' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStatusChange(o.id, 'Out for Delivery')}
                      >
                        Ship
                      </button>
                    )}
                    {o.status === 'Out for Delivery' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStatusChange(o.id, 'Completed')}
                      >
                        Complete
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o.id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Order Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Order</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Customer</label>
                  <select
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Pending</option>
                    <option>Out for Delivery</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Delivery Driver</label>
                  <input
                    value={form.delivery_driver}
                    onChange={(e) => setForm({ ...form, delivery_driver: e.target.value })}
                    placeholder="Driver name"
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.delivery_fee}
                    onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                  />
                </div>
              </div>

              <h4 style={{ margin: '16px 0 8px' }}>Order Items</h4>
              {items.map((item, idx) => (
                <div key={idx} className="form-row" style={{ alignItems: 'end', marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0, width: 80 }}>
                      <label>Qty</label>
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
                + Add Item
              </button>

              <div style={{ marginTop: 16, textAlign: 'right', fontSize: 18, fontWeight: 700 }}>
                Total: ${calcTotal().toFixed(2)}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Items Modal */}
      {showItems && (
        <div className="modal-overlay" onClick={() => setShowItems(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Order #{showItems} Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>${item.unit_price.toFixed(2)}</td>
                    <td>${(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowItems(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
