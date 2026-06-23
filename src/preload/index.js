import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  addProduct: (product) => ipcRenderer.invoke('products:add', product),
  updateProduct: (product) => ipcRenderer.invoke('products:update', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  pickProductImage: () => ipcRenderer.invoke('products:pickImage'),

  // Customers
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  addCustomer: (customer) => ipcRenderer.invoke('customers:add', customer),
  updateCustomer: (customer) => ipcRenderer.invoke('customers:update', customer),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
  searchCustomers: (query) => ipcRenderer.invoke('customers:search', query),
  findCustomerByNameAndPhone: (name, phone) =>
    ipcRenderer.invoke('customers:findByNameAndPhone', { name, phone }),
  getCustomerOrders: (customerId) => ipcRenderer.invoke('customers:getOrders', customerId),

  // Delivery Zones
  getDeliveryZones: () => ipcRenderer.invoke('deliveryZones:getAll'),
  addDeliveryZone: (zone) => ipcRenderer.invoke('deliveryZones:add', zone),
  updateDeliveryZone: (zone) => ipcRenderer.invoke('deliveryZones:update', zone),
  deleteDeliveryZone: (id) => ipcRenderer.invoke('deliveryZones:delete', id),

  // Delivery Persons
  getDeliveryPersons: () => ipcRenderer.invoke('deliveryPersons:getAll'),
  addDeliveryPerson: (person) => ipcRenderer.invoke('deliveryPersons:add', person),
  updateDeliveryPerson: (person) => ipcRenderer.invoke('deliveryPersons:update', person),
  deleteDeliveryPerson: (id) => ipcRenderer.invoke('deliveryPersons:delete', id),

  // Orders
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  addOrder: (order, items) => ipcRenderer.invoke('orders:add', { order, items }),
  updateOrder: (order, items) => ipcRenderer.invoke('orders:update', { order, items }),
  updateOrderStatus: (id, status) => ipcRenderer.invoke('orders:updateStatus', { id, status }),
  cancelOrder: (id) => ipcRenderer.invoke('orders:cancel', id),
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
  getFinanceSummary: () => ipcRenderer.invoke('finance:getSummary'),

  // WhatsApp
  whatsappInit: () => ipcRenderer.invoke('whatsapp:init'),
  whatsappDisconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
  whatsappGetStatus: () => ipcRenderer.invoke('whatsapp:getStatus'),
  whatsappSendMessage: (orderId, status) =>
    ipcRenderer.invoke('whatsapp:sendMessage', { orderId, status }),
  onWhatsAppStatus: (callback) => {
    ipcRenderer.on('whatsapp:status', (_e, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('whatsapp:status')
  }
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
