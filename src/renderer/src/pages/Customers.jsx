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
    if (confirm('Delete this customer?')) {
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
      Pending: 'badge-pending',
      'Out for Delivery': 'badge-delivery',
      Completed: 'badge-completed'
    }
    return <span className={`badge ${cls[status] || ''}`}>{status}</span>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customer Management</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Customer
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{customers.length}</div>
        </div>
      </div>

      <div className="card">
        {customers.length === 0 ? (
          <div className="empty-state">No customers yet. Add your first customer!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Registered</th>
                <th>Actions</th>
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
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-primary" onClick={() => viewOrders(c)}>
                      Orders
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Customer' : 'Add New Customer'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +20 123 456 7890"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Delivery address"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Orders Modal */}
      {showOrders && (
        <div className="modal-overlay" onClick={() => setShowOrders(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Orders for {showOrders.name}</h3>
            {customerOrders.length === 0 ? (
              <div className="empty-state">No orders for this customer yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{statusBadge(o.status)}</td>
                      <td>${o.total_amount.toFixed(2)}</td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowOrders(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
