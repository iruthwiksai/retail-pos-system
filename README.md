# VijayaLakshmi Minimart — Retail POS, Inventory & Business Analytics System 🛒

A complete, lightweight **Point of Sale (POS), Inventory Control, and Daily/Weekly/Monthly Business Analytics System** designed specifically for small grocery stores, kirana shops, and mini-supermarkets.

Featuring a **retail cash memo receipt format**, real-time **Dynamic UPI QR Code generation**, MRP-based **customer savings calculation**, Udhaar/credit management, and permanent order archiving with **WhatsApp digital bill sharing** (no thermal printer hardware required).

---

## 🌟 Key Features

### 1. ⚡ Fast Cashier Billing Counter
- **Keyboard-First Workflow**: Use `F2` to jump to search/barcode scan, `Enter` to add to cart, and `F8` to finalize checkout.
- **Loose & Packaged Goods**: Supports standard items (`pcs`, `pkt`, `box`) and loose items sold by weight (`kg`, `g`, `ltr`).
- **Real MRP Savings Calculation**: Automatically compares MRP vs. Store Selling Rate and calculates:
  > **"🎉 Customer Total Savings: ₹XXX.XX"**
- **Automatic Order ID**: Sequenced daily invoice format (e.g. `VL-20261024-0001`).

### 2. 📱 Dynamic UPI QR Code Generation & Checkout
- **Instant Customer UPI QR**: Generates dynamic Indian UPI payment QR code (`upi://pay?pa=...&am=...&pn=...`) with the exact payable amount and invoice number.
- **Customer Scans Directly**: Supports Google Pay, PhonePe, Paytm, BHIM, and Cred.
- **Multi-Method Support**: Toggle easily between **UPI QR**, **Cash** (with quick tender buttons and automatic change calculator), **Card**, and **Udhaar / Credit**.
- **Configurable UPI ID**: Set your shop's UPI VPA in Settings (e.g. `vijayalakshmi@upi`).

### 3. 🧾 Digital Bills ("Save for Later" & WhatsApp Sharing)
- **No Thermal Machine Needed**: Since small shops don't always have expensive thermal hardware, bills are saved permanently in the local SQLite database.
- **1-Click WhatsApp Bill**: Sends a formatted, itemized digital receipt directly to the customer's WhatsApp (`https://wa.me/91...`).
- **Print / Save as PDF**: Clean, printer-ready receipt slip layout with customer savings breakdown.
- **Bills History**: Search, filter, and review any past bill by invoice ID, date, customer name, or phone. Settle unpaid Udhaar bills directly.

### 4. 📦 Inventory & Stock Management
- **Incoming Stock Entry (Stock-In)**: Log new stock deliveries from suppliers with vendor name, invoice number, and purchase cost.
- **Leftover Stock Tracking**: Real-time stock counts with color-coded badges (`In Stock`, `Low Stock`, `Out of Stock`).
- **Stock Valuation**: Shows total capital invested at cost price and retail potential.
- **Stock Movement Logs**: Complete audit trail of stock received vs sold in customer orders.

### 5. 📊 Business Intelligence & Analytics (15 Core Retail KPIs)
- **Time Filters**: Inspect **Today (Daily)**, **Last 7 Days (Weekly)**, **This Month (Monthly)**, or **All Time**.
- **Executive Overview & Deep Dives**:
  - Gross Sales Revenue & Growth % vs previous period
  - True Net Profit & Gross Profit Margin %
  - Average Order Value & Basket Size (Units per Bill)
  - Peak Footfall Hours (8:00 AM – 10:00 PM) & Peak Sales Days
  - Category-Wise Revenue & Volume Breakdown
  - Best-Selling Fast Movers vs. Slow-Moving Dead Stock Alerts
  - Inventory Turnover Ratio & Days on Hand
  - Wholesaler & Supplier Purchase Spending Analytics
  - Payment Method Breakdown (Cash vs UPI vs Card) & Outstanding Udhaar Credit Tracking
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
