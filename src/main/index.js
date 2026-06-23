import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  getDatabase,
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  findCustomerByNameAndPhone,
  getCustomerOrders,
  getAllDeliveryZones,
  addDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  getAllDeliveryPersons,
  addDeliveryPerson,
  updateDeliveryPerson,
  deleteDeliveryPerson,
  getAllOrders,
  getOrderById,
  addOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderItems,
  deleteOrder,
  getAllExpenses,
  addExpense,
  deleteExpense,
  getAllSalaries,
  addSalary,
  deleteSalary,
  getFinanceSummary
} from './database'
import {
  initWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
  sendOrderStatusMessage,
  setMainWindow
} from './whatsapp'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setMainWindow(mainWindow)
  return mainWindow
}

function registerIpcHandlers() {
  // Products
  ipcMain.handle('products:getAll', () => getAllProducts())
  ipcMain.handle('products:add', (_e, product) => addProduct(product))
  ipcMain.handle('products:update', (_e, product) => updateProduct(product))
  ipcMain.handle('products:delete', (_e, id) => deleteProduct(id))
  ipcMain.handle('products:pickImage', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'صور', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const buffer = readFileSync(filePath)
    const ext = filePath.split('.').pop().toLowerCase()
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  })

  // Customers
  ipcMain.handle('customers:getAll', () => getAllCustomers())
  ipcMain.handle('customers:add', (_e, customer) => addCustomer(customer))
  ipcMain.handle('customers:update', (_e, customer) => updateCustomer(customer))
  ipcMain.handle('customers:delete', (_e, id) => deleteCustomer(id))
  ipcMain.handle('customers:search', (_e, query) => searchCustomers(query))
  ipcMain.handle('customers:findByNameAndPhone', (_e, { name, phone }) =>
    findCustomerByNameAndPhone(name, phone)
  )
  ipcMain.handle('customers:getOrders', (_e, customerId) => getCustomerOrders(customerId))

  // Delivery Zones
  ipcMain.handle('deliveryZones:getAll', () => getAllDeliveryZones())
  ipcMain.handle('deliveryZones:add', (_e, zone) => addDeliveryZone(zone))
  ipcMain.handle('deliveryZones:update', (_e, zone) => updateDeliveryZone(zone))
  ipcMain.handle('deliveryZones:delete', (_e, id) => deleteDeliveryZone(id))

  // Delivery Persons
  ipcMain.handle('deliveryPersons:getAll', () => getAllDeliveryPersons())
  ipcMain.handle('deliveryPersons:add', (_e, person) => addDeliveryPerson(person))
  ipcMain.handle('deliveryPersons:update', (_e, person) => updateDeliveryPerson(person))
  ipcMain.handle('deliveryPersons:delete', (_e, id) => deleteDeliveryPerson(id))

  // Orders
  ipcMain.handle('orders:getAll', () => getAllOrders())
  ipcMain.handle('orders:add', (_e, { order, items }) => addOrder(order, items))
  ipcMain.handle('orders:update', (_e, { order, items }) => updateOrder(order, items))
  ipcMain.handle('orders:updateStatus', async (_e, { id, status }) => {
    const result = updateOrderStatus(id, status)
    // Auto-send WhatsApp message on status change
    if (status === 'جاري التوصيل' || status === 'مكتمل') {
      try {
        const order = getOrderById(id)
        if (order && order.customer_phone) {
          const items = getOrderItems(id)
          await sendOrderStatusMessage(order, items, order.customer_phone, status)
        }
      } catch (err) {
        console.error('[WhatsApp] Auto-send failed:', err.message)
      }
    }
    return result
  })
  ipcMain.handle('orders:cancel', (_e, id) => cancelOrder(id))
  ipcMain.handle('orders:getItems', (_e, orderId) => getOrderItems(orderId))
  ipcMain.handle('orders:delete', (_e, id) => deleteOrder(id))

  // Expenses
  ipcMain.handle('expenses:getAll', () => getAllExpenses())
  ipcMain.handle('expenses:add', (_e, expense) => addExpense(expense))
  ipcMain.handle('expenses:delete', (_e, id) => deleteExpense(id))

  // Salaries
  ipcMain.handle('salaries:getAll', () => getAllSalaries())
  ipcMain.handle('salaries:add', (_e, salary) => addSalary(salary))
  ipcMain.handle('salaries:delete', (_e, id) => deleteSalary(id))

  // Finance
  ipcMain.handle('finance:getSummary', () => getFinanceSummary())

  // WhatsApp
  ipcMain.handle('whatsapp:init', () => {
    initWhatsApp()
    return { success: true }
  })
  ipcMain.handle('whatsapp:disconnect', () => {
    disconnectWhatsApp()
    return { success: true }
  })
  ipcMain.handle('whatsapp:getStatus', () => getWhatsAppStatus())
  ipcMain.handle('whatsapp:sendMessage', async (_e, { orderId, status }) => {
    const order = getOrderById(orderId)
    if (!order) return { success: false, error: 'الطلب غير موجود' }
    if (!order.customer_phone) return { success: false, error: 'العميل ليس لديه رقم تلفون' }
    const items = getOrderItems(orderId)
    return sendOrderStatusMessage(order, items, order.customer_phone, status)
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ben-alaraishy')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  getDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
