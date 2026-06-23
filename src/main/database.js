import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db = null

export function getDatabase() {
  if (db) return db

  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = join(userDataPath, 'coffee-pos.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  return db
}

function createTables() {
  db.exec(`
    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Products (200g Coffee Bags)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roast_level TEXT NOT NULL CHECK(roast_level IN ('فاتح', 'متوسط', 'غامق')),
      type TEXT NOT NULL CHECK(type IN ('سادة', 'بتوابل', 'بنكهة')),
      packaging_form TEXT NOT NULL CHECK(packaging_form IN ('كواد سيل', 'سنتر سيل', 'ستاند أب باوتش', 'فلات بوتوم')),
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      status TEXT NOT NULL DEFAULT 'قيد الانتظار' CHECK(status IN ('قيد الانتظار', 'جاري التوصيل', 'مكتمل')),
      delivery_driver TEXT,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      category TEXT,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Salaries
    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      role TEXT,
      amount REAL NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      paid_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

// ── Product CRUD ──
export function getAllProducts() {
  return getDatabase().prepare('SELECT * FROM products ORDER BY id DESC').all()
}

export function addProduct(product) {
  const stmt = getDatabase().prepare(
    `INSERT INTO products (name, roast_level, type, packaging_form, price, cost, stock_quantity)
     VALUES (@name, @roast_level, @type, @packaging_form, @price, @cost, @stock_quantity)`
  )
  return stmt.run(product)
}

export function updateProduct(product) {
  const stmt = getDatabase().prepare(
    `UPDATE products SET name=@name, roast_level=@roast_level, type=@type,
     packaging_form=@packaging_form, price=@price, cost=@cost, stock_quantity=@stock_quantity
     WHERE id=@id`
  )
  return stmt.run(product)
}

export function deleteProduct(id) {
  return getDatabase().prepare('DELETE FROM products WHERE id=?').run(id)
}

// ── Customer CRUD ──
export function getAllCustomers() {
  return getDatabase().prepare('SELECT * FROM customers ORDER BY id DESC').all()
}

export function addCustomer(customer) {
  const stmt = getDatabase().prepare(
    `INSERT INTO customers (name, phone, address) VALUES (@name, @phone, @address)`
  )
  return stmt.run(customer)
}

export function updateCustomer(customer) {
  const stmt = getDatabase().prepare(
    `UPDATE customers SET name=@name, phone=@phone, address=@address WHERE id=@id`
  )
  return stmt.run(customer)
}

export function deleteCustomer(id) {
  return getDatabase().prepare('DELETE FROM customers WHERE id=?').run(id)
}

export function getCustomerOrders(customerId) {
  return getDatabase()
    .prepare(
      `SELECT o.*, c.name as customer_name
     FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.customer_id = ? ORDER BY o.id DESC`
    )
    .all(customerId)
}

// ── Order CRUD ──
export function getAllOrders() {
  return getDatabase()
    .prepare(
      `SELECT o.*, c.name as customer_name
     FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
     ORDER BY o.id DESC`
    )
    .all()
}

export function addOrder(order, items) {
  const db = getDatabase()
  const insertOrder = db.prepare(
    `INSERT INTO orders (customer_id, status, delivery_driver, delivery_fee, total_amount)
     VALUES (@customer_id, @status, @delivery_driver, @delivery_fee, @total_amount)`
  )
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
     VALUES (@order_id, @product_id, @quantity, @unit_price)`
  )
  const updateStock = db.prepare(
    `UPDATE products SET stock_quantity = stock_quantity - @quantity WHERE id = @product_id`
  )

  const transaction = db.transaction((order, items) => {
    const result = insertOrder.run(order)
    const orderId = result.lastInsertRowid
    for (const item of items) {
      insertItem.run({ ...item, order_id: orderId })
      updateStock.run({ quantity: item.quantity, product_id: item.product_id })
    }
    return orderId
  })

  return transaction(order, items)
}

export function updateOrderStatus(id, status) {
  return getDatabase()
    .prepare(`UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?`)
    .run(status, id)
}

export function getOrderItems(orderId) {
  return getDatabase()
    .prepare(
      `SELECT oi.*, p.name as product_name
     FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`
    )
    .all(orderId)
}

export function deleteOrder(id) {
  return getDatabase().prepare('DELETE FROM orders WHERE id=?').run(id)
}

// ── Expenses CRUD ──
export function getAllExpenses() {
  return getDatabase().prepare('SELECT * FROM expenses ORDER BY id DESC').all()
}

export function addExpense(expense) {
  const stmt = getDatabase().prepare(
    `INSERT INTO expenses (description, amount, category, date) VALUES (@description, @amount, @category, @date)`
  )
  return stmt.run(expense)
}

export function deleteExpense(id) {
  return getDatabase().prepare('DELETE FROM expenses WHERE id=?').run(id)
}

// ── Salaries CRUD ──
export function getAllSalaries() {
  return getDatabase().prepare('SELECT * FROM salaries ORDER BY id DESC').all()
}

export function addSalary(salary) {
  const stmt = getDatabase().prepare(
    `INSERT INTO salaries (employee_name, role, amount, month) VALUES (@employee_name, @role, @amount, @month)`
  )
  return stmt.run(salary)
}

export function deleteSalary(id) {
  return getDatabase().prepare('DELETE FROM salaries WHERE id=?').run(id)
}

// ── Finance Dashboard ──
export function getFinanceSummary() {
  const db = getDatabase()

  const revenue = db
    .prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'مكتمل'`)
    .get()

  const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`).get()

  const salaries = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM salaries`).get()

  const productCosts = db
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity * p.cost), 0) as total
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE o.status = 'مكتمل'`
    )
    .get()

  const totalRevenue = revenue.total
  const totalExpenses = expenses.total
  const totalSalaries = salaries.total
  const totalProductCosts = productCosts.total
  const netProfit = totalRevenue - (totalExpenses + totalSalaries + totalProductCosts)

  return {
    totalRevenue,
    totalExpenses,
    totalSalaries,
    totalProductCosts,
    netProfit
  }
}
