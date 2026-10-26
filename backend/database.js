const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'retail_pos.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pcs',
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      mrp REAL NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      low_stock_threshold REAL DEFAULT 5,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      total_mrp REAL NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      total_savings REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'PAID',
      upi_reference TEXT,
      cashier_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      barcode TEXT,
      unit TEXT DEFAULT 'pcs',
      quantity REAL NOT NULL,
      cost_price REAL NOT NULL,
      mrp REAL NOT NULL,
      selling_price REAL NOT NULL,
      item_total REAL NOT NULL,
      savings REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      change_type TEXT NOT NULL, -- 'STOCK_IN', 'SALE', 'ADJUSTMENT', 'DAMAGE'
      quantity REAL NOT NULL,
      cost_price REAL,
      supplier_name TEXT,
      invoice_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec("ALTER TABLE products ADD COLUMN image_url TEXT");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
  } catch (e) {
    // Column already exists
  }

  // Seed default suppliers
  const defaultSuppliers = [
    'Metro Cash & Carry Wholesale',
    'Reliance Wholesale',
    'Local Mandi / APMC Distributor',
    'Hindustan Unilever Distributor',
    'ITC Distribution Hub'
  ];
  const insertSupplier = db.prepare('INSERT OR IGNORE INTO suppliers (name) VALUES (?)');
  for (const s of defaultSuppliers) {
    insertSupplier.run(s);
  }

  // Initialize default settings if missing
  const defaultSettings = [
    { key: 'store_name', value: 'Manidevi General Store' },
    { key: 'store_tagline', value: 'Fresh Grocery & Daily Essentials' },
    { key: 'store_address', value: 'Main Market Road, Near City Center' },
    { key: 'store_phone', value: '+91 98765 43210' },
    { key: 'upi_id', value: 'manidevi@upi' },
    { key: 'upi_name', value: 'Manidevi General Store' },
    { key: 'gstin', value: '27AABCS1429B1ZB' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'receipt_footer_msg', value: 'Thank You For Shopping! Check items before leaving.' }
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const setMany = db.transaction((settings) => {
    for (const s of settings) {
      insertSetting.run(s.key, s.value);
    }
  });
  setMany(defaultSettings);
  db.prepare("UPDATE settings SET value = 'Manidevi General Store' WHERE key = 'store_name' AND value IN ('VijayaLakshmi Minimart', 'DMart Local Supermarket')").run();
  db.prepare("UPDATE settings SET value = 'Manidevi General Store' WHERE key = 'upi_name' AND value IN ('VijayaLakshmi Minimart', 'Smart Supermarket')").run();

  // Seed sample products if catalog is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0) {
    seedProducts();
  }

  // Only seed demo sales if explicitly enabled via environment variable
  if (process.env.SEED_DEMO === 'true') {
    ensureLiveSalesData(db);
  }
}

