const db = require('./database');

function seedHistoricalSales() {
  const existingOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (existingOrders > 0) {
    console.log(`Already have ${existingOrders} orders in database. Skipping sample sales seeding.`);
    return;
  }

  console.log('Seeding historical retail sales data...');

  const products = db.prepare('SELECT * FROM products').all();
  if (products.length === 0) return;

  const paymentModes = ['UPI', 'UPI', 'UPI', 'CASH', 'CASH', 'CARD'];
  const customers = [
    { name: 'Ramesh Patel', phone: '9820112233' },
    { name: 'Priya Sharma', phone: '9876543210' },
    { name: 'Amit Kulkarni', phone: '9890123456' },
    { name: 'Sunita Verma', phone: '9765432190' },
    { name: 'Deepak Deshmukh', phone: '9988776655' },
    { name: 'Neha Gupta', phone: '9822334455' },
    { name: 'Walk-in Customer', phone: '' },
    { name: 'Walk-in Customer', phone: '' }
  ];

  const now = new Date();

  // Create sample orders across past 14 days
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, total_mrp, subtotal, 
      discount, total_amount, total_savings, payment_method, payment_status, 
      upi_reference, cashier_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (
      order_id, product_id, product_name, barcode, unit, quantity, 
      cost_price, mrp, selling_price, item_total, savings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let orderCount = 0;

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    // Generate between 3 to 6 orders per day
    const ordersPerDay = 3 + (dayOffset % 4);

    for (let o = 1; o <= ordersPerDay; o++) {
      orderCount++;
      const orderDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      orderDate.setHours(9 + (o * 2) % 12, (o * 17) % 60, 0);
      const isoDate = orderDate.toISOString().replace('T', ' ').substring(0, 19);

      const dateStr = orderDate.toISOString().slice(0, 10).replace(/-/g, '');
      const orderNumber = `DM-${dateStr}-${String(o).padStart(4, '0')}`;

      const cust = customers[(orderCount + dayOffset) % customers.length];
      const payMode = paymentModes[(orderCount + o) % paymentModes.length];

      // Pick 2 to 5 random products for this basket
      const numItems = 2 + (o % 4);
      const selectedProducts = [];
      for (let i = 0; i < numItems; i++) {
        const prod = products[(orderCount * 3 + i * 2) % products.length];
        if (!selectedProducts.find(p => p.id === prod.id)) {
          selectedProducts.push(prod);
        }
      }

      let totalMrp = 0;
      let subtotal = 0;
      const itemsData = [];

      for (const prod of selectedProducts) {
        const qty = prod.unit === 'kg' ? 1 + (o % 3) * 0.5 : 1 + (o % 2);
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
      const upiRef = payMode === 'UPI' ? `UPI/${orderDate.getTime().toString().slice(-8)}` : null;

      const res = insertOrder.run(
        orderNumber,
        cust.name,
        cust.phone,
        totalMrp,
        subtotal,
        0,
        totalAmount,
        totalSavings,
        payMode,
        upiRef,
        'Regular checkout',
        isoDate
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
    }
  }

  console.log(`Successfully seeded ${orderCount} historical orders.`);
}

seedHistoricalSales();
