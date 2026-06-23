import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
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
  getCustomerOrders,
  getAllOrders,
  addOrder,
  updateOrderStatus,
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
}

function registerIpcHandlers() {
  // Products
  ipcMain.handle('products:getAll', () => getAllProducts())
  ipcMain.handle('products:add', (_e, product) => addProduct(product))
  ipcMain.handle('products:update', (_e, product) => updateProduct(product))
  ipcMain.handle('products:delete', (_e, id) => deleteProduct(id))

  // Customers
  ipcMain.handle('customers:getAll', () => getAllCustomers())
  ipcMain.handle('customers:add', (_e, customer) => addCustomer(customer))
  ipcMain.handle('customers:update', (_e, customer) => updateCustomer(customer))
  ipcMain.handle('customers:delete', (_e, id) => deleteCustomer(id))
  ipcMain.handle('customers:getOrders', (_e, customerId) => getCustomerOrders(customerId))

  // Orders
  ipcMain.handle('orders:getAll', () => getAllOrders())
  ipcMain.handle('orders:add', (_e, { order, items }) => addOrder(order, items))
  ipcMain.handle('orders:updateStatus', (_e, { id, status }) => updateOrderStatus(id, status))
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
