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
    if (confirm('Delete this expense?')) {
      await window.api.deleteExpense(id)
      load()
    }
  }

  const deleteSalary = async (id) => {
    if (confirm('Delete this salary entry?')) {
      await window.api.deleteSalary(id)
      load()
    }
  }

  const fmt = (n) => `$${(n || 0).toFixed(2)}`

  return (
    <div>
      <div className="page-header">
        <h1>Accounting &amp; Finance</h1>
      </div>

      {summary && (
        <div className="stat-cards">
          <div className="stat-card positive">
            <div className="stat-label">Revenue (Completed Orders)</div>
            <div className="stat-value">{fmt(summary.totalRevenue)}</div>
          </div>
          <div className="stat-card negative">
            <div className="stat-label">Expenses</div>
            <div className="stat-value">{fmt(summary.totalExpenses)}</div>
          </div>
          <div className="stat-card negative">
            <div className="stat-label">Salaries</div>
            <div className="stat-value">{fmt(summary.totalSalaries)}</div>
          </div>
          <div className="stat-card negative">
            <div className="stat-label">Product Costs</div>
            <div className="stat-value">{fmt(summary.totalProductCosts)}</div>
          </div>
          <div className={`stat-card ${summary.netProfit >= 0 ? 'positive' : 'negative'}`}>
            <div className="stat-label">Net Profit</div>
            <div className="stat-value">{fmt(summary.netProfit)}</div>
          </div>
        </div>
      )}

      {summary && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Profit Breakdown</h3>
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div>
              Revenue (Completed Orders): <strong>{fmt(summary.totalRevenue)}</strong>
            </div>
            <div>
              &minus; Expenses: <strong>{fmt(summary.totalExpenses)}</strong>
            </div>
            <div>
              &minus; Salaries: <strong>{fmt(summary.totalSalaries)}</strong>
            </div>
            <div>
              &minus; Product Costs (COGS): <strong>{fmt(summary.totalProductCosts)}</strong>
            </div>
            <hr style={{ margin: '8px 0' }} />
            <div style={{ fontSize: 18 }}>
              <strong>Net Profit: </strong>
              <span style={{ color: summary.netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {fmt(summary.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={activeTab !== 'overview' ? { background: '#e0e0e0' } : {}}
        >
          Overview
        </button>
        <button
          className={`btn ${activeTab === 'expenses' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('expenses')}
          style={activeTab !== 'expenses' ? { background: '#e0e0e0' } : {}}
        >
          Expenses
        </button>
        <button
          className={`btn ${activeTab === 'salaries' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('salaries')}
          style={activeTab !== 'salaries' ? { background: '#e0e0e0' } : {}}
        >
          Salaries
        </button>
      </div>

      {activeTab === 'expenses' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>Expenses</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExpenseModal(true)}>
              + Add Expense
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state">No expenses recorded yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
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
                        Del
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
            <h3>Salaries</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSalaryModal(true)}>
              + Add Salary
            </button>
          </div>
          {salaries.length === 0 ? (
            <div className="empty-state">No salary entries yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Amount</th>
                  <th>Month</th>
                  <th>Actions</th>
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
                        Del
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
            Select &quot;Expenses&quot; or &quot;Salaries&quot; tabs to manage entries.
            <br />
            Revenue is automatically calculated from completed orders.
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Expense</h3>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    placeholder="e.g. Rent, Utilities"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {showSalaryModal && (
        <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Salary</h3>
            <form onSubmit={handleAddSalary}>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input
                    value={salaryForm.employee_name}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, employee_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input
                    value={salaryForm.role}
                    onChange={(e) => setSalaryForm({ ...salaryForm, role: e.target.value })}
                    placeholder="e.g. Barista, Manager"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salaryForm.amount}
                    onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Month</label>
                  <input
                    type="month"
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowSalaryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Salary
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
