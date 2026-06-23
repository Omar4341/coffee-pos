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
  runMigrations()
  return db
}

function createTables() {
  db.exec(`
    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      phone2 TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Products (200g Coffee Bags)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roast_level TEXT NOT NULL CHECK(roast_level IN ('فاتح', 'متوسط', 'غامق')),
      type TEXT NOT NULL CHECK(type IN ('سادة', 'بتوابل', 'بنكهة')),
      packaging_form TEXT DEFAULT NULL,
      image TEXT,
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Delivery Zones
    CREATE TABLE IF NOT EXISTS delivery_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_name TEXT NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Delivery Persons
    CREATE TABLE IF NOT EXISTS delivery_persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      status TEXT NOT NULL DEFAULT 'قيد الانتظار' CHECK(status IN ('قيد الانتظار', 'جاري التوصيل', 'مكتمل', 'ملغي')),
      delivery_person_id INTEGER,
      delivery_zone_id INTEGER,
      delivery_address TEXT,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(id),
      FOREIGN KEY (delivery_zone_id) REFERENCES delivery_zones(id)
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

function runMigrations() {
  const cols = (table) => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all()
    return info.map((c) => c.name)
  }

  // Add phone2 to customers
  if (!cols('customers').includes('phone2')) {
    db.exec(`ALTER TABLE customers ADD COLUMN phone2 TEXT`)
  }

  // Add image to products
  if (!cols('products').includes('image')) {
    db.exec(`ALTER TABLE products ADD COLUMN image TEXT`)
  }

  // Add delivery_person_id to orders
  if (!cols('orders').includes('delivery_person_id')) {
    db.exec(`ALTER TABLE orders ADD COLUMN delivery_person_id INTEGER`)
  }

  // Add delivery_zone_id to orders
  if (!cols('orders').includes('delivery_zone_id')) {
    db.exec(`ALTER TABLE orders ADD COLUMN delivery_zone_id INTEGER`)
  }

  // Add delivery_address to orders
  if (!cols('orders').includes('delivery_address')) {
    db.exec(`ALTER TABLE orders ADD COLUMN delivery_address TEXT`)
  }
}

// ── Product CRUD ──
export function getAllProducts() {
  return getDatabase().prepare('SELECT * FROM products ORDER BY id DESC').all()
}

export function addProduct(product) {
  const stmt = getDatabase().prepare(
    `INSERT INTO products (name, roast_level, type, image, price, cost, stock_quantity)
     VALUES (@name, @roast_level, @type, @image, @price, @cost, @stock_quantity)`
  )
  return stmt.run(product)
}

export function updateProduct(product) {
  const stmt = getDatabase().prepare(
    `UPDATE products SET name=@name, roast_level=@roast_level, type=@type,
     image=@image, price=@price, cost=@cost, stock_quantity=@stock_quantity
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
    `INSERT INTO customers (name, phone, phone2, address) VALUES (@name, @phone, @phone2, @address)`
  )
  return stmt.run({
    name: customer.name,
    phone: customer.phone || null,
    phone2: customer.phone2 || null,
    address: customer.address || null
  })
}

export function updateCustomer(customer) {
  const stmt = getDatabase().prepare(
    `UPDATE customers SET name=@name, phone=@phone, phone2=@phone2, address=@address WHERE id=@id`
  )
  return stmt.run(customer)
}

export function deleteCustomer(id) {
  return getDatabase().prepare('DELETE FROM customers WHERE id=?').run(id)
}

export function searchCustomers(query) {
  return getDatabase()
    .prepare(
      `SELECT * FROM customers WHERE name LIKE @q OR phone LIKE @q OR phone2 LIKE @q ORDER BY name`
    )
    .all({ q: `%${query}%` })
}

