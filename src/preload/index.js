import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  addProduct: (product) => ipcRenderer.invoke('products:add', product),
  updateProduct: (product) => ipcRenderer.invoke('products:update', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // Customers
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  addCustomer: (customer) => ipcRenderer.invoke('customers:add', customer),
  updateCustomer: (customer) => ipcRenderer.invoke('customers:update', customer),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
  getCustomerOrders: (customerId) => ipcRenderer.invoke('customers:getOrders', customerId),

  // Orders
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  addOrder: (order, items) => ipcRenderer.invoke('orders:add', { order, items }),
  updateOrderStatus: (id, status) => ipcRenderer.invoke('orders:updateStatus', { id, status }),
  getOrderItems: (orderId) => ipcRenderer.invoke('orders:getItems', orderId),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expense) => ipcRenderer.invoke('expenses:add', expense),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  // Salaries
  getSalaries: () => ipcRenderer.invoke('salaries:getAll'),
  addSalary: (salary) => ipcRenderer.invoke('salaries:add', salary),
  deleteSalary: (id) => ipcRenderer.invoke('salaries:delete', id),

  // Finance
  getFinanceSummary: () => ipcRenderer.invoke('finance:getSummary')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