function ensureLiveSalesData(db) {
  try {
    const todayOrdersCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at, 'localtime') = date('now', 'localtime')").get().count;
    const yesterdayOrdersCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at, 'localtime') = date('now', 'localtime', '-1 day')").get().count;

    const products = db.prepare("SELECT * FROM products WHERE COALESCE(is_active, 1) = 1").all();
    if (products.length === 0) return;

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_phone, total_mrp, subtotal, 
        discount, total_amount, total_savings, payment_method, payment_status, 
        upi_reference, cashier_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, barcode, unit, quantity, 
        cost_price, mrp, selling_price, item_total, savings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pad = (n) => String(n).padStart(2, '0');

    const generateOrder = (dateObj, hour, minute, customer, payMode, payStatus, productIndices) => {
      const dStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
      const tStr = `${pad(hour)}:${pad(minute)}:00`;
      const createdAt = `${dStr} ${tStr}`;
      const numCode = `${dStr.replace(/-/g, '')}-${String(Math.floor(Math.random() * 800) + 100).padStart(4, '0')}`;
      const orderNumber = `VL-${numCode}`;

      let totalMrp = 0;
      let subtotal = 0;
      const itemsData = [];

      for (const idx of productIndices) {
        const prod = products[idx % products.length];
        const qty = prod.unit === 'kg' ? 1.5 : 2;
        const itemTotal = Number((prod.selling_price * qty).toFixed(2));
        const itemMrpTotal = Number((prod.mrp * qty).toFixed(2));
        const itemSavings = Number((itemMrpTotal - itemTotal).toFixed(2));

        totalMrp += itemMrpTotal;
        subtotal += itemTotal;

        itemsData.push({
          product_id: prod.id,
          product_name: prod.name,
          barcode: prod.barcode,
          unit: prod.unit,
          quantity: qty,
          cost_price: prod.cost_price,
          mrp: prod.mrp,
          selling_price: prod.selling_price,
          item_total: itemTotal,
          savings: itemSavings
        });
      }

      const totalAmount = subtotal;
      const totalSavings = Number((totalMrp - totalAmount).toFixed(2));
      const upiRef = payMode === 'UPI' ? `UPI/${Date.now().toString().slice(-8)}` : null;

      const res = insertOrder.run(
        orderNumber,
        customer.name,
        customer.phone,
        totalMrp,
        subtotal,
        0,
        totalAmount,
        totalSavings,
        payMode,
        payStatus,
        upiRef,
        'Regular counter sale',
        createdAt
      );

      const orderId = res.lastInsertRowid;
      for (const it of itemsData) {
        insertItem.run(
          orderId,
          it.product_id,
          it.product_name,
          it.barcode,
          it.unit,
          it.quantity,
          it.cost_price,
          it.mrp,
          it.selling_price,
          it.item_total,
          it.savings
        );
      }
    };

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (yesterdayOrdersCount < 3) {
      generateOrder(yesterday, 10, 15, { name: 'Ramesh Patel', phone: '9820112233' }, 'UPI', 'PAID', [0, 2]);
      generateOrder(yesterday, 12, 30, { name: 'Priya Sharma', phone: '9876543210' }, 'CASH', 'PAID', [1, 3, 4]);
      generateOrder(yesterday, 17, 45, { name: 'Amit Kulkarni', phone: '9890123456' }, 'UPI', 'PAID', [2, 5]);
      generateOrder(yesterday, 19, 10, { name: 'Sunita Verma', phone: '9765432190' }, 'CASH', 'PAID', [0, 6, 7]);
    }

    if (todayOrdersCount < 3) {
      generateOrder(now, 9, 30, { name: 'Walk-in Customer', phone: '' }, 'CASH', 'PAID', [0, 1]);
      generateOrder(now, 11, 15, { name: 'Deepak Deshmukh', phone: '9988776655' }, 'UPI', 'PAID', [2, 3, 5]);
      generateOrder(now, 14, 20, { name: 'Neha Gupta', phone: '9822334455' }, 'UPI', 'PAID', [4, 6]);
      generateOrder(now, 17, 0, { name: 'Kavita Rao', phone: '9845112233' }, 'CASH', 'PAID', [1, 7]);
      generateOrder(now, 18, 30, { name: 'Suresh Patil', phone: '9811223344' }, 'UDHAAR', 'UNPAID', [0, 3]);
    }
  } catch (err) {
    console.error('Error ensuring live sales data:', err.message);
  }
}

