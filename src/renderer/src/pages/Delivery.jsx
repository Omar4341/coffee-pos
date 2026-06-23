import { useState, useEffect, useCallback } from 'react'

function Delivery() {
  const [zones, setZones] = useState([])
  const [persons, setPersons] = useState([])
  const [activeTab, setActiveTab] = useState('zones')
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [editingZone, setEditingZone] = useState(null)
  const [editingPerson, setEditingPerson] = useState(null)
  const [zoneForm, setZoneForm] = useState({ area_name: '', delivery_fee: '' })
  const [personForm, setPersonForm] = useState({ name: '', phone: '' })

  const load = useCallback(() => {
    Promise.all([window.api.getDeliveryZones(), window.api.getDeliveryPersons()]).then(([z, p]) => {
      setZones(z)
      setPersons(p)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.getDeliveryZones(), window.api.getDeliveryPersons()]).then(([z, p]) => {
      if (cancelled) return
      setZones(z)
      setPersons(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Zones
  const openAddZone = () => {
    setEditingZone(null)
    setZoneForm({ area_name: '', delivery_fee: '' })
    setShowZoneModal(true)
  }

  const openEditZone = (zone) => {
    setEditingZone(zone)
    setZoneForm({ area_name: zone.area_name, delivery_fee: String(zone.delivery_fee) })
    setShowZoneModal(true)
  }

  const handleZoneSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...zoneForm, delivery_fee: parseFloat(zoneForm.delivery_fee) || 0 }
    if (editingZone) {
      await window.api.updateDeliveryZone({ ...payload, id: editingZone.id })
    } else {
      await window.api.addDeliveryZone(payload)
    }
    setShowZoneModal(false)
    load()
  }

  const deleteZone = async (id) => {
    if (confirm('هل تريد حذف هذه المنطقة؟')) {
      await window.api.deleteDeliveryZone(id)
      load()
    }
  }

  // Persons
  const openAddPerson = () => {
    setEditingPerson(null)
    setPersonForm({ name: '', phone: '' })
    setShowPersonModal(true)
  }

  const openEditPerson = (person) => {
    setEditingPerson(person)
    setPersonForm({ name: person.name, phone: person.phone || '' })
    setShowPersonModal(true)
  }

  const handlePersonSubmit = async (e) => {
    e.preventDefault()
    if (editingPerson) {
      await window.api.updateDeliveryPerson({ ...personForm, id: editingPerson.id })
    } else {
      await window.api.addDeliveryPerson(personForm)
    }
    setShowPersonModal(false)
    load()
  }

  const deletePerson = async (id) => {
    if (confirm('هل تريد حذف هذا الدليفري؟')) {
      await window.api.deleteDeliveryPerson(id)
      load()
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>إدارة التوصيل</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'zones' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('zones')}
          style={activeTab !== 'zones' ? { background: '#e0e0e0' } : {}}
        >
          مناطق التوصيل
        </button>
        <button
          className={`btn ${activeTab === 'persons' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('persons')}
          style={activeTab !== 'persons' ? { background: '#e0e0e0' } : {}}
        >
          الدليفري
        </button>
      </div>

      {activeTab === 'zones' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>مناطق التوصيل والأسعار</h3>
            <button className="btn btn-primary btn-sm" onClick={openAddZone}>
              + إضافة منطقة
            </button>
          </div>
          {zones.length === 0 ? (
            <div className="empty-state">لا توجد مناطق توصيل بعد. أضف أول منطقة!</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>المنطقة</th>
                  <th>رسوم التوصيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <strong>{z.area_name}</strong>
                    </td>
                    <td>{z.delivery_fee.toFixed(2)} ج.م</td>
                    <td className="actions-cell">
                      <button className="btn btn-primary btn-sm" onClick={() => openEditZone(z)}>
                        تعديل
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteZone(z.id)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'persons' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>موظفي الدليفري</h3>
            <button className="btn btn-primary btn-sm" onClick={openAddPerson}>
              + إضافة دليفري
            </button>
          </div>
          {persons.length === 0 ? (
            <div className="empty-state">لا يوجد موظفي دليفري بعد. أضف أول موظف!</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم التلفون</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.phone || '-'}</td>
                    <td className="actions-cell">
                      <button className="btn btn-primary btn-sm" onClick={() => openEditPerson(p)}>
                        تعديل
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePerson(p.id)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="modal-overlay" onClick={() => setShowZoneModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingZone ? 'تعديل المنطقة' : 'إضافة منطقة جديدة'}</h3>
            <form onSubmit={handleZoneSubmit}>
              <div className="form-group">
                <label>اسم المنطقة</label>
                <input
                  value={zoneForm.area_name}
                  onChange={(e) => setZoneForm({ ...zoneForm, area_name: e.target.value })}
                  placeholder="مثال: المعادي، مدينة نصر"
                  required
                />
              </div>
              <div className="form-group">
                <label>رسوم التوصيل (ج.م)</label>
                <input
                  type="number"
                  step="0.01"
                  value={zoneForm.delivery_fee}
                  onChange={(e) => setZoneForm({ ...zoneForm, delivery_fee: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingZone ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" className="btn" onClick={() => setShowZoneModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Person Modal */}
      {showPersonModal && (
        <div className="modal-overlay" onClick={() => setShowPersonModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPerson ? 'تعديل الدليفري' : 'إضافة دليفري جديد'}</h3>
            <form onSubmit={handlePersonSubmit}>
              <div className="form-group">
                <label>الاسم</label>
                <input
                  value={personForm.name}
                  onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>رقم التلفون</label>
                <input
                  value={personForm.phone}
                  onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingPerson ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" className="btn" onClick={() => setShowPersonModal(false)}>
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

export default Delivery
