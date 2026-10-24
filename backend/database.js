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
    { key: 'store_name', value: 'VijayaLakshmi Minimart' },
    { key: 'store_tagline', value: 'Fresh Grocery & Daily Essentials' },
    { key: 'store_address', value: 'Main Market Road, Near City Center' },
    { key: 'store_phone', value: '+91 98765 43210' },
    { key: 'upi_id', value: 'vijayalakshmi@upi' },
    { key: 'upi_name', value: 'VijayaLakshmi Minimart' },
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

  // Seed sample products if catalog is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0) {
    seedProducts();
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
