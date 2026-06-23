import { useState, useEffect, useCallback, useRef } from 'react'

const emptyProduct = {
  name: '',
  roast_level: 'Medium',
  type: 'Plain',
  packaging_form: 'Quad Seal',
  price: '',
  cost: '',
  stock_quantity: ''
}

function Inventory() {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const refreshRef = useRef(0)

  const load = useCallback(() => {
    refreshRef.current += 1
    setProducts([]) // trigger re-render
    window.api.getProducts().then(setProducts)
  }, [])

  useEffect(() => {
    let cancelled = false
    window.api.getProducts().then((data) => {
      if (!cancelled) setProducts(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyProduct)
    setShowModal(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name,
      roast_level: product.roast_level,
      type: product.type,
      packaging_form: product.packaging_form,
      price: String(product.price),
      cost: String(product.cost),
      stock_quantity: String(product.stock_quantity)
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0
    }
    if (editing) {
      await window.api.updateProduct({ ...payload, id: editing.id })
    } else {
      await window.api.addProduct(payload)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await window.api.deleteProduct(id)
      load()
    }
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0)

  return (
    <div>
      <div className="page-header">
        <h1>Inventory &amp; Products</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Product
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Stock (bags)</div>
          <div className="stat-value">{totalStock}</div>
        </div>
      </div>

      <div className="card">
        {products.length === 0 ? (
          <div className="empty-state">No products yet. Add your first 200g coffee bag!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roast</th>
                <th>Type</th>
                <th>Packaging</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: '#999' }}>200g Bag</span>
                  </td>
                  <td>{p.roast_level}</td>
                  <td>{p.type}</td>
                  <td>{p.packaging_form}</td>
                  <td>${p.price.toFixed(2)}</td>
                  <td>${p.cost.toFixed(2)}</td>
                  <td>
                    <strong style={{ color: p.stock_quantity < 10 ? '#e74c3c' : '#333' }}>
                      {p.stock_quantity}
                    </strong>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-primary btn-sm" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ethiopian Yirgacheffe"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Roast Level</label>
                  <select
                    value={form.roast_level}
                    onChange={(e) => setForm({ ...form, roast_level: e.target.value })}
                  >
                    <option>Light</option>
                    <option>Medium</option>
                    <option>Dark</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option>Plain</option>
                    <option>Spiced</option>
                    <option>Flavored</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Packaging Form</label>
                <select
                  value={form.packaging_form}
                  onChange={(e) => setForm({ ...form, packaging_form: e.target.value })}
                >
                  <option>Quad Seal</option>
                  <option>Centre Seal</option>
                  <option>Stand Up Pouch</option>
                  <option>Flat Bottom</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
