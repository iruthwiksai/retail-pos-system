const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to generate formatted Order ID (VijayaLakshmi Minimart: VL-YYYYMMDD-XXXX)
function generateOrderNumber(offset = 0) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at, 'localtime') = date('now', 'localtime')").get();
  const seq = String(countRow.count + 1 + offset).padStart(4, '0');
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
    let query = 'SELECT * FROM products WHERE 1=1';
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
    const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category ASC').all();
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
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- INVENTORY / STOCK-IN API -----------------
app.post('/api/inventory/stock-in', (req, res) => {
  try {
    const { product_id, quantity, cost_price, supplier_name, invoice_no, notes } = req.body;
    if (!product_id || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Valid product and quantity are required' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const qty = Number(quantity);
    const newStock = product.stock + qty;
    const newCost = cost_price !== undefined && cost_price !== '' ? Number(cost_price) : product.cost_price;

    const performStockIn = db.transaction(() => {
      db.prepare(`
        UPDATE products 
        SET stock = ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, newCost, product_id);

      db.prepare(`
        INSERT INTO stock_logs (product_id, change_type, quantity, cost_price, supplier_name, invoice_no, notes)
        VALUES (?, 'STOCK_IN', ?, ?, ?, ?, ?)
      `).run(product_id, qty, newCost, supplier_name || 'Vendor', invoice_no || '', notes || '');
    });

    performStockIn();

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    res.json({ success: true, product: updatedProduct, newStock });
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
    const { items, customer_name, customer_phone, payment_method, upi_reference, cashier_notes, order_number } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const orderNumber = order_number && order_number.trim() ? order_number.trim() : generateOrderNumber();
    let subtotal = 0;
    let totalCost = 0;

    const preparedItems = items.map(item => {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!p) throw new Error(`Product not found with ID ${item.product_id}`);

      const qty = Number(item.quantity);
      if (qty <= 0) throw new Error(`Invalid quantity for ${p.name}`);
      if (p.stock < qty) {
        throw new Error(`Insufficient stock for "${p.name}". Available: ${p.stock}, Requested: ${qty}`);
      }

      const sellingPrice = Number(item.selling_price !== undefined ? item.selling_price : p.selling_price);
      const costPrice = Number(p.cost_price);
      const itemTotal = Number((sellingPrice * qty).toFixed(2));

      subtotal += itemTotal;
      totalCost += costPrice * qty;

      return {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        unit: p.unit,
        quantity: qty,
        cost_price: costPrice,
        mrp: sellingPrice,
        selling_price: sellingPrice,
        item_total: itemTotal,
        savings: 0
      };
    });

    const finalTotal = Number(subtotal.toFixed(2));

    const createOrderTx = db.transaction(() => {
      const orderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, total_mrp, subtotal, 
          discount, total_amount, total_savings, payment_method, payment_status, 
          upi_reference, cashier_notes
        ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, 'PAID', ?, ?)
      `);

      const orderResult = orderStmt.run(
        orderNumber,
        customer_name || 'Walk-in Customer',
        customer_phone || '',
        finalTotal,
        finalTotal,
        finalTotal,
        payment_method || 'UPI',
        upi_reference || '',
        cashier_notes || ''
      );

      const orderId = orderResult.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, barcode, unit, quantity, 
          cost_price, mrp, selling_price, item_total, savings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products 
        SET stock = MAX(0, stock - ?), updated_at = CURRENT_TIMESTAMP
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
          item.item_total
        );

        updateStockStmt.run(item.quantity, item.product_id);
        stockLogStmt.run(item.product_id, -item.quantity, item.cost_price, `Sold in ${orderNumber}`);
      }

      return orderId;
    });

    const newOrderId = createOrderTx();

    const fullOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(newOrderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(newOrderId);

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

    let dateCondition = "1=1";
    if (period === 'today') {
      dateCondition = "date(created_at, 'localtime') = date('now', 'localtime')";
    } else if (period === 'week') {
      dateCondition = "date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')";
    } else if (period === 'month') {
      dateCondition = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
    }

    // Summary Totals
    const summary = db.prepare(`
      SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_mrp), 0) as total_mrp,
        COALESCE(SUM(total_savings), 0) as total_savings
      FROM orders
      WHERE ${dateCondition}
    `).get();

    // Cost & Profit calculation
    const costSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(oi.cost_price * oi.quantity), 0) as total_cost,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE ${dateCondition.replace(/created_at/g, 'o.created_at')}
    `).get();

    const revenue = summary.total_revenue;
    const cost = costSummary.total_cost;
    const profit = Math.max(0, revenue - cost);
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
    const avgOrderValue = summary.total_orders > 0 ? (revenue / summary.total_orders).toFixed(1) : 0;

    // Daily Sales Trend for chart
    const salesTrend = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d', created_at, 'localtime') as date,
        strftime('%d %b', created_at, 'localtime') as label,
        COUNT(id) as orders_count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-29 days')
      GROUP BY strftime('%Y-%m-%d', created_at, 'localtime')
      ORDER BY date ASC
    `).all();

    // Top Selling Products
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
      WHERE ${dateCondition.replace(/created_at/g, 'o.created_at')}
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
      LIMIT 10
    `).all();

    // Payment methods distribution
    const paymentMethods = db.prepare(`
      SELECT 
        payment_method,
        COUNT(id) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM orders
      WHERE ${dateCondition}
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
    `).get();

    res.json({
      period: period || 'all',
      summary: {
        total_orders: summary.total_orders,
        total_revenue: Number(revenue.toFixed(2)),
        total_profit: Number(profit.toFixed(2)),
        profit_margin: Number(profitMargin),
        total_savings: Number(summary.total_savings.toFixed(2)),
        avg_order_value: Number(avgOrderValue),
        total_items_sold: costSummary.total_items_sold
      },
      inventory: inventoryStats,
      salesTrend,
      topProducts,
      paymentMethods
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
      const logStmt = db.prepare('INSERT INTO stock_logs (product_id, change_type, quantity, notes) VALUES (?, "RETURN", ?, ?)');

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

// Serve static assets from backend public folder
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Serve built frontend files in production if dist exists
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  console.log(`Retail POS Server running on http://localhost:${PORT}`);
});

