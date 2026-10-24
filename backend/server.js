process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.post('/api/settings', (req, res) => {
  try {
    const updateStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    const updateMany = db.transaction((settingsObj) => {
      for (const [key, val] of Object.entries(settingsObj)) {
        updateStmt.run(key, String(val));
      }
    });
    updateMany(req.body);
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

app.delete('/api/products/:id', (req, res) => {
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
app.post('/api/orders', (req, res) => {
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

    // Determine payment status (whitelist to PAID or UNPAID)
    let finalPaymentStatus = 'PAID';
    if (payment_method === 'CREDIT' || payment_status === 'UNPAID') {
      finalPaymentStatus = 'UNPAID';
    } else if (payment_status === 'PAID') {
      finalPaymentStatus = 'PAID';
    }

    const createOrderTx = db.transaction(() => {
      const dateStr = getTodayISTDateStr();

      const orderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, total_mrp, subtotal, 
          discount, total_amount, total_savings, payment_method, payment_status, 
          upi_reference, cashier_notes
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
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
            payment_method || 'UPI',
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
      WHERE 1=1
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
    const { period } = req.query; // 'today', 'week', 'month', 'all'

    // Only count completed PAID orders for revenue and profit metrics
    let paidCondition = "payment_status = 'PAID'";
    if (period === 'today') {
      paidCondition += " AND date(created_at, 'localtime') = date('now', 'localtime')";
    } else if (period === 'week') {
      paidCondition += " AND date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')";
    } else if (period === 'month') {
      paidCondition += " AND date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
    }

    // Summary Totals for Paid orders
    const summary = db.prepare(`
      SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_mrp), 0) as total_mrp,
        COALESCE(SUM(total_savings), 0) as total_savings
      FROM orders
      WHERE ${paidCondition}
    `).get();

    // Unpaid credit / Udhaar tracking
    const unpaidStats = db.prepare(`
      SELECT 
        COUNT(id) as unpaid_orders_count,
        COALESCE(SUM(total_amount), 0) as unpaid_credit_amount
      FROM orders
      WHERE payment_status = 'UNPAID'
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
    // Real profit calculation (no Math.max(0, ...) clamp so negative profits / losses are visible)
    const profit = Number((revenue - cost).toFixed(2));
    const profitMargin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;
    const avgOrderValue = summary.total_orders > 0 ? Number((revenue / summary.total_orders).toFixed(1)) : 0;

    // Dynamic Sales Trend based on chosen period (Paid orders only)
    let salesTrend = [];
    if (period === 'today') {
      salesTrend = db.prepare(`
        SELECT 
          strftime('%H:00', created_at, 'localtime') as label,
          COUNT(id) as orders_count,
          ROUND(COALESCE(SUM(total_amount), 0), 2) as revenue
        FROM orders
        WHERE ${paidCondition}
        GROUP BY strftime('%H', created_at, 'localtime')
        ORDER BY strftime('%H', created_at, 'localtime') ASC
      `).all();
    } else if (period === 'week' || period === 'month') {
      salesTrend = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', created_at, 'localtime') as date,
          strftime('%d %b', created_at, 'localtime') as label,
          COUNT(id) as orders_count,
          ROUND(COALESCE(SUM(total_amount), 0), 2) as revenue
        FROM orders
        WHERE ${paidCondition}
        GROUP BY strftime('%Y-%m-%d', created_at, 'localtime')
        ORDER BY date ASC
      `).all();
    } else {
      salesTrend = db.prepare(`
        SELECT 
          strftime('%Y-%m-%d', created_at, 'localtime') as date,
          strftime('%d %b', created_at, 'localtime') as label,
          COUNT(id) as orders_count,
          ROUND(COALESCE(SUM(total_amount), 0), 2) as revenue
        FROM orders
        WHERE ${paidCondition}
        GROUP BY strftime('%Y-%m-%d', created_at, 'localtime')
        ORDER BY date ASC
      `).all();
    }

    // Hourly distribution & Peak Hours calculation (8:00 AM - 10:00 PM in IST)
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

    const hourlyDistribution = [];
    for (let h = 8; h <= 22; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayHour} ${ampm}`;
      const found = hoursMap[h];
      hourlyDistribution.push({
        hour: h,
        label,
        orders_count: found ? found.orders_count : 0,
        revenue: found ? found.revenue : 0
      });
    }

    const peakHour = hourlyDistribution.reduce((max, h) => (h.revenue > (max?.revenue || 0) ? h : max), hourlyDistribution[0]);

    // Day of Week distribution & Peak Days calculation (Monday to Sunday)
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

    const daysInfo = [
      { dow: 1, name: 'Monday', short: 'Mon' },
      { dow: 2, name: 'Tuesday', short: 'Tue' },
      { dow: 3, name: 'Wednesday', short: 'Wed' },
      { dow: 4, name: 'Thursday', short: 'Thu' },
      { dow: 5, name: 'Friday', short: 'Fri' },
      { dow: 6, name: 'Saturday', short: 'Sat' },
      { dow: 0, name: 'Sunday', short: 'Sun' },
    ];

    const dowMap = {};
    dowRaw.forEach(d => { dowMap[d.dow] = d; });

    const dayOfWeekDistribution = daysInfo.map(d => {
      const found = dowMap[d.dow];
      return {
        day_index: d.dow,
        day_name: d.name,
        day_short: d.short,
        orders_count: found ? found.orders_count : 0,
        revenue: found ? found.revenue : 0
      };
    });

    const peakDay = dayOfWeekDistribution.reduce((max, d) => (d.revenue > (max?.revenue || 0) ? d : max), dayOfWeekDistribution[0]);

    // Top Selling Products (from Paid orders)
    const topProducts = db.prepare(`
      SELECT 
        oi.product_name,
        COALESCE(p.category, 'General') as category,
        SUM(oi.quantity) as total_qty,
        SUM(oi.item_total) as total_sales,
        SUM(oi.item_total - (oi.cost_price * oi.quantity)) as total_profit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
      LIMIT 10
    `).all();

    // Payment methods distribution (shows Cash, UPI, Card and unpaid credit breakdown)
    const paymentMethods = db.prepare(`
      SELECT 
        payment_method,
        COUNT(id) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM orders
      WHERE ${paidCondition}
      GROUP BY payment_method
    `).all();

    // Inventory status summary
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

    // 1. Sales Growth Comparison with previous period (Paid orders only)
    let prevCondition = "payment_status = 'PAID' AND 1=0";
    if (period === 'today') {
      prevCondition = "payment_status = 'PAID' AND date(created_at, 'localtime') = date('now', 'localtime', '-1 day')";
    } else if (period === 'week') {
      prevCondition = "payment_status = 'PAID' AND date(created_at, 'localtime') >= date('now', 'localtime', '-13 days') AND date(created_at, 'localtime') < date('now', 'localtime', '-6 days')";
    } else if (period === 'month') {
      prevCondition = "payment_status = 'PAID' AND date(created_at, 'localtime') >= date('now', 'localtime', 'start of month', '-1 month') AND date(created_at, 'localtime') < date('now', 'localtime', 'start of month')";
    }
    const prevSummary = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as prev_revenue FROM orders WHERE ${prevCondition}`).get();
    const prevRevenue = prevSummary ? prevSummary.prev_revenue : 0;
    const growthPercent = prevRevenue > 0 ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : (revenue > 0 ? 100 : 0);

    // 2. Category-wise sales breakdown (Paid orders only)
    const categorySalesRaw = db.prepare(`
      SELECT 
        COALESCE(p.category, 'General') as category,
        COUNT(DISTINCT oi.order_id) as orders_count,
        SUM(oi.quantity) as units_sold,
        ROUND(SUM(oi.item_total), 2) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${paidCondition.replace(/payment_status/g, 'o.payment_status').replace(/created_at/g, 'o.created_at')}
      GROUP BY category
      ORDER BY revenue DESC
    `).all();

    const categorySales = categorySalesRaw.map(c => ({
      ...c,
      percent: revenue > 0 ? Number(((c.revenue / revenue) * 100).toFixed(1)) : 0
    }));

    // 3. Slow-moving / dead stock products
    const slowProducts = db.prepare(`
      SELECT p.id, p.name, p.category, p.stock, p.unit, p.selling_price, p.image_url,
             COALESCE(SUM(oi.quantity), 0) as units_sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id AND oi.order_id IN (SELECT id FROM orders WHERE ${paidCondition})
      WHERE COALESCE(p.is_active, 1) = 1
      GROUP BY p.id
      ORDER BY units_sold ASC, p.stock DESC
      LIMIT 5
    `).all();

    // 4. Supplier / Wholesaler purchase spending analytics
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

    // 5. Inventory turnover ratio & Days on hand
    const inventoryVal = inventoryStats.inventory_valuation || 1;
    const turnoverRatio = cost > 0 ? Number((cost / inventoryVal).toFixed(2)) : 0;
    const periodDays = period === 'today' ? 1 : (period === 'week' ? 7 : (period === 'month' ? 30 : 90));
    const dailyCost = cost / periodDays;
    const daysOnHand = dailyCost > 0 ? Math.round(inventoryVal / dailyCost) : Math.round(inventoryVal / (cost || 1));

    res.json({
      period: period || 'all',
      summary: {
        total_orders: summary.total_orders,
        total_revenue: Number(revenue.toFixed(2)),
        total_profit: Number(profit.toFixed(2)),
        profit_margin: Number(profitMargin),
        total_savings: Number(summary.total_savings.toFixed(2)),
        avg_order_value: Number(avgOrderValue),
        total_items_sold: costSummary.total_items_sold,
        prev_revenue: Number(prevRevenue.toFixed(2)),
        growth_percent: growthPercent,
        avg_items_per_order: summary.total_orders > 0 ? Number((costSummary.total_items_sold / summary.total_orders).toFixed(1)) : 0,
        unpaid_credit_orders: unpaidStats.unpaid_orders_count || 0,
        unpaid_credit_amount: Number((unpaidStats.unpaid_credit_amount || 0).toFixed(2))
      },
      inventory: {
        ...inventoryStats,
        turnover_ratio: turnoverRatio,
        days_on_hand: daysOnHand
      },
      salesTrend,
      topProducts,
      slowProducts,
      categorySales,
      supplierSpending,
      paymentMethods,
      hourlyDistribution,
      peakHour,
      dayOfWeekDistribution,
      peakDay
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

    const stmt = db.prepare(`
      UPDATE orders 
      SET payment_status = ?, 
          payment_method = COALESCE(?, payment_method),
          upi_reference = COALESCE(?, upi_reference)
      WHERE id = ? OR order_number = ?
    `);

    stmt.run(payment_status, payment_method, upi_reference, id, id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);
    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

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

      db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
    });

    restockTx();
    res.json({ success: true, message: 'Order cancelled and stock restored successfully' });
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
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
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

