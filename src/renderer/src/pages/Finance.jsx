import { useState, useEffect, useCallback } from 'react'

function Finance() {
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [salaries, setSalaries] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [salaryForm, setSalaryForm] = useState({
    employee_name: '',
    role: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7)
  })

  const load = useCallback(() => {
    Promise.all([
      window.api.getFinanceSummary(),
      window.api.getExpenses(),
      window.api.getSalaries()
    ]).then(([s, e, sal]) => {
      setSummary(s)
      setExpenses(e)
      setSalaries(sal)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      window.api.getFinanceSummary(),
      window.api.getExpenses(),
      window.api.getSalaries()
    ]).then(([s, e, sal]) => {
      if (cancelled) return
      setSummary(s)
      setExpenses(e)
      setSalaries(sal)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAddExpense = async (e) => {
    e.preventDefault()
    await window.api.addExpense({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount) || 0
    })
    setShowExpenseModal(false)
    setExpenseForm({
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0]
    })
    load()
  }

  const handleAddSalary = async (e) => {
    e.preventDefault()
    await window.api.addSalary({
      ...salaryForm,
      amount: parseFloat(salaryForm.amount) || 0
    })
    setShowSalaryModal(false)
    setSalaryForm({
      employee_name: '',
      role: '',
      amount: '',
      month: new Date().toISOString().slice(0, 7)
    })
    load()
  }

  const deleteExpense = async (id) => {
    if (confirm('هل تريد حذف هذه المصروفات؟')) {
      await window.api.deleteExpense(id)
      load()
    }
  }

  const deleteSalary = async (id) => {
    if (confirm('هل تريد حذف هذا الراتب؟')) {
      await window.api.deleteSalary(id)
      load()
    }
  }

  const fmt = (n) => `${(n || 0).toFixed(2)} ج.م`

  return (
    <div>
      <div className="page-header">
        <h1>المحاسبة والمالية</h1>
      </div>

      {summary && (
        <div className="stat-cards">
          <div className="stat-card positive">
            <div className="stat-label">الإيرادات (الطلبات المكتملة)</div>
            <div className="stat-value">{fmt(summary.totalRevenue)}</div>
          </div>
          <div className="stat-card negative">
            <div className="stat-label">المصروفات</div>
            <div className="stat-value">{fmt(summary.totalExpenses)}</div>
          </div>
          <div className="stat-card negative">
            <div className="stat-label">الرواتب</div>
            <div className="stat-value">{fmt(summary.totalSalaries)}</div>
          </div>
          <div className="stat-card negative">
            <div className="stat-label">تكلفة المنتجات</div>
            <div className="stat-value">{fmt(summary.totalProductCosts)}</div>
          </div>
          <div className={`stat-card ${summary.netProfit >= 0 ? 'positive' : 'negative'}`}>
            <div className="stat-label">صافي الربح</div>
            <div className="stat-value">{fmt(summary.netProfit)}</div>
          </div>
        </div>
      )}

      {summary && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>تفصيل الأرباح</h3>
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div>
              الإيرادات (الطلبات المكتملة): <strong>{fmt(summary.totalRevenue)}</strong>
            </div>
            <div>
              &minus; المصروفات: <strong>{fmt(summary.totalExpenses)}</strong>
            </div>
            <div>
              &minus; الرواتب: <strong>{fmt(summary.totalSalaries)}</strong>
            </div>
            <div>
              &minus; تكلفة المنتجات (COGS): <strong>{fmt(summary.totalProductCosts)}</strong>
            </div>
            <hr style={{ margin: '8px 0' }} />
            <div style={{ fontSize: 18 }}>
              <strong>صافي الربح: </strong>
              <span style={{ color: summary.netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {fmt(summary.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* تنقل التبويبات */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={activeTab !== 'overview' ? { background: '#e0e0e0' } : {}}
        >
          نظرة عامة
        </button>
        <button
          className={`btn ${activeTab === 'expenses' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('expenses')}
          style={activeTab !== 'expenses' ? { background: '#e0e0e0' } : {}}
        >
          المصروفات
        </button>
        <button
          className={`btn ${activeTab === 'salaries' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('salaries')}
          style={activeTab !== 'salaries' ? { background: '#e0e0e0' } : {}}
        >
          الرواتب
        </button>
      </div>

      {activeTab === 'expenses' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>المصروفات</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExpenseModal(true)}>
              + إضافة مصروف
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state">لا توجد مصروفات مسجلة بعد.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.description}</td>
                    <td>{exp.category || '-'}</td>
                    <td>{fmt(exp.amount)}</td>
                    <td>{exp.date}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteExpense(exp.id)}
                      >
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

      {activeTab === 'salaries' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>الرواتب</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSalaryModal(true)}>
              + إضافة راتب
            </button>
          </div>
          {salaries.length === 0 ? (
            <div className="empty-state">لا توجد رواتب مسجلة بعد.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الوظيفة</th>
                  <th>المبلغ</th>
                  <th>الشهر</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((sal) => (
                  <tr key={sal.id}>
                    <td>{sal.employee_name}</td>
                    <td>{sal.role || '-'}</td>
                    <td>{fmt(sal.amount)}</td>
                    <td>{sal.month}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteSalary(sal.id)}
                      >
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

      {activeTab === 'overview' && (
        <div className="card">
          <div className="empty-state">
            اختر تبويب &quot;المصروفات&quot; أو &quot;الرواتب&quot; لإدارة القيود.
            <br />
            الإيرادات تُحسب تلقائياً من الطلبات المكتملة.
          </div>
        </div>
      )}

      {/* نافذة إضافة مصروف */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>إضافة مصروف</h3>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label>الوصف</label>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>المبلغ (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الفئة</label>
                  <input
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    placeholder="مثال: إيجار، مرافق"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>التاريخ</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  إضافة المصروف
                </button>
                <button type="button" className="btn" onClick={() => setShowExpenseModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة راتب */}
      {showSalaryModal && (
        <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>إضافة راتب</h3>
            <form onSubmit={handleAddSalary}>
              <div className="form-row">
                <div className="form-group">
                  <label>اسم الموظف</label>
                  <input
                    value={salaryForm.employee_name}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, employee_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الوظيفة</label>
                  <input
                    value={salaryForm.role}
                    onChange={(e) => setSalaryForm({ ...salaryForm, role: e.target.value })}
                    placeholder="مثال: باريستا، مدير"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>المبلغ (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salaryForm.amount}
                    onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الشهر</label>
                  <input
                    type="month"
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  إضافة الراتب
                </button>
                <button type="button" className="btn" onClick={() => setShowSalaryModal(false)}>
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

export default Finance
