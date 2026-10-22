# SmartMart Retail POS, Inventory & Business Analytics System 🛒

A complete, lightweight **Point of Sale (POS), Inventory Control, and Daily/Weekly/Monthly Business Analytics System** designed specifically for small grocery stores, kirana shops, and mini-supermarkets.

Featuring a **DMart-style billing receipt format**, real-time **Dynamic UPI QR Code generation**, and permanent order archiving with **WhatsApp digital bill sharing** (no thermal printer hardware required).

---

## 🌟 Key Features

### 1. ⚡ Fast Cashier Billing Counter (DMart Style)
- **Keyboard-First Workflow**: Use `F2` to jump to search/barcode scan, `Enter` to add to cart, and `F8` to finalize checkout.
- **Loose & Packaged Goods**: Supports standard items (`pcs`, `pkt`, `box`) and loose items sold by weight (`kg`, `g`, `ltr`).
- **DMart Savings Calculation**: Automatically compares MRP vs. Store Selling Rate and highlights:
  > **"🎉 Customer Total Savings: ₹XXX.XX (XX% OFF)"**
- **Automatic Order ID**: Sequenced daily invoice format (e.g. `DM-20261013-0001`).

### 2. 📱 Dynamic UPI QR Code Generation & Checkout
- **Instant Customer UPI QR**: Generates dynamic Indian UPI payment QR code (`upi://pay?pa=...&am=...&pn=...`) with the exact payable amount and invoice number.
- **Customer Scans Directly**: Supports Google Pay, PhonePe, Paytm, BHIM, and Cred.
- **Multi-Method Support**: Toggle easily between **UPI QR**, **Cash** (with quick tender buttons and automatic change calculator), and **Card/POS Terminal**.
- **Configurable UPI ID**: Set your shop's UPI VPA in Settings (e.g. `yourstore@okaxis`).

### 3. 🧾 DMart-Style Digital Bills ("Save for Later" & WhatsApp Sharing)
- **No Thermal Machine Needed**: Since small shops don't always have expensive thermal hardware, bills are saved permanently in the local SQLite database.
- **1-Click WhatsApp Bill**: Sends a formatted, itemized digital receipt directly to the customer's WhatsApp (`https://wa.me/91...`).
- **Print / Save as PDF**: Clean, printer-ready receipt slip layout for standard A4 or slip printing.
- **Bills History**: Search, filter, and review any past bill by invoice ID, date, customer name, or phone.

### 4. 📦 Inventory & Stock Management
- **Incoming Stock Entry (Stock-In)**: Log new stock deliveries from suppliers with vendor name, invoice number, and purchase cost.
- **Leftover Stock Tracking**: Real-time stock counts with color-coded badges (`In Stock`, `Low Stock`, `Out of Stock`).
- **Stock Valuation**: Shows total capital invested at cost price and retail potential.
- **Stock Movement Logs**: Complete audit trail of stock received vs sold in customer orders.

### 5. 📊 Business Analytics (Daily, Weekly, Monthly)
- **Time Filters**: Inspect **Today (Daily)**, **Last 7 Days (Weekly)**, **This Month (Monthly)**, or **All Time**.
- **Key Financial KPIs**:
  - Gross Sales Revenue
  - Estimated Net Profit & Profit Margin %
  - Total Invoices / Billed Orders
  - Average Basket Size (Ticket Size)
  - Total Customer Savings Provided
- **Interactive Visualizations**:
  - Daily Revenue Trend Area Chart
  - Payment Method Breakdown (UPI vs Cash vs Card)
  - Top 10 Best-Selling Products by units and revenue
- **CSV Data Export**: Export daily/monthly sales data with one click for accounting.

---

## 🚀 How to Run the Application

### Option A: Using Windows Batch Script (Fastest)
Double-click `start.bat` in the `retail-pos-system` folder. It will automatically launch the backend server and frontend client.

### Option B: Using Terminal Commands

#### 1. Start the Backend API (Port 5000)
```bash
cd backend
node server.js
```

#### 2. Start the Frontend Web App (Port 3000)
```bash
cd frontend
npm run dev
```

Open your browser and navigate to:
👉 **http://localhost:3000**

---

## 🛠️ Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts, `qrcode.react`
- **Backend**: Node.js, Express.js
- **Database**: SQLite with `better-sqlite3` (zero cloud lock-in, ultra-fast, local-first)
