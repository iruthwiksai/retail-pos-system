process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. HTTP Payload Compression (Gzip / Brotli reduces payload by up to 65-70%)
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 3. CORS Policy (Restricted in production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// 4. Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' }
});
app.use('/api', generalLimiter);

const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Action rate limit reached. Please wait 1 minute.' }
});

// 5. Manager PIN Protection Middleware
function requireManagerPin(req, res, next) {
  const pinFromHeader = req.headers['x-manager-pin'];
  const pinFromBody = req.body?.manager_pin;
  const pinFromQuery = req.query?.manager_pin;
  const providedPin = (pinFromHeader || pinFromBody || pinFromQuery || '').toString().trim();

  const configuredPinRow = db.prepare("SELECT value FROM settings WHERE key = 'manager_pin'").get();
  const configuredPin = configuredPinRow?.value || '1234';

  if (!providedPin || providedPin !== configuredPin) {
    return res.status(401).json({
      error: 'Manager PIN required or invalid. Please provide the 4-digit Manager PIN (default: 1234).'
    });
  }
  next();
}

// Helper to get today's date string in IST format (YYYYMMDD)
function getTodayISTDateStr() {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIST.toISOString().slice(0, 10).replace(/-/g, '');
}

// Helper to generate formatted Order ID (VijayaLakshmi Minimart: VL-YYYYMMDD-XXXX)
function generateOrderNumber(offset = 0) {
  const dateStr = getTodayISTDateStr();
  const latestOrder = db.prepare(`
    SELECT order_number FROM orders 
    WHERE order_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`VL-${dateStr}-%`);

  let nextSeq = 1;
  if (latestOrder && latestOrder.order_number) {
    const parts = latestOrder.order_number.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }
  const seq = String(nextSeq + offset).padStart(4, '0');
  return `VL-${dateStr}-${seq}`;
}

// Endpoint to get next Order ID for active cart
app.get('/api/orders/next-id', (req, res) => {
  try {
    const slot = Number(req.query.slot) || 0;
    const nextId = generateOrderNumber(slot);
    res.json({ nextId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for the 3 quick widgets: Previous 3 orders, Frequent 3-5 items, Out of stock items
app.get('/api/dashboard/widgets', (req, res) => {
  try {
    // 1: Previous 3 orders
    const recentOrders = db.prepare(`
      SELECT id, order_number, customer_name, customer_phone, total_amount, payment_method, payment_status, created_at,
             (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count
      FROM orders
      ORDER BY created_at DESC
      LIMIT 3
    `).all();

    // 2: Most frequently ordered 3 to 5 items (with product details)
    const frequentItems = db.prepare(`
      SELECT p.id, p.name, p.barcode, p.category, p.unit, p.selling_price, p.stock, p.image_url,
             COUNT(oi.id) as times_ordered,
             SUM(oi.quantity) as total_qty_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY times_ordered DESC, total_qty_sold DESC
      LIMIT 5
    `).all();

    // Fallback if not enough orders yet: pick top 5 popular products
    let topItems = frequentItems;
    if (topItems.length < 3) {
      topItems = db.prepare('SELECT id, name, barcode, category, unit, selling_price, stock, image_url FROM products ORDER BY stock DESC LIMIT 5').all();
    }

    // 3: Items out of stock (stock <= 0)
    const outOfStockItems = db.prepare(`
      SELECT id, name, barcode, category, unit, selling_price, stock, low_stock_threshold, image_url
      FROM products
      WHERE stock <= 0
      ORDER BY name ASC
    `).all();

    res.json({
      recentOrders,
      frequentItems: topItems,
      outOfStockItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- SETTINGS API -----------------
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_SETTINGS_KEYS = new Set([
  'store_name',
  'store_tagline',
  'store_address',
  'store_phone',
  'upi_id',
  'upi_name',
  'gstin',
  'currency_symbol',
  'receipt_footer_msg',
  'manager_pin'
]);

app.post('/api/settings', sensitiveActionLimiter, requireManagerPin, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid settings body' });
    }

    // Validate UPI ID format if provided
    if (req.body.upi_id) {
      const upiStr = String(req.body.upi_id).trim();
      const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upiStr)) {
        return res.status(400).json({ error: 'Invalid UPI ID format. Expected format: name@bank (e.g. shop@okaxis or 9876543210@upi)' });
      }
    }

    // Validate Manager PIN if updated
    if (req.body.manager_pin) {
      const pinStr = String(req.body.manager_pin).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        return res.status(400).json({ error: 'Manager PIN must be a 4-digit number (e.g. 1234)' });
      }
    }

    // Filter strictly to allowed keys (reject junk/injected keys)
    const validEntries = Object.entries(req.body).filter(([k]) => ALLOWED_SETTINGS_KEYS.has(k));
    if (validEntries.length === 0) {
      return res.status(400).json({ error: 'No valid setting keys provided' });
    }

    const updateStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    const updateMany = db.transaction((sanitizedEntries) => {
      for (const [key, val] of sanitizedEntries) {
        updateStmt.run(key, String(val).slice(0, 500));
      }
    });
    updateMany(validEntries);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- PRODUCTS API -----------------
app.get('/api/products', (req, res) => {
  try {
    const { q, category, low_stock } = req.query;
    let query = 'SELECT * FROM products WHERE COALESCE(is_active, 1) = 1';
    const params = [];

    if (q) {
      query += ' AND (name LIKE ? OR barcode LIKE ? OR category LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (low_stock === 'true') {
      query += ' AND stock <= low_stock_threshold';
    }

    query += ' ORDER BY name ASC';
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE COALESCE(is_active, 1) = 1 ORDER BY category ASC').all();
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { barcode, name, category, unit, cost_price, selling_price, mrp, stock, low_stock_threshold, image_url } = req.body;
    if (!name || cost_price === undefined || selling_price === undefined || mrp === undefined) {
      return res.status(400).json({ error: 'Name, Cost Price, Selling Price and MRP are required' });
    }

    const cleanBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : `AUTO-${Date.now().toString().slice(-8)}`;

    const stmt = db.prepare(`
      INSERT INTO products (barcode, name, category, unit, cost_price, selling_price, mrp, stock, low_stock_threshold, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanBarcode,
      name.trim(),
      category || 'General',
      unit || 'pcs',
      Number(cost_price),
      Number(selling_price),
      Number(mrp),
      Number(stock) || 0,
      Number(low_stock_threshold) || 5,
      image_url || null
    );

    if (Number(stock) > 0) {
      db.prepare(`
        INSERT INTO stock_logs (product_id, change_type, quantity, cost_price, supplier_name, notes)
        VALUES (?, 'STOCK_IN', ?, ?, 'Initial Stock', 'Added during product creation')
      `).run(result.lastInsertRowid, Number(stock), Number(cost_price));
    }

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { barcode, name, category, unit, cost_price, selling_price, mrp, stock, low_stock_threshold, image_url } = req.body;

    const stmt = db.prepare(`
      UPDATE products
      SET barcode = ?, name = ?, category = ?, unit = ?, cost_price = ?, selling_price = ?, mrp = ?, stock = ?, low_stock_threshold = ?, image_url = COALESCE(?, image_url), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      barcode,
      name,
      category,
      unit,
      Number(cost_price),
      Number(selling_price),
      Number(mrp),
      Number(stock),
      Number(low_stock_threshold),
      image_url || null,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', sensitiveActionLimiter, requireManagerPin, (req, res) => {
  try {
    const { id } = req.params;
    const salesCountRow = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id);
    const salesCount = salesCountRow ? salesCountRow.count : 0;

    if (salesCount > 0) {
      // Soft-delete to preserve foreign key integrity with historical sales
      db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      res.json({ success: true, message: 'Product archived (has historical sales records)' });
    } else {
      // Hard delete if product was never sold
      db.prepare('DELETE FROM stock_logs WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      res.json({ success: true, message: 'Product deleted successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- INVENTORY / STOCK-IN API -----------------
app.post('/api/inventory/stock-in', (req, res) => {
  try {
    const { supplier_name, invoice_no, notes } = req.body;
    let items = req.body.items;

    // Backward compatibility for single product payload
    if (!items || !Array.isArray(items)) {
      if (req.body.product_id && req.body.quantity) {
        items = [{
          product_id: req.body.product_id,
          quantity: req.body.quantity,
          cost_price: req.body.cost_price
        }];
      } else {
        return res.status(400).json({ error: 'Valid products and quantities are required' });
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'At least one product item is required' });
    }

    const supplier = supplier_name || 'Direct Vendor';
    const invoice = invoice_no || '';
    const note = notes || '';

    const updateProductStmt = db.prepare(`
      UPDATE products 
      SET stock = stock + ?, 
          cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const logStmt = db.prepare(`
      INSERT INTO stock_logs (product_id, change_type, quantity, cost_price, supplier_name, invoice_no, notes)
      VALUES (?, 'STOCK_IN', ?, ?, ?, ?, ?)
    `);

    const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const updatedProducts = [];

    const performStockInTx = db.transaction(() => {
      for (const item of items) {
        const prodId = Number(item.product_id);
        const qty = Number(item.quantity);
        if (!prodId || isNaN(qty) || qty <= 0) continue;

        const currentProd = getProductStmt.get(prodId);
        if (!currentProd) continue;

        const newCost = (item.cost_price !== undefined && item.cost_price !== '' && Number(item.cost_price) >= 0)
          ? Number(item.cost_price)
          : currentProd.cost_price;

        updateProductStmt.run(qty, newCost, newCost, prodId);
        logStmt.run(prodId, qty, newCost, supplier, invoice, note);

        const updated = getProductStmt.get(prodId);
        updatedProducts.push(updated);
      }
    });

    performStockInTx();

    if (supplier && supplier.trim() !== '') {
      try {
        db.prepare('INSERT OR IGNORE INTO suppliers (name) VALUES (?)').run(supplier.trim());
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `Stock updated successfully for ${updatedProducts.length} product(s)`,
      updatedProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers', (req, res) => {
  try {
    const suppliers = db.prepare(`
      SELECT DISTINCT name FROM (
        SELECT name FROM suppliers
        UNION
        SELECT supplier_name as name FROM stock_logs WHERE supplier_name IS NOT NULL AND supplier_name != ''
      )
      ORDER BY name ASC
    `).all();
    res.json(suppliers.map(s => s.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Supplier name is required' });
    }
    const cleanName = name.trim();
    db.prepare('INSERT OR IGNORE INTO suppliers (name, phone) VALUES (?, ?)').run(cleanName, phone || null);
    
    const all = db.prepare(`
      SELECT DISTINCT name FROM (
        SELECT name FROM suppliers
        UNION
        SELECT supplier_name as name FROM stock_logs WHERE supplier_name IS NOT NULL AND supplier_name != ''
      )
      ORDER BY name ASC
    `).all();
    res.json({ success: true, name: cleanName, suppliers: all.map(s => s.name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT l.*, p.name as product_name, p.unit, p.barcode
      FROM stock_logs l
      JOIN products p ON l.product_id = p.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- ORDERS / BILLING API -----------------
app.post('/api/orders', sensitiveActionLimiter, (req, res) => {
  try {
    const { items, customer_name, customer_phone, payment_method, payment_status, upi_reference, cashier_notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // 1. Merge cart lines by product_id to prevent duplicate item stock-check bypasses
    const mergedQuantities = {};
    for (const item of items) {
      const prodId = Number(item.product_id);
      const qty = Number(item.quantity);
      if (!prodId || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Each order item must have a valid product_id and positive quantity' });
      }
      mergedQuantities[prodId] = (mergedQuantities[prodId] || 0) + qty;
    }

    // 2. Validate stock and compute official prices strictly from DB
    const preparedItems = [];
    let subtotal = 0;
    let totalMrp = 0;
    let totalSavings = 0;
    let totalCost = 0;

    for (const [prodIdStr, totalQty] of Object.entries(mergedQuantities)) {
      const prodId = Number(prodIdStr);
      const p = db.prepare('SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1').get(prodId);
      if (!p) {
        return res.status(400).json({ error: `Product not found or inactive with ID ${prodId}` });
      }

      if (p.stock < totalQty) {
        return res.status(400).json({
          error: `Insufficient stock for "${p.name}". Available: ${p.stock} ${p.unit}, Requested: ${totalQty} ${p.unit}`
        });
      }

      // Trust the database selling price (reject client price tampering)
      const sellingPrice = Number(p.selling_price);
      const mrp = Number(p.mrp || p.selling_price);
      const costPrice = Number(p.cost_price);

      const itemTotal = Number((sellingPrice * totalQty).toFixed(2));
      const itemMrpTotal = Number((mrp * totalQty).toFixed(2));
      const savings = Math.max(0, Number((itemMrpTotal - itemTotal).toFixed(2)));

      subtotal += itemTotal;
      totalMrp += itemMrpTotal;
      totalSavings += savings;
      totalCost += costPrice * totalQty;

      preparedItems.push({
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        unit: p.unit,
        quantity: totalQty,
        cost_price: costPrice,
        mrp: mrp,
        selling_price: sellingPrice,
        item_total: itemTotal,
        savings: savings
      });
    }

    const finalSubtotal = Number(subtotal.toFixed(2));
    const finalTotal = finalSubtotal;
    const finalTotalMrp = Number(totalMrp.toFixed(2));
    const finalTotalSavings = Number(totalSavings.toFixed(2));

    // Strictly whitelist payment method & status
    const ALLOWED_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'CREDIT', 'UDHAAR'];
    const rawMethod = (payment_method || 'CASH').toString().toUpperCase().trim();
    if (!ALLOWED_PAYMENT_METHODS.includes(rawMethod)) {
      return res.status(400).json({
        error: `Invalid payment method "${payment_method}". Allowed methods: ${ALLOWED_PAYMENT_METHODS.join(', ')}`
      });
    }
    const finalPaymentMethod = (rawMethod === 'CREDIT' || rawMethod === 'UDHAAR') ? 'UDHAAR' : rawMethod;

    const ALLOWED_PAYMENT_STATUS = ['PAID', 'UNPAID'];
    let finalPaymentStatus = 'PAID';
    if (finalPaymentMethod === 'UDHAAR' || payment_status === 'UNPAID') {
      finalPaymentStatus = 'UNPAID';
    } else if (payment_status && ALLOWED_PAYMENT_STATUS.includes(payment_status)) {
      finalPaymentStatus = payment_status;
    } else if (payment_status && !ALLOWED_PAYMENT_STATUS.includes(payment_status)) {
      return res.status(400).json({
        error: `Invalid payment status "${payment_status}". Allowed statuses: PAID, UNPAID`
      });
    }

    const createOrderTx = db.transaction(() => {
      const dateStr = getTodayISTDateStr();

      const orderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, total_mrp, subtotal, 
          discount, total_amount, total_savings, payment_method, payment_status, 
          upi_reference, cashier_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `);

      // Collision-free order sequence generation inside transaction
      let orderNumber = '';
      let orderResult = null;
      let attempts = 0;

      while (!orderResult && attempts < 10) {
        attempts++;
        const latestOrder = db.prepare(`
          SELECT order_number FROM orders 
          WHERE order_number LIKE ? 
          ORDER BY id DESC LIMIT 1
        `).get(`VL-${dateStr}-%`);

        let nextSeq = 1;
        if (latestOrder && latestOrder.order_number) {
          const parts = latestOrder.order_number.split('-');
          const lastNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
          }
        }

        orderNumber = `VL-${dateStr}-${String(nextSeq).padStart(4, '0')}`;

        try {
          orderResult = orderStmt.run(
            orderNumber,
            customer_name || 'Walk-in Customer',
            customer_phone || '',
            finalTotalMrp,
            finalSubtotal,
            finalTotal,
            finalTotalSavings,
            finalPaymentMethod,
            finalPaymentStatus,
            upi_reference || '',
            cashier_notes || ''
          );
        } catch (e) {
          if (e.message && e.message.includes('UNIQUE constraint failed')) {
            continue;
          }
          throw e;
        }
      }

      if (!orderResult) {
        throw new Error('Could not generate unique order number after multiple attempts');
      }

      const orderId = orderResult.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, barcode, unit, quantity, 
          cost_price, mrp, selling_price, item_total, savings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Strict stock reduction without silent clamping
      const updateStockStmt = db.prepare(`
        UPDATE products 
        SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const stockLogStmt = db.prepare(`
        INSERT INTO stock_logs (product_id, change_type, quantity, cost_price, notes)
        VALUES (?, 'SALE', ?, ?, ?)
      `);

      for (const item of preparedItems) {
        itemStmt.run(
          orderId,
          item.product_id,
          item.product_name,
          item.barcode,
          item.unit,
          item.quantity,
          item.cost_price,
          item.mrp,
          item.selling_price,
          item.item_total,
          item.savings
        );

        updateStockStmt.run(item.quantity, item.product_id);
        stockLogStmt.run(item.product_id, -item.quantity, item.cost_price, `Sold in ${orderNumber}`);
      }

      return { orderId, orderNumber };
    });

    const { orderId, orderNumber } = createOrderTx();

    const fullOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    res.status(201).json({
      ...fullOrder,
      items: orderItems,
      message: 'Order created and stock updated successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const { q, date, payment_method, limit } = req.query;
    let query = `
      SELECT o.*,
        COALESCE((SELECT SUM(oi.quantity * oi.cost_price) FROM order_items oi WHERE oi.order_id = o.id), 0) as total_cost,
        (o.total_amount - COALESCE((SELECT SUM(oi.quantity * oi.cost_price) FROM order_items oi WHERE oi.order_id = o.id), 0)) as profit,
        CASE 
          WHEN o.total_amount > 0 
          THEN ROUND(((o.total_amount - COALESCE((SELECT SUM(oi.quantity * oi.cost_price) FROM order_items oi WHERE oi.order_id = o.id), 0)) / o.total_amount) * 100, 1)
          ELSE 0 
        END as margin_percent
      FROM orders o
      WHERE datetime(o.created_at, 'localtime') <= datetime('now', 'localtime')
    `;
    const params = [];

    if (q) {
      query += ' AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (date) {
      query += " AND date(o.created_at, 'localtime') = date(?, 'localtime')";
      params.push(date);
    }

    if (payment_method && payment_method !== 'All') {
      query += ' AND o.payment_method = ?';
      params.push(payment_method);
    }

    query += ' ORDER BY o.created_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      params.push(Number(limit));
    } else {
      query += ' LIMIT 100';
    }

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare(`
      SELECT o.*,
        COALESCE((SELECT SUM(oi.quantity * oi.cost_price) FROM order_items oi WHERE oi.order_id = o.id), 0) as total_cost,
        (o.total_amount - COALESCE((SELECT SUM(oi.quantity * oi.cost_price) FROM order_items oi WHERE oi.order_id = o.id), 0)) as profit,
        CASE 
          WHEN o.total_amount > 0 
          THEN ROUND(((o.total_amount - COALESCE((SELECT SUM(oi.quantity * oi.cost_price) FROM order_items oi WHERE oi.order_id = o.id), 0)) / o.total_amount) * 100, 1)
          ELSE 0 
        END as margin_percent
      FROM orders o
      WHERE o.id = ? OR o.order_number = ?
    `).get(id, id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BUSINESS ANALYTICS API -----------------
app.get('/api/analytics', (req, res) => {
  try {
    const { period, startDate, endDate } = req.query; // 'today', 'week', 'month', 'all', 'custom'

    // 1. Build Condition for selected period (PAID orders only for revenue)
    const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
    let paidCondition = "payment_status = 'PAID'";
    let periodLabel = 'Last 7 Days';

    if (period === 'today') {
      paidCondition += " AND date(created_at, 'localtime') = date('now', 'localtime')";
      periodLabel = 'Today';
    } else if (period === 'week') {
      paidCondition += " AND date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')";
      periodLabel = 'Last 7 Days';
    } else if (period === 'month') {
      paidCondition += " AND date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
      periodLabel = 'This Month';
    } else if (period === 'custom' && isDate(startDate) && isDate(endDate)) {
      paidCondition += ` AND date(created_at, 'localtime') BETWEEN date('${startDate}') AND date('${endDate}')`;
      periodLabel = `${startDate} to ${endDate}`;
    } else {
      periodLabel = 'All Time';
    }

    // 2. Summary Totals for Paid orders in selected period
    const summary = db.prepare(`
      SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_mrp), 0) as total_mrp,
        COALESCE(SUM(total_savings), 0) as total_savings
      FROM orders
      WHERE ${paidCondition}
    `).get();

    // Cost & Profit calculation for Paid orders
    const costSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(oi.cost_price * oi.quantity), 0) as total_cost,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
    `).get();

    const revenue = summary.total_revenue;
    const cost = costSummary.total_cost;
    const grossProfit = Number((revenue - cost).toFixed(2));
    const profitMargin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0;
    const avgOrderValue = summary.total_orders > 0 ? Number((revenue / summary.total_orders).toFixed(1)) : 0;

    // 3. Sales Growth Comparison with previous period (return null if prev period had no sales)
    let prevRevenue = null;
    let growthPercent = null;

    if (period === 'today') {
      const prev = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as rev FROM orders WHERE payment_status = 'PAID' AND date(created_at, 'localtime') = date('now', 'localtime', '-1 day')").get();
      prevRevenue = prev.rev;
      growthPercent = prevRevenue > 0 ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null;
    } else if (period === 'week') {
      const prev = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as rev FROM orders WHERE payment_status = 'PAID' AND date(created_at, 'localtime') >= date('now', 'localtime', '-13 days') AND date(created_at, 'localtime') < date('now', 'localtime', '-6 days')").get();
      prevRevenue = prev.rev;
      growthPercent = prevRevenue > 0 ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null;
    } else if (period === 'month') {
      const prev = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as rev FROM orders WHERE payment_status = 'PAID' AND date(created_at, 'localtime') >= date('now', 'localtime', 'start of month', '-1 month') AND date(created_at, 'localtime') < date('now', 'localtime', 'start of month')").get();
      prevRevenue = prev.rev;
      growthPercent = prevRevenue > 0 ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null;
    }

    // 4. Trend Data with Missing Date Filling (No Gaps in Trend!)
    let salesTrend = [];

    if (period === 'today') {
      // 7 AM to 10 PM hourly breakdown for today
      const rawHourly = db.prepare(`
        SELECT 
          CAST(strftime('%H', o.created_at, 'localtime') AS INTEGER) as hour,
          COUNT(DISTINCT o.id) as orders_count,
          ROUND(COALESCE(SUM(o.total_amount), 0), 2) as revenue,
          ROUND(COALESCE(SUM(o.total_amount - (SELECT COALESCE(SUM(oi.quantity * oi.cost_price), 0) FROM order_items oi WHERE oi.order_id = o.id)), 0), 2) as profit
        FROM orders o
        WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
        GROUP BY hour
      `).all();

      const hourlyMap = {};
      rawHourly.forEach(h => { hourlyMap[h.hour] = h; });

      for (let h = 7; h <= 22; h++) {
        const found = hourlyMap[h];
        salesTrend.push({
          hour: h,
          label: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`,
          orders_count: found ? found.orders_count : 0,
          revenue: found ? found.revenue : 0,
          profit: found ? found.profit : 0
        });
      }
    } else if (period === 'week') {
      // Fill all 7 days from T-6 to T
      const rawDaily = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', o.created_at, 'localtime') as date_str,
          COUNT(DISTINCT o.id) as orders_count,
          ROUND(COALESCE(SUM(o.total_amount), 0), 2) as revenue,
          ROUND(COALESCE(SUM(o.total_amount - (SELECT COALESCE(SUM(oi.quantity * oi.cost_price), 0) FROM order_items oi WHERE oi.order_id = o.id)), 0), 2) as profit
        FROM orders o
        WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
        GROUP BY date_str
      `).all();

      const dailyMap = {};
      rawDaily.forEach(d => { dailyMap[d.date_str] = d; });

      // Generate 7 consecutive dates in IST
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const found = dailyMap[dateStr];

        salesTrend.push({
          date: dateStr,
          label: dayLabel,
          orders_count: found ? found.orders_count : 0,
          revenue: found ? found.revenue : 0,
          profit: found ? found.profit : 0
        });
      }
    } else if (period === 'month') {
      // Fill all days from 1st of month to today
      const rawDaily = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', o.created_at, 'localtime') as date_str,
          COUNT(DISTINCT o.id) as orders_count,
          ROUND(COALESCE(SUM(o.total_amount), 0), 2) as revenue,
          ROUND(COALESCE(SUM(o.total_amount - (SELECT COALESCE(SUM(oi.quantity * oi.cost_price), 0) FROM order_items oi WHERE oi.order_id = o.id)), 0), 2) as profit
        FROM orders o
        WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
        GROUP BY date_str
      `).all();

      const dailyMap = {};
      rawDaily.forEach(d => { dailyMap[d.date_str] = d; });

      const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const currentDayOfMonth = nowIST.getDate();
      const year = nowIST.getFullYear();
      const month = nowIST.getMonth();

      for (let day = 1; day <= currentDayOfMonth; day++) {
        const d = new Date(Date.UTC(year, month, day));
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const found = dailyMap[dateStr];

        salesTrend.push({
          date: dateStr,
          label: dayLabel,
          orders_count: found ? found.orders_count : 0,
          revenue: found ? found.revenue : 0,
          profit: found ? found.profit : 0
        });
      }
    } else {
      // All time / custom range grouped by date
      salesTrend = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', o.created_at, 'localtime') as date,
          strftime('%d %b', o.created_at, 'localtime') as label,
          COUNT(DISTINCT o.id) as orders_count,
          ROUND(COALESCE(SUM(o.total_amount), 0), 2) as revenue,
          ROUND(COALESCE(SUM(o.total_amount - (SELECT COALESCE(SUM(oi.quantity * oi.cost_price), 0) FROM order_items oi WHERE oi.order_id = o.id)), 0), 2) as profit
        FROM orders o
        WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
        GROUP BY date
        ORDER BY date ASC
      `).all();
    }

    // 5. Day × Hour Heatmap (7 rows by hours 7 to 22)
    const heatmapRaw = db.prepare(`
      SELECT 
        CAST(strftime('%w', created_at, 'localtime') AS INTEGER) as day_index,
        CAST(strftime('%H', created_at, 'localtime') AS INTEGER) as hour,
        COUNT(id) as bills_count,
        ROUND(COALESCE(SUM(total_amount), 0), 2) as revenue
      FROM orders
      WHERE payment_status = 'PAID'
      GROUP BY day_index, hour
    `).all();

    const heatmapMap = {};
    let maxHeatmapBills = 1;
    heatmapRaw.forEach(item => {
      heatmapMap[`${item.day_index}-${item.hour}`] = item;
      if (item.bills_count > maxHeatmapBills) maxHeatmapBills = item.bills_count;
    });

    const heatmapDays = [
      { day_index: 1, name: 'Monday', short: 'Mon' },
      { day_index: 2, name: 'Tuesday', short: 'Tue' },
      { day_index: 3, name: 'Wednesday', short: 'Wed' },
      { day_index: 4, name: 'Thursday', short: 'Thu' },
      { day_index: 5, name: 'Friday', short: 'Fri' },
      { day_index: 6, name: 'Saturday', short: 'Sat' },
      { day_index: 0, name: 'Sunday', short: 'Sun' }
    ];

    const heatmapHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

    const heatmap = heatmapDays.map(d => {
      const hours = heatmapHours.map(h => {
        const cell = heatmapMap[`${d.day_index}-${h}`];
        return {
          hour: h,
          label: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`,
          bills_count: cell ? cell.bills_count : 0,
          revenue: cell ? cell.revenue : 0
        };
      });
      return {
        day_index: d.day_index,
        day_name: d.name,
        day_short: d.short,
        hours
      };
    });

    // 6. Dynamic Hourly Footfall (Bills count) & Revenue Peak
    const hourlyRaw = db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at, 'localtime') AS INTEGER) as hour_num,
        COUNT(id) as orders_count,
        ROUND(COALESCE(SUM(total_amount), 0), 2) as revenue
      FROM orders
      WHERE ${paidCondition}
      GROUP BY hour_num
      ORDER BY hour_num ASC
    `).all();

    const hoursMap = {};
    hourlyRaw.forEach(h => { hoursMap[h.hour_num] = h; });

    // Expand hours if sales occur outside 8-22
    const minSaleHour = hourlyRaw.length > 0 ? Math.min(7, Math.min(...hourlyRaw.map(h => h.hour_num))) : 7;
    const maxSaleHour = hourlyRaw.length > 0 ? Math.max(22, Math.max(...hourlyRaw.map(h => h.hour_num))) : 22;

    const hourlyDistribution = [];
    for (let h = minSaleHour; h <= maxSaleHour; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const found = hoursMap[h];
      hourlyDistribution.push({
        hour: h,
        label: `${displayHour} ${ampm}`,
        orders_count: found ? found.orders_count : 0,
        revenue: found ? found.revenue : 0
      });
    }

    // Peak Footfall ranks by bills/orders count, Peak Revenue ranks by sales amount
    const peakFootfallHour = hourlyDistribution.reduce((max, h) => (h.orders_count > (max?.orders_count || 0) ? h : max), hourlyDistribution[0]);
    const peakRevenueHour = hourlyDistribution.reduce((max, h) => (h.revenue > (max?.revenue || 0) ? h : max), hourlyDistribution[0]);

    // 7. Day of Week distribution (Monday to Sunday)
    const dowRaw = db.prepare(`
      SELECT 
        CAST(strftime('%w', created_at, 'localtime') AS INTEGER) as dow,
        COUNT(id) as orders_count,
        ROUND(COALESCE(SUM(total_amount), 0), 2) as revenue
      FROM orders
      WHERE ${paidCondition}
      GROUP BY dow
      ORDER BY dow ASC
    `).all();

    const dowMap = {};
    dowRaw.forEach(d => { dowMap[d.dow] = d; });

    const dayOfWeekDistribution = heatmapDays.map(d => {
      const found = dowMap[d.day_index];
      return {
        day_index: d.day_index,
        day_name: d.name,
        day_short: d.short,
        orders_count: found ? found.orders_count : 0,
        revenue: found ? found.revenue : 0
      };
    });

    const peakDay = dayOfWeekDistribution.reduce((max, d) => (d.orders_count > (max?.orders_count || 0) ? d : max), dayOfWeekDistribution[0]);
    const peakRevenueDay = dayOfWeekDistribution.reduce((max, d) => (d.revenue > (max?.revenue || 0) ? d : max), dayOfWeekDistribution[0]);

    // 8. Top Selling Products (Ranked by revenue & quantity)
    const topProductsRaw = db.prepare(`
      SELECT 
        oi.product_name,
        oi.product_id,
        COALESCE(p.category, 'General') as category,
        COALESCE(p.stock, 0) as current_stock,
        COALESCE(p.unit, 'pcs') as unit,
        SUM(oi.quantity) as total_qty,
        ROUND(SUM(oi.item_total), 2) as total_sales,
        ROUND(SUM(oi.item_total - (oi.cost_price * oi.quantity)), 2) as total_profit,
        COUNT(DISTINCT oi.order_id) as times_ordered
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
      LIMIT 15
    `).all().map(p => ({
      ...p,
      margin_percent: p.total_sales > 0 ? Number(((p.total_profit / p.total_sales) * 100).toFixed(1)) : 0
    }));

    // Champions: Volume Leader (highest units), Revenue Leader (highest ₹), Profit Leader (highest margin ₹)
    const highestSellingByUnits = [...topProductsRaw].sort((a, b) => b.total_qty - a.total_qty)[0] || null;
    const highestRevenueProduct = [...topProductsRaw].sort((a, b) => b.total_sales - a.total_sales)[0] || null;
    const highestProfitProduct = [...topProductsRaw].sort((a, b) => b.total_profit - a.total_profit)[0] || null;

    const champions = {
      byUnits: highestSellingByUnits,
      byRevenue: highestRevenueProduct,
      byProfit: highestProfitProduct
    };

    const topProducts = topProductsRaw;

    // 9. Slow-moving Products with 30-day stock velocity, times ordered, and days of stock left
    const slowProducts = db.prepare(`
      SELECT p.id, p.name, p.category, p.stock, p.unit, p.selling_price, p.cost_price, p.low_stock_threshold,
             COALESCE(SUM(oi.quantity), 0) as units_sold_30d,
             COUNT(DISTINCT oi.order_id) as times_ordered_30d
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id AND oi.order_id IN (
        SELECT id FROM orders 
        WHERE payment_status = 'PAID' AND datetime(created_at, 'localtime') <= datetime('now', 'localtime') AND date(created_at, 'localtime') >= date('now', 'localtime', '-29 days')
      )
      WHERE COALESCE(p.is_active, 1) = 1
      GROUP BY p.id
      ORDER BY units_sold_30d ASC, p.stock DESC
      LIMIT 8
    `).all().map(p => {
      const velocity = p.units_sold_30d / 30; // true 30-day daily run rate
      const daysOfStock = velocity > 0 ? Math.round(p.stock / velocity) : (p.stock > 0 ? 999 : 0);
      return {
        ...p,
        units_sold: p.units_sold_30d,
        times_ordered: p.times_ordered_30d || 0,
        days_of_stock: daysOfStock,
        needs_reorder: p.stock <= (p.low_stock_threshold || 5)
      };
    });

    // 10. Fast-mover Category performance & margin contribution
    const categorySalesRaw = db.prepare(`
      SELECT 
        COALESCE(p.category, 'General') as category,
        COUNT(DISTINCT oi.order_id) as orders_count,
        SUM(oi.quantity) as units_sold,
        ROUND(SUM(oi.item_total), 2) as revenue,
        ROUND(SUM(oi.item_total - (oi.cost_price * oi.quantity)), 2) as category_profit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
      GROUP BY category
      ORDER BY units_sold DESC, revenue DESC
    `).all();

    const categorySales = categorySalesRaw.map(c => ({
      ...c,
      percent: revenue > 0 ? Number(((c.revenue / revenue) * 100).toFixed(1)) : 0,
      margin_percent: c.revenue > 0 ? Number(((c.category_profit / c.revenue) * 100).toFixed(1)) : 0
    }));

    // 11. Payment Methods with fixed colors & consistency
    const paymentMethodsRaw = db.prepare(`
      SELECT 
        payment_method,
        COUNT(id) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM orders
      WHERE ${paidCondition}
      GROUP BY payment_method
    `).all();

    const PAYMENT_COLORS = {
      'UPI': '#2563EB',    // Blue
      'CASH': '#059669',   // Emerald
      'CARD': '#7C3AED',   // Purple
      'CREDIT': '#D97706'  // Amber
    };

    const paymentMethods = paymentMethodsRaw.map(pm => ({
      ...pm,
      color: PAYMENT_COLORS[pm.payment_method] || '#64748B',
      percent: revenue > 0 ? Number(((pm.total_amount / revenue) * 100).toFixed(1)) : 0
    }));

    // 12. Udhaar (Credit) Aging Buckets & Customer Accounts
    const udhaarRows = db.prepare(`
      SELECT 
        id,
        order_number,
        COALESCE(NULLIF(customer_name, ''), 'Walk-in Customer') as customer_name,
        COALESCE(customer_phone, '') as customer_phone,
        total_amount,
        created_at,
        CAST(julianday('now', 'localtime') - julianday(created_at, 'localtime') AS INTEGER) as age_days
      FROM orders
      WHERE payment_status = 'UNPAID'
      ORDER BY created_at ASC
    `).all();

    let aging_0_7 = 0;
    let aging_8_30 = 0;
    let aging_30_plus = 0;
    const udhaarCustomerMap = {};

    udhaarRows.forEach(r => {
      const key = `${r.customer_name}_${r.customer_phone}`;
      if (!udhaarCustomerMap[key]) {
        udhaarCustomerMap[key] = {
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          total_balance: 0,
          bills_count: 0,
          oldest_bill_date: r.created_at,
          max_age_days: r.age_days
        };
      }
      udhaarCustomerMap[key].total_balance += r.total_amount;
      udhaarCustomerMap[key].bills_count += 1;

      if (r.age_days <= 7) aging_0_7 += r.total_amount;
      else if (r.age_days <= 30) aging_8_30 += r.total_amount;
      else aging_30_plus += r.total_amount;
    });

    const udhaarCustomers = Object.values(udhaarCustomerMap).sort((a, b) => b.total_balance - a.total_balance);

    // 13. "Today at a Glance" Live Metrics (Regardless of period tab)
    const todayStats = db.prepare(`
      SELECT 
        COUNT(id) as today_orders,
        COALESCE(SUM(total_amount), 0) as today_revenue
      FROM orders 
      WHERE payment_status = 'PAID' AND date(created_at, 'localtime') = date('now', 'localtime')
    `).get();

    const yesterdayStats = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as yesterday_revenue
      FROM orders 
      WHERE payment_status = 'PAID' AND date(created_at, 'localtime') = date('now', 'localtime', '-1 day')
    `).get();

    const todayCost = db.prepare(`
      SELECT COALESCE(SUM(oi.cost_price * oi.quantity), 0) as today_cost
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'PAID' AND date(o.created_at, 'localtime') = date('now', 'localtime')
    `).get().today_cost;

    const todayGrossProfit = Number((todayStats.today_revenue - todayCost).toFixed(2));
    const todayMargin = todayStats.today_revenue > 0 ? Number(((todayGrossProfit / todayStats.today_revenue) * 100).toFixed(1)) : 0;
    const todayGrowth = yesterdayStats.yesterday_revenue > 0
      ? Number((((todayStats.today_revenue - yesterdayStats.yesterday_revenue) / yesterdayStats.yesterday_revenue) * 100).toFixed(1))
      : null;

    const todayPayments = db.prepare(`
      SELECT payment_method, COALESCE(SUM(total_amount), 0) as amount
      FROM orders
      WHERE payment_status = 'PAID' AND date(created_at, 'localtime') = date('now', 'localtime')
      GROUP BY payment_method
    `).all();
    const todayCash = (todayPayments.find(p => p.payment_method === 'CASH')?.amount) || 0;
    const todayUpi = (todayPayments.find(p => p.payment_method === 'UPI')?.amount) || 0;

    const todayUdhaar = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as amount, COUNT(id) as count
      FROM orders
      WHERE payment_status = 'UNPAID' AND date(created_at, 'localtime') = date('now', 'localtime')
    `).get();

    // 14. Inventory Health & Wholesalers
    const inventoryStats = db.prepare(`
      SELECT 
        COUNT(id) as total_sku_count,
        SUM(stock) as total_stock_units,
        SUM(stock * cost_price) as inventory_valuation,
        SUM(CASE WHEN stock <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM products
      WHERE COALESCE(is_active, 1) = 1
    `).get();

    const supplierSpending = db.prepare(`
      SELECT 
        COALESCE(supplier_name, 'Direct Wholesaler') as supplier,
        COUNT(id) as delivery_count,
        ROUND(SUM(quantity * cost_price), 2) as total_spent,
        SUM(quantity) as total_units_received
      FROM stock_logs
      WHERE change_type = 'STOCK_IN' AND supplier_name IS NOT NULL AND supplier_name != ''
      GROUP BY supplier
      ORDER BY total_spent DESC
      LIMIT 6
    `).all();

    const inventoryVal = inventoryStats.inventory_valuation || 1;
    let periodDays = 30;
    if (period === 'today') {
      periodDays = 1;
    } else if (period === 'week') {
      periodDays = 7;
    } else if (period === 'month') {
      const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      periodDays = Math.max(1, nowIST.getDate());
    } else if (period === 'custom' && isDate(startDate) && isDate(endDate)) {
      periodDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (24 * 60 * 60 * 1000)) + 1);
    } else {
      const firstOrder = db.prepare("SELECT MIN(date(created_at, 'localtime')) as first_date FROM orders WHERE payment_status = 'PAID'").get();
      if (firstOrder && firstOrder.first_date) {
        periodDays = Math.max(1, Math.round((Date.now() - new Date(firstOrder.first_date)) / (24 * 60 * 60 * 1000)));
      } else {
        periodDays = 30;
      }
    }
    const dailyCost = cost / periodDays;
    const daysOnHand = dailyCost > 0 ? Math.round(inventoryVal / dailyCost) : Math.round(inventoryVal / (cost || 1));
    const turnoverRatio = cost > 0 ? Number((cost / inventoryVal).toFixed(2)) : 0;

    // 15. Actionable Supplier Reorder List (grouped by wholesaler)
    const lowStockProducts = db.prepare(`
      SELECT p.*,
             COALESCE(s.supplier_name, 'Direct Wholesaler') as preferred_supplier
      FROM products p
      LEFT JOIN (
        SELECT product_id, supplier_name, MAX(created_at)
        FROM stock_logs 
        WHERE change_type = 'STOCK_IN' AND supplier_name IS NOT NULL AND supplier_name != ''
        GROUP BY product_id
      ) s ON p.id = s.product_id
      WHERE COALESCE(p.is_active, 1) = 1 AND p.stock <= (p.low_stock_threshold || 10)
      ORDER BY p.stock ASC
    `).all();

    const reorderGroups = {};
    lowStockProducts.forEach(p => {
      const sup = p.preferred_supplier || 'Direct Wholesaler';
      if (!reorderGroups[sup]) {
        reorderGroups[sup] = {
          supplier: sup,
          items: [],
          total_estimated_cost: 0
        };
      }
      const suggestedQty = Math.max((p.low_stock_threshold || 10) * 2 - Math.floor(p.stock), p.unit === 'kg' ? 10 : 12);
      const estCost = Number((suggestedQty * p.cost_price).toFixed(2));
      reorderGroups[sup].items.push({
        id: p.id,
        name: p.name,
        category: p.category,
        current_stock: p.stock,
        unit: p.unit,
        low_stock_threshold: p.low_stock_threshold,
        suggested_qty: suggestedQty,
        cost_price: p.cost_price,
        estimated_cost: estCost
      });
      reorderGroups[sup].total_estimated_cost += estCost;
    });
    const reorderList = Object.values(reorderGroups);

    res.json({
      period: period || 'week',
      periodLabel,
      todayAtAGlance: {
        today_revenue: Number(todayStats.today_revenue.toFixed(2)),
        yesterday_revenue: Number(yesterdayStats.yesterday_revenue.toFixed(2)),
        today_growth_percent: todayGrowth,
        today_orders: todayStats.today_orders,
        today_gross_profit: todayGrossProfit,
        today_margin: todayMargin,
        today_cash: Number(todayCash.toFixed(2)),
        today_upi: Number(todayUpi.toFixed(2)),
        today_udhaar_amount: Number(todayUdhaar.amount.toFixed(2)),
        today_udhaar_count: todayUdhaar.count
      },
      summary: {
        total_orders: summary.total_orders,
        total_revenue: Number(revenue.toFixed(2)),
        gross_profit: grossProfit,
        profit_margin: profitMargin,
        total_savings: Number(summary.total_savings.toFixed(2)),
        avg_order_value: avgOrderValue,
        total_items_sold: costSummary.total_items_sold,
        prev_revenue: prevRevenue !== null ? Number(prevRevenue.toFixed(2)) : null,
        growth_percent: growthPercent,
        avg_items_per_order: summary.total_orders > 0 ? Number((costSummary.total_items_sold / summary.total_orders).toFixed(1)) : 0
      },
      udhaar: {
        total_outstanding: Number((aging_0_7 + aging_8_30 + aging_30_plus).toFixed(2)),
        aging_0_7: Number(aging_0_7.toFixed(2)),
        aging_8_30: Number(aging_8_30.toFixed(2)),
        aging_30_plus: Number(aging_30_plus.toFixed(2)),
        customers: udhaarCustomers
      },
      inventory: {
        ...inventoryStats,
        turnover_ratio: turnoverRatio,
        days_on_hand: daysOnHand
      },
      salesTrend,
      heatmap: {
        max_bills: maxHeatmapBills,
        data: heatmap
      },
      topProducts,
      champions,
      slowProducts,
      reorderList,
      categorySales,
      supplierSpending,
      paymentMethods,
      hourlyDistribution,
      peakFootfallHour,
      peakRevenueHour,
      dayOfWeekDistribution,
      peakDay,
      peakRevenueDay
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order payment status (e.g. Udhaar / Credit settlement)
app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, upi_reference } = req.body;

    const ALLOWED_STATUS = ['PAID', 'UNPAID', 'CANCELLED'];
    if (payment_status && !ALLOWED_STATUS.includes(payment_status)) {
      return res.status(400).json({ error: `Invalid payment status. Allowed: ${ALLOWED_STATUS.join(', ')}` });
    }

    const ALLOWED_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'CREDIT', 'UDHAAR'];
    let finalMethod = undefined;
    if (payment_method) {
      const upper = payment_method.toString().toUpperCase().trim();
      if (!ALLOWED_PAYMENT_METHODS.includes(upper)) {
        return res.status(400).json({ error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}` });
      }
      finalMethod = (upper === 'CREDIT' || upper === 'UDHAAR') ? 'UDHAAR' : upper;
    }

    const stmt = db.prepare(`
      UPDATE orders 
      SET payment_status = COALESCE(?, payment_status), 
          payment_method = COALESCE(?, payment_method),
          upi_reference = COALESCE(?, upi_reference)
      WHERE id = ? OR order_number = ?
    `);

    stmt.run(payment_status, finalMethod, upi_reference, id, id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);
    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', sensitiveActionLimiter, requireManagerPin, (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.payment_status === 'CANCELLED') {
      return res.status(400).json({ error: 'Order is already marked as CANCELLED' });
    }

    // Restock items back into inventory
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const restockTx = db.transaction(() => {
      const updateStockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      const logStmt = db.prepare("INSERT INTO stock_logs (product_id, change_type, quantity, notes) VALUES (?, 'RETURN', ?, ?)");

      for (const it of items) {
        if (it.product_id) {
          updateStockStmt.run(it.quantity, it.product_id);
          logStmt.run(it.product_id, it.quantity, `Order ${order.order_number} cancelled`);
        }
      }

      // Soft-cancel: preserve audit trail with payment_status = 'CANCELLED'
      db.prepare(`
        UPDATE orders 
        SET payment_status = 'CANCELLED',
            cashier_notes = CASE WHEN cashier_notes IS NULL OR cashier_notes = '' 
                                 THEN 'Order cancelled & restocked' 
                                 ELSE cashier_notes || ' [Order cancelled & restocked]' END
        WHERE id = ?
      `).run(order.id);
    });

    restockTx();
    res.json({ success: true, message: `Order ${order.order_number} cancelled and items restocked to inventory` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- DATABASE BACKUP & RESTORE API -----------------
app.get('/api/backup/download', requireManagerPin, (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, 'retail_pos.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found on server' });
    }
    const dateStr = getTodayISTDateStr();
    res.setHeader('Content-Disposition', `attachment; filename="mani_devi_retail_backup_${dateStr}.db"`);
    res.setHeader('Content-Type', 'application/vnd.sqlite3');
    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend and public assets
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, '../frontend/dist');

const staticDir = fs.existsSync(path.join(publicPath, 'index.html'))
  ? publicPath
  : (fs.existsSync(path.join(distPath, 'index.html')) ? distPath : null);

if (staticDir) {
  console.log(`Serving web app from: ${staticDir}`);
  // Serve static hashed assets with caching, but index.html without caching
  app.use(express.static(staticDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(path.join(staticDir, 'index.html'));
    }
    next();
  });
} else {
  console.warn('Warning: No index.html found in public or frontend/dist');
}

app.listen(PORT, () => {
  console.log(`Retail POS Server running on http://localhost:${PORT}`);
});