export function findCustomerByNameAndPhone(name, phone) {
  return getDatabase()
    .prepare(`SELECT * FROM customers WHERE name = @name AND phone = @phone`)
    .get({ name, phone })
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

// ── Delivery Zones CRUD ──
export function getAllDeliveryZones() {
  return getDatabase().prepare('SELECT * FROM delivery_zones ORDER BY area_name').all()
}

export function addDeliveryZone(zone) {
  const stmt = getDatabase().prepare(
    `INSERT INTO delivery_zones (area_name, delivery_fee) VALUES (@area_name, @delivery_fee)`
  )
  return stmt.run(zone)
}

export function updateDeliveryZone(zone) {
  const stmt = getDatabase().prepare(
    `UPDATE delivery_zones SET area_name=@area_name, delivery_fee=@delivery_fee WHERE id=@id`
  )
  return stmt.run(zone)
}

export function deleteDeliveryZone(id) {
  return getDatabase().prepare('DELETE FROM delivery_zones WHERE id=?').run(id)
}

// ── Delivery Persons CRUD ──
export function getAllDeliveryPersons() {
  return getDatabase().prepare('SELECT * FROM delivery_persons ORDER BY name').all()
}

export function addDeliveryPerson(person) {
  const stmt = getDatabase().prepare(
    `INSERT INTO delivery_persons (name, phone) VALUES (@name, @phone)`
  )
  return stmt.run(person)
}

export function updateDeliveryPerson(person) {
  const stmt = getDatabase().prepare(
    `UPDATE delivery_persons SET name=@name, phone=@phone WHERE id=@id`
  )
  return stmt.run(person)
}

export function deleteDeliveryPerson(id) {
  return getDatabase().prepare('DELETE FROM delivery_persons WHERE id=?').run(id)
}

// ── Order CRUD ──
export function getAllOrders() {
  return getDatabase()
    .prepare(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone,
       dp.name as delivery_person_name, dz.area_name as zone_name
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
     LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
     ORDER BY o.id DESC`
    )
    .all()
}

export function addOrder(order, items) {
  const database = getDatabase()
  const insertOrder = database.prepare(
    `INSERT INTO orders (customer_id, status, delivery_person_id, delivery_zone_id, delivery_address, delivery_fee, total_amount)
     VALUES (@customer_id, @status, @delivery_person_id, @delivery_zone_id, @delivery_address, @delivery_fee, @total_amount)`
  )
  const insertItem = database.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
     VALUES (@order_id, @product_id, @quantity, @unit_price)`
  )
  const updateStock = database.prepare(
    `UPDATE products SET stock_quantity = stock_quantity - @quantity WHERE id = @product_id`
  )
  const checkStock = database.prepare(`SELECT stock_quantity, name FROM products WHERE id = ?`)

  const transaction = database.transaction((orderData, itemsData) => {
    // Check stock availability
    for (const item of itemsData) {
      const product = checkStock.get(item.product_id)
      if (!product) throw new Error(`المنتج غير موجود`)
      if (product.stock_quantity < item.quantity) {
        throw new Error(`المخزون غير كافي لـ "${product.name}". المتاح: ${product.stock_quantity}`)
      }
    }

    const result = insertOrder.run(orderData)
    const orderId = result.lastInsertRowid
    for (const item of itemsData) {
      insertItem.run({ ...item, order_id: orderId })
      updateStock.run({ quantity: item.quantity, product_id: item.product_id })
    }
    return orderId
  })

  return transaction(order, items)
}

export function updateOrder(order, items) {
  const database = getDatabase()

  const transaction = database.transaction((orderData, newItems) => {
    // Get old items to restore stock
    const oldItems = database
      .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
      .all(orderData.id)

    // Restore old stock
    for (const item of oldItems) {
      database
        .prepare(
          'UPDATE products SET stock_quantity = stock_quantity + @quantity WHERE id = @product_id'
        )
        .run({ quantity: item.quantity, product_id: item.product_id })
    }

    // Check new stock
    for (const item of newItems) {
      const product = database
        .prepare('SELECT stock_quantity, name FROM products WHERE id = ?')
        .get(item.product_id)
      if (!product) throw new Error(`المنتج غير موجود`)
      if (product.stock_quantity < item.quantity) {
        throw new Error(`المخزون غير كافي لـ "${product.name}". المتاح: ${product.stock_quantity}`)
      }
    }

    // Delete old items
    database.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderData.id)

    // Update order
    database
      .prepare(
        `UPDATE orders SET customer_id=@customer_id, delivery_person_id=@delivery_person_id,
         delivery_zone_id=@delivery_zone_id, delivery_address=@delivery_address,
         delivery_fee=@delivery_fee, total_amount=@total_amount, updated_at=datetime('now')
         WHERE id=@id`
      )
      .run(orderData)

    // Insert new items and deduct stock
    for (const item of newItems) {
      database
        .prepare(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (@order_id, @product_id, @quantity, @unit_price)'
        )
        .run({ ...item, order_id: orderData.id })
      database
        .prepare(
          'UPDATE products SET stock_quantity = stock_quantity - @quantity WHERE id = @product_id'
        )
        .run({ quantity: item.quantity, product_id: item.product_id })
    }

    return orderData.id
  })

  return transaction(order, items)
}

export function updateOrderStatus(id, status) {
  return getDatabase()
    .prepare(`UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?`)
    .run(status, id)
}

export function cancelOrder(id) {
  const database = getDatabase()
  const transaction = database.transaction(() => {
    // Restore stock for cancelled order
    const items = database
      .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
      .all(id)
    for (const item of items) {
      database
        .prepare(
          'UPDATE products SET stock_quantity = stock_quantity + @quantity WHERE id = @product_id'
        )
        .run({ quantity: item.quantity, product_id: item.product_id })
    }
    database
      .prepare(`UPDATE orders SET status='ملغي', updated_at=datetime('now') WHERE id=?`)
      .run(id)
  })
  return transaction()
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
  const database = getDatabase()
  const transaction = database.transaction(() => {
    const items = database
      .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
      .all(id)
    for (const item of items) {
      database
        .prepare(
          'UPDATE products SET stock_quantity = stock_quantity + @quantity WHERE id = @product_id'
        )
        .run({ quantity: item.quantity, product_id: item.product_id })
    }
    database.prepare('DELETE FROM orders WHERE id=?').run(id)
  })
  return transaction()
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
  const database = getDatabase()

  const revenue = database
    .prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'مكتمل'`)
    .get()

  const expenses = database.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`).get()

  const salaries = database.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM salaries`).get()

  const productCosts = database
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity * p.cost), 0) as total
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE o.status = 'مكتمل'`
    )
    .get()

  // Delivery person salary totals
  const deliveryPersonCosts = database
    .prepare(
      `SELECT dp.name, dp.id, COALESCE(COUNT(o.id), 0) as trips,
       COALESCE(SUM(o.delivery_fee), 0) as total_fees
     FROM delivery_persons dp
     LEFT JOIN orders o ON o.delivery_person_id = dp.id AND o.status = 'مكتمل'
     GROUP BY dp.id`
    )
    .all()

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
    netProfit,
    deliveryPersonCosts
  }
}