function seedProducts() {
  const initialProducts = [
    {
      barcode: '8901030382341',
      name: 'Aashirvaad Superior Shudh Chakki Atta 5kg',
      category: 'Grains & Flours',
      unit: 'pkt',
      cost_price: 195.0,
      selling_price: 235.0,
      mrp: 275.0,
      stock: 35,
      low_stock_threshold: 10,
      image_url: '/images/atta.jpg'
    },
    {
      barcode: '8901262010054',
      name: 'Amul Butter Pasteurised 500g',
      category: 'Dairy & Eggs',
      unit: 'pcs',
      cost_price: 242.0,
      selling_price: 265.0,
      mrp: 285.0,
      stock: 28,
      low_stock_threshold: 8,
      image_url: '/images/butter.jpg'
    },
    {
      barcode: '8901058852277',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      category: 'Staples & Spices',
      unit: 'pkt',
      cost_price: 18.5,
      selling_price: 24.0,
      mrp: 28.0,
      stock: 85,
      low_stock_threshold: 15,
      image_url: '/images/salt.jpg'
    },
    {
      barcode: '8901058000401',
      name: 'Maggi 2-Minute Masala Instant Noodles 4-Pack (280g)',
      category: 'Packaged Food & Snacks',
      unit: 'pkt',
      cost_price: 41.0,
      selling_price: 52.0,
      mrp: 60.0,
      stock: 64,
      low_stock_threshold: 12,
      image_url: '/images/maggi.jpg'
    },
    {
      barcode: '8906007280014',
      name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
      category: 'Edible Oils',
      unit: 'pkt',
      cost_price: 122.0,
      selling_price: 144.0,
      mrp: 175.0,
      stock: 42,
      low_stock_threshold: 10,
      image_url: '/images/oil.jpg'
    },
    {
      barcode: '8901030831610',
      name: 'Surf Excel Easy Wash Detergent Powder 1kg',
      category: 'Household & Cleaning',
      unit: 'pkt',
      cost_price: 98.0,
      selling_price: 122.0,
      mrp: 145.0,
      stock: 30,
      low_stock_threshold: 6,
      image_url: '/images/surf_excel.jpg'
    },
    {
      barcode: '8901537002018',
      name: 'Daawat Rozana Super Basmati Rice 1kg',
      category: 'Grains & Flours',
      unit: 'pkt',
      cost_price: 72.0,
      selling_price: 89.0,
      mrp: 115.0,
      stock: 40,
      low_stock_threshold: 10,
      image_url: '/images/daawat_rice.jpg'
    },
    {
      barcode: '7622201736637',
      name: 'Cadbury Dairy Milk Silk Chocolate 60g',
      category: 'Chocolates & Sweets',
      unit: 'pcs',
      cost_price: 58.0,
      selling_price: 72.0,
      mrp: 80.0,
      stock: 55,
      low_stock_threshold: 12,
      image_url: '/images/cadbury_silk.jpg'
    },
    {
      barcode: '8901719101037',
      name: 'Parle-G Gold Glucose Biscuits 1kg Family Pack',
      category: 'Packaged Food & Snacks',
      unit: 'pkt',
      cost_price: 94.0,
      selling_price: 118.0,
      mrp: 140.0,
      stock: 24,
      low_stock_threshold: 5,
      image_url: '/images/parle_g.jpg'
    },
    {
      barcode: '8901396316121',
      name: 'Dettol Original Germ Protection Liquid Handwash Refill 675ml',
      category: 'Personal Care',
      unit: 'pkt',
      cost_price: 78.0,
      selling_price: 99.0,
      mrp: 125.0,
      stock: 18,
      low_stock_threshold: 5,
      image_url: '/images/dettol.jpg'
    },
    {
      barcode: '8901030001013',
      name: 'Red Label Strong Blend Tea 500g',
      category: 'Beverages',
      unit: 'pkt',
      cost_price: 210.0,
      selling_price: 248.0,
      mrp: 290.0,
      stock: 32,
      low_stock_threshold: 8,
      image_url: '/images/red_label.jpg'
    },
    {
      barcode: '8901491101837',
      name: 'Haldiram Nagpur Aloo Bhujia 400g',
      category: 'Packaged Food & Snacks',
      unit: 'pkt',
      cost_price: 90.0,
      selling_price: 112.0,
      mrp: 130.0,
      stock: 35,
      low_stock_threshold: 8,
      image_url: '/images/haldiram_bhujia.jpg'
    },
    {
      barcode: 'LOOSE-ONION',
      name: 'Fresh Red Onion (Nashik Quality)',
      category: 'Fresh Produce',
      unit: 'kg',
      cost_price: 22.0,
      selling_price: 32.0,
      mrp: 42.0,
      stock: 80.5,
      low_stock_threshold: 20,
      image_url: '/images/onion.jpg'
    },
    {
      barcode: 'LOOSE-POTATO',
      name: 'Fresh Jyoti Potato',
      category: 'Fresh Produce',
      unit: 'kg',
      cost_price: 18.0,
      selling_price: 26.0,
      mrp: 35.0,
      stock: 95.0,
      low_stock_threshold: 20,
      image_url: '/images/potato.jpg'
    },
    {
      barcode: 'LOOSE-SUGAR',
      name: 'Premium Madhur Crystal Sugar',
      category: 'Staples & Spices',
      unit: 'kg',
      cost_price: 37.0,
      selling_price: 44.0,
      mrp: 50.0,
      stock: 120.0,
      low_stock_threshold: 30,
      image_url: '/images/madhur_sugar.jpg'
    },
    {
      barcode: 'LOOSE-TOORDAL',
      name: 'Unpolished Desi Toor Dal',
      category: 'Staples & Spices',
      unit: 'kg',
      cost_price: 125.0,
      selling_price: 148.0,
      mrp: 175.0,
      stock: 50.0,
      low_stock_threshold: 15,
      image_url: '/images/toor_dal.jpg'
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO products (barcode, name, category, unit, cost_price, selling_price, mrp, stock, low_stock_threshold, image_url)
    VALUES (@barcode, @name, @category, @unit, @cost_price, @selling_price, @mrp, @stock, @low_stock_threshold, @image_url)
  `);

  const insertStockLog = db.prepare(`
    INSERT INTO stock_logs (product_id, change_type, quantity, cost_price, supplier_name, notes)
    VALUES (?, 'STOCK_IN', ?, ?, 'Initial Opening Stock', 'Initial warehouse stock load')
  `);

  const tx = db.transaction((products) => {
    for (const p of products) {
      const result = insertStmt.run(p);
      insertStockLog.run(result.lastInsertRowid, p.stock, p.cost_price);
    }
  });

  tx(initialProducts);
}

initDatabase();

module.exports = db;
