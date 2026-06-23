import { useState, useEffect, useCallback } from 'react'

const emptyProduct = {
  name: '',
  roast_level: 'متوسط',
  type: 'سادة',
  image: null,
  price: '',
  cost: '',
  stock_quantity: ''
}

function Inventory() {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)

  const load = useCallback(() => {
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
      image: product.image || null,
      price: String(product.price),
      cost: String(product.cost),
      stock_quantity: String(product.stock_quantity)
    })
    setShowModal(true)
  }

  const handlePickImage = async () => {
    const dataUrl = await window.api.pickProductImage()
    if (dataUrl) {
      setForm({ ...form, image: dataUrl })
    }
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
    if (confirm('هل تريد حذف هذا المنتج؟')) {
      await window.api.deleteProduct(id)
      load()
    }
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0)

  return (
    <div>
      <div className="page-header">
        <h1>المخزون والمنتجات</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + إضافة منتج
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">إجمالي المنتجات</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">إجمالي المخزون (أكياس)</div>
          <div className="stat-value">{totalStock}</div>
        </div>
      </div>

      <div className="card">
        {products.length === 0 ? (
          <div className="empty-state">لا توجد منتجات بعد. أضف أول كيس قهوة 200 جرام!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>صورة</th>
                <th>الاسم</th>
                <th>درجة التحميص</th>
                <th>النوع</th>
                <th>السعر</th>
                <th>التكلفة</th>
                <th>المخزون</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 24 }}>☕</span>
                    )}
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: '#999' }}>كيس 200 جرام</span>
                  </td>
                  <td>{p.roast_level}</td>
                  <td>{p.type}</td>
                  <td>{p.price.toFixed(2)} ج.م</td>
                  <td>{p.cost.toFixed(2)} ج.م</td>
                  <td>
                    <strong
                      style={{
                        color:
                          p.stock_quantity <= 0
                            ? '#e74c3c'
                            : p.stock_quantity < 10
                              ? '#e67e22'
                              : '#333'
                      }}
                    >
                      {p.stock_quantity <= 0 ? 'نفذ' : p.stock_quantity}
                    </strong>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-primary btn-sm" onClick={() => openEdit(p)}>
                      تعديل
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                      حذف
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
            <h3>{editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>اسم المنتج</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: بن تركي"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>درجة التحميص</label>
                  <select
                    value={form.roast_level}
                    onChange={(e) => setForm({ ...form, roast_level: e.target.value })}
                  >
                    <option value="فاتح">فاتح</option>
                    <option value="متوسط">متوسط</option>
                    <option value="غامق">غامق</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>النوع</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="سادة">سادة</option>
                    <option value="بتوابل">بتوابل</option>
                    <option value="بنكهة">بنكهة</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>صورة المنتج</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {form.image && (
                    <img
                      src={form.image}
                      alt="صورة"
                      style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }}
                    />
                  )}
                  <button type="button" className="btn btn-sm" onClick={handlePickImage}>
                    {form.image ? 'تغيير الصورة' : 'اختيار صورة'}
                  </button>
                  {form.image && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setForm({ ...form, image: null })}
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>سعر البيع (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>التكلفة (ج.م)</label>
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
                <label>الكمية في المخزون</label>
                <input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editing ? 'تحديث' : 'إضافة المنتج'}
                </button>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  إلغاء
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
