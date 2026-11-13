import type { Customer, Expense, Platform, PlatformId, PlatformOrder, Product, SyncLog } from './types'

const ALL: PlatformId[] = ['amazon', 'flipkart', 'myntra', 'nykaa', 'meesho', 'blinkit']

export const categories = ['Smartphones', 'Audio', 'Wearables', 'Accessories', 'Chargers'] as const
export const brands = ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Nothing', 'boAt', 'MOBI', 'Anker']

export const initialProducts: Product[] = [
  { id: 'p1', name: 'iPhone 16 (128GB)', sku: 'IP16-128', barcode: '8901234560011', category: 'Smartphones', brand: 'Apple', price: 79900, cost: 72500, stock: 24, reserved: 2, reorderLevel: 8, description: 'A18 chip, 6.1-inch Super Retina XDR display, 48MP Fusion camera.', platforms: ['amazon', 'flipkart'] },
  { id: 'p2', name: 'Samsung Galaxy S25 (256GB)', sku: 'S25-256', barcode: '8901234560028', category: 'Smartphones', brand: 'Samsung', price: 80999, cost: 73200, stock: 16, reserved: 1, reorderLevel: 6, description: 'Snapdragon 8 Elite, 6.2-inch Dynamic AMOLED 2X, Galaxy AI.', platforms: ['amazon', 'flipkart', 'meesho'] },
  { id: 'p3', name: 'OnePlus 13 (256GB)', sku: 'OP13-256', barcode: '8901234560035', category: 'Smartphones', brand: 'OnePlus', price: 69999, cost: 62800, stock: 5, reserved: 0, reorderLevel: 6, description: 'Hasselblad camera system, 6000mAh battery, 100W SUPERVOOC.', platforms: ['amazon', 'flipkart'] },
  { id: 'p4', name: 'Nothing Phone (3a)', sku: 'NP3A-128', barcode: '8901234560042', category: 'Smartphones', brand: 'Nothing', price: 24999, cost: 21400, stock: 12, reserved: 1, reorderLevel: 5, description: 'Glyph interface, 120Hz AMOLED and a 50MP triple camera.', platforms: ['flipkart'] },
  { id: 'p5', name: 'Redmi Note 14 Pro (128GB)', sku: 'RN14P-128', barcode: '8901234560059', category: 'Smartphones', brand: 'Xiaomi', price: 23999, cost: 20100, stock: 0, reserved: 0, reorderLevel: 6, description: '200MP camera, 1.5K curved AMOLED, IP68.', platforms: ['amazon', 'flipkart', 'meesho'] },
  { id: 'p6', name: 'Wireless Headphones', sku: 'WH-1001', barcode: '8901234560066', category: 'Audio', brand: 'MOBI', price: 2499, cost: 1450, stock: 62, reserved: 4, reorderLevel: 15, description: 'Premium wireless headphones with noise cancellation.', platforms: ALL },
  { id: 'p7', name: 'boAt Airdopes 141', sku: 'BA-141', barcode: '8901234560073', category: 'Audio', brand: 'boAt', price: 1299, cost: 820, stock: 88, reserved: 6, reorderLevel: 20, description: 'True wireless earbuds with 42 hours of playback.', platforms: ['amazon', 'flipkart', 'myntra', 'meesho', 'blinkit'] },
  { id: 'p8', name: 'Smart Watch Pro', sku: 'SW-2030', barcode: '8901234560080', category: 'Wearables', brand: 'MOBI', price: 4999, cost: 3100, stock: 34, reserved: 3, reorderLevel: 10, description: '1.96-inch AMOLED, Bluetooth calling and 7-day battery.', platforms: ['amazon', 'flipkart', 'myntra', 'nykaa'] },
  { id: 'p9', name: 'Galaxy Watch 7 (44mm)', sku: 'GW7-44', barcode: '8901234560097', category: 'Wearables', brand: 'Samsung', price: 29999, cost: 26200, stock: 7, reserved: 0, reorderLevel: 4, description: 'BioActive sensor, dual-frequency GPS, Wear OS.', platforms: ['amazon', 'flipkart'] },
  { id: 'p10', name: 'Phone Case (Black)', sku: 'CASE-001', barcode: '8901234560103', category: 'Accessories', brand: 'MOBI', price: 599, cost: 180, stock: 140, reserved: 8, reorderLevel: 30, description: 'Shock-absorbing matte case with raised camera lip.', platforms: ALL },
  { id: 'p11', name: 'Phone Case — Silicone', sku: 'CASE-455', barcode: '8901234560110', category: 'Accessories', brand: 'MOBI', price: 799, cost: 240, stock: 54, reserved: 4, reorderLevel: 20, description: 'Soft-touch liquid silicone case with microfibre lining.', platforms: ['amazon', 'flipkart', 'meesho'] },
  { id: 'p12', name: 'Screen Guard', sku: 'SG-100', barcode: '8901234560127', category: 'Accessories', brand: 'MOBI', price: 490, cost: 90, stock: 210, reserved: 12, reorderLevel: 40, description: '9H tempered glass with oleophobic coating.', platforms: ['amazon', 'flipkart', 'meesho', 'blinkit'] },
  { id: 'p13', name: 'Anker 20W USB-C Charger', sku: 'ANK-20W', barcode: '8901234560134', category: 'Chargers', brand: 'Anker', price: 1499, cost: 940, stock: 9, reserved: 1, reorderLevel: 12, description: 'Compact fast charger with PowerIQ 3.0.', platforms: ['amazon', 'flipkart', 'blinkit'] },
  { id: 'p14', name: 'MOBI 10000mAh Power Bank', sku: 'PB-10K', barcode: '8901234560141', category: 'Chargers', brand: 'MOBI', price: 1899, cost: 1120, stock: 41, reserved: 2, reorderLevel: 10, description: '22.5W fast charging with dual output.', platforms: ['amazon', 'flipkart', 'meesho'] },
  { id: 'p15', name: 'USB-C to Lightning Cable (1m)', sku: 'CBL-CL1', barcode: '8901234560158', category: 'Chargers', brand: 'MOBI', price: 699, cost: 210, stock: 3, reserved: 0, reorderLevel: 15, description: 'MFi-certified braided cable.', platforms: ['amazon'] },
  { id: 'p16', name: 'Perfume Body Mist', sku: 'PBM-500', barcode: '8901234560165', category: 'Accessories', brand: 'MOBI', price: 799, cost: 310, stock: 26, reserved: 0, reorderLevel: 10, description: 'Counter add-on listed on beauty marketplaces.', platforms: ['myntra', 'nykaa'] },
]

export const initialCustomers: Customer[] = [
  { id: 'c1', name: 'Ankit Verma', phone: '+91 98765 43210', email: 'ankit.verma@gmail.com', address: 'A-42, MG Road, Sector 14, Gurugram – 122001', status: 'Active', totalPurchase: 122900, lastPurchase: '2026-10-28', notes: 'Prefers UPI. Interested in exchange offers for iPhone upgrades.', invoices: [
    { id: 'INV-1056', date: '2026-10-28', items: 'iPhone 16 (128GB)', amount: 79900 },
    { id: 'INV-1022', date: '2026-10-12', items: 'Phone Case (Black)', amount: 599 },
    { id: 'INV-1031', date: '2026-09-28', items: 'Screen Guard', amount: 490 },
    { id: 'INV-0987', date: '2026-08-14', items: 'Smart Watch Pro, boAt Airdopes 141', amount: 6298 },
  ] },
  { id: 'c2', name: 'Priya Singh', phone: '+91 91234 56780', email: 'priya.singh@gmail.com', address: '18, Park Street, Kolkata – 700016', status: 'Active', totalPurchase: 86490, lastPurchase: '2026-10-26', notes: '', invoices: [
    { id: 'INV-1051', date: '2026-10-26', items: 'Samsung Galaxy S25 (256GB)', amount: 80999 },
    { id: 'INV-0962', date: '2026-07-30', items: 'Wireless Headphones, Screen Guard', amount: 2989 },
  ] },
  { id: 'c3', name: 'Mohit Marwa', phone: '+91 99887 76655', email: 'mohit.marwa@outlook.com', address: '7B, Linking Road, Bandra West, Mumbai – 400050', status: 'Active', totalPurchase: 71498, lastPurchase: '2026-10-21', notes: 'Business buyer — needs GST invoices.', invoices: [
    { id: 'INV-1044', date: '2026-10-21', items: 'OnePlus 13 (256GB)', amount: 69999 },
    { id: 'INV-1045', date: '2026-10-21', items: 'Anker 20W USB-C Charger', amount: 1499 },
  ] },
  { id: 'c4', name: 'Tanvi Mam', phone: '+91 90123 45678', email: 'tanvi.m@gmail.com', address: '221, Indiranagar 100ft Road, Bengaluru – 560038', status: 'Active', totalPurchase: 34998, lastPurchase: '2026-10-12', notes: '', invoices: [
    { id: 'INV-1020', date: '2026-10-12', items: 'Galaxy Watch 7 (44mm)', amount: 29999 },
    { id: 'INV-0931', date: '2026-07-02', items: 'Smart Watch Pro', amount: 4999 },
  ] },
  { id: 'c5', name: 'Rahul Mehta', phone: '+91 98111 22334', email: 'rahul.mehta@gmail.com', address: '12A, MG Road, New Delhi – 110001', status: 'Active', totalPurchase: 27498, lastPurchase: '2026-10-09', notes: '', invoices: [
    { id: 'INV-1011', date: '2026-10-09', items: 'Nothing Phone (3a)', amount: 24999 },
    { id: 'INV-1012', date: '2026-10-09', items: 'Wireless Headphones', amount: 2499 },
  ] },
  { id: 'c6', name: 'Sneha Kapoor', phone: '+91 97000 11223', email: 'sneha.kapoor@yahoo.com', address: '55, Civil Lines, Jaipur – 302006', status: 'Active', totalPurchase: 25298, lastPurchase: '2026-09-30', notes: '', invoices: [
    { id: 'INV-0998', date: '2026-09-30', items: 'Redmi Note 14 Pro (128GB), boAt Airdopes 141', amount: 25298 },
  ] },
  { id: 'c7', name: 'Aman Verma', phone: '+91 96543 21098', email: 'aman.v@gmail.com', address: '9, Banjara Hills Road 3, Hyderabad – 500034', status: 'Inactive', totalPurchase: 4999, lastPurchase: '2026-05-18', notes: 'No purchases in the last 5 months.', invoices: [
    { id: 'INV-0844', date: '2026-05-18', items: 'Smart Watch Pro', amount: 4999 },
  ] },
  { id: 'c8', name: 'Karan Joshi', phone: '+91 95555 01234', email: 'karan.joshi@gmail.com', address: '301, FC Road, Shivajinagar, Pune – 411004', status: 'Active', totalPurchase: 3397, lastPurchase: '2026-10-18', notes: '', invoices: [
    { id: 'INV-1038', date: '2026-10-18', items: 'MOBI 10000mAh Power Bank, Anker 20W USB-C Charger', amount: 3397 },
  ] },
  { id: 'c9', name: 'Neha Iyer', phone: '+91 94444 98765', email: 'neha.iyer@gmail.com', address: '14, Anna Salai, Chennai – 600002', status: 'Active', totalPurchase: 82399, lastPurchase: '2026-10-24', notes: '', invoices: [
    { id: 'INV-1049', date: '2026-10-24', items: 'iPhone 16 (128GB), Wireless Headphones', amount: 82399 },
  ] },
  { id: 'c10', name: 'Vikram Rao', phone: '+91 93333 44556', email: 'vikram.rao@gmail.com', address: '78, SG Highway, Ahmedabad – 380054', status: 'Inactive', totalPurchase: 1298, lastPurchase: '2026-04-02', notes: '', invoices: [
    { id: 'INV-0790', date: '2026-04-02', items: 'Phone Case — Silicone, Screen Guard', amount: 1289 },
  ] },
]

export const expenseCategories = ['Rent', 'Salaries', 'Utilities', 'Inventory Purchase', 'Marketing', 'Logistics', 'Maintenance', 'Other']

export const initialExpenses: Expense[] = [
  { id: 'EXP-0142', date: '2026-10-29', category: 'Logistics', description: 'Courier pickup charges — marketplace orders', amount: 3250, method: 'UPI' },
  { id: 'EXP-0141', date: '2026-10-28', category: 'Inventory Purchase', description: 'Accessories restock — cases and screen guards', amount: 48600, method: 'Bank Transfer' },
  { id: 'EXP-0140', date: '2026-10-25', category: 'Marketing', description: 'Diwali sale Instagram and Google ads', amount: 12500, method: 'Card' },
  { id: 'EXP-0139', date: '2026-10-20', category: 'Utilities', description: 'Electricity bill — October', amount: 6840, method: 'UPI' },
  { id: 'EXP-0138', date: '2026-10-15', category: 'Maintenance', description: 'AC servicing and display counter repair', amount: 4200, method: 'Cash' },
  { id: 'EXP-0137', date: '2026-10-05', category: 'Utilities', description: 'Broadband and POS software subscription', amount: 2899, method: 'Card' },
  { id: 'EXP-0136', date: '2026-10-01', category: 'Salaries', description: 'Staff salaries — 3 employees', amount: 78000, method: 'Bank Transfer' },
  { id: 'EXP-0135', date: '2026-10-01', category: 'Rent', description: 'Shop rent — October', amount: 55000, method: 'Bank Transfer' },
  { id: 'EXP-0134', date: '2026-09-27', category: 'Other', description: 'Packaging material and carry bags', amount: 3100, method: 'Cash' },
]

export const initialPlatforms: Platform[] = [
  { id: 'amazon', portalUrl: 'https://sellercentral.amazon.in', name: 'Amazon', marketplace: 'Amazon India', brandColor: '#232f3e', brandFg: '#ff9900', connected: true, lastSync: '2026-10-29T16:32:00', listed: 1248, orders: 532, sales: 465300, health: 98 },
  { id: 'flipkart', portalUrl: 'https://seller.flipkart.com', name: 'Flipkart', marketplace: 'Flipkart Marketplace', brandColor: '#2874f0', brandFg: '#ffe500', connected: true, lastSync: '2026-10-29T16:28:00', listed: 612, orders: 488, sales: 392400, health: 96 },
  { id: 'myntra', portalUrl: 'https://partners.myntrainfo.com', name: 'Myntra', marketplace: 'Myntra Partner', brandColor: '#ff3f6c', brandFg: '#ffffff', connected: true, lastSync: '2026-10-29T16:20:00', listed: 184, orders: 236, sales: 148900, health: 94 },
  { id: 'nykaa', portalUrl: 'https://www.nykaa.com/sell-on-nykaa', name: 'Nykaa', marketplace: 'Nykaa Seller', brandColor: '#fc2779', brandFg: '#ffffff', connected: true, lastSync: '2026-10-29T16:18:00', listed: 96, orders: 172, sales: 86200, health: 97 },
  { id: 'meesho', portalUrl: 'https://supplier.meesho.com', name: 'Meesho', marketplace: 'Meesho Supplier', brandColor: '#9f2089', brandFg: '#ffffff', connected: true, lastSync: '2026-10-29T16:15:00', listed: 163, orders: 301, sales: 112700, health: 91 },
  { id: 'blinkit', portalUrl: 'https://seller.blinkit.com', name: 'Blinkit', marketplace: 'Blinkit Seller Hub', brandColor: '#f8cb46', brandFg: '#1f1f1f', connected: true, lastSync: '2026-10-29T16:12:00', listed: 78, orders: 113, sales: 39820, health: 88 },
]

export const initialOrders: PlatformOrder[] = [
  { id: 'AMZ-784521', platform: 'amazon', customer: 'Rahul Mehta', amount: 2499, date: '2026-10-29T10:24:00', status: 'Shipped', address: '12A, MG Road, New Delhi – 110001', trackingId: 'AMZTRK377891234', courier: 'Amazon Logistics', delivery: '2026-10-31', lines: [{ productId: 'p6', name: 'Wireless Headphones', sku: 'WH-1001', qty: 1, price: 2499 }] },
  { id: 'FLP-554320', platform: 'flipkart', customer: 'Priya Singh', amount: 5998, date: '2026-10-29T09:10:00', status: 'Processing', address: '18, Park Street, Kolkata – 700016', trackingId: 'FMPP0921837465', courier: 'Ekart Logistics', delivery: '2026-11-02', lines: [{ productId: 'p8', name: 'Smart Watch Pro', sku: 'SW-2030', qty: 1, price: 4999 }, { productId: 'p10', name: 'Phone Case (Black)', sku: 'CASE-001', qty: 1, price: 599 }, { productId: 'p12', name: 'Screen Guard', sku: 'SG-100', qty: 1, price: 400 }] },
  { id: 'MYN-448901', platform: 'myntra', customer: 'Aman Verma', amount: 1598, date: '2026-10-28T18:42:00', status: 'Delivered', address: '9, Banjara Hills Road 3, Hyderabad – 500034', trackingId: 'MYN88120045', courier: 'Delhivery', delivery: '2026-10-29', lines: [{ productId: 'p16', name: 'Perfume Body Mist', sku: 'PBM-500', qty: 2, price: 799 }] },
  { id: 'NYK-338765', platform: 'nykaa', customer: 'Sneha Kapoor', amount: 2397, date: '2026-10-28T14:05:00', status: 'Delivered', address: '55, Civil Lines, Jaipur – 302006', trackingId: 'NYK55019283', courier: 'Blue Dart', delivery: '2026-10-29', lines: [{ productId: 'p16', name: 'Perfume Body Mist', sku: 'PBM-500', qty: 3, price: 799 }] },
  { id: 'MSH-227433', platform: 'meesho', customer: 'Karan Joshi', amount: 799, date: '2026-10-28T11:30:00', status: 'Cancelled', address: '301, FC Road, Shivajinagar, Pune – 411004', trackingId: '—', courier: 'Valmo', delivery: '—', lines: [{ productId: 'p11', name: 'Phone Case — Silicone', sku: 'CASE-455', qty: 1, price: 799 }] },
  { id: 'BLK-119820', platform: 'blinkit', customer: 'Neha Iyer', amount: 1499, date: '2026-10-28T10:02:00', status: 'Delivered', address: '14, Anna Salai, Chennai – 600002', trackingId: 'BLK-RIDER-4471', courier: 'Blinkit Rider', delivery: '2026-10-28', lines: [{ productId: 'p13', name: 'Anker 20W USB-C Charger', sku: 'ANK-20W', qty: 1, price: 1499 }] },
  { id: 'AMZ-784377', platform: 'amazon', customer: 'Vikram Rao', amount: 79900, date: '2026-10-27T20:15:00', status: 'Shipped', address: '78, SG Highway, Ahmedabad – 380054', trackingId: 'AMZTRK377880021', courier: 'Amazon Logistics', delivery: '2026-10-30', lines: [{ productId: 'p1', name: 'iPhone 16 (128GB)', sku: 'IP16-128', qty: 1, price: 79900 }] },
  { id: 'FLP-554102', platform: 'flipkart', customer: 'Tanvi Mam', amount: 24999, date: '2026-10-27T16:48:00', status: 'Delivered', address: '221, Indiranagar 100ft Road, Bengaluru – 560038', trackingId: 'FMPP0921700311', courier: 'Ekart Logistics', delivery: '2026-10-29', lines: [{ productId: 'p4', name: 'Nothing Phone (3a)', sku: 'NP3A-128', qty: 1, price: 24999 }] },
  { id: 'AMZ-784190', platform: 'amazon', customer: 'Mohit Marwa', amount: 3398, date: '2026-10-27T12:20:00', status: 'Processing', address: '7B, Linking Road, Bandra West, Mumbai – 400050', trackingId: 'AMZTRK377871905', courier: 'Amazon Logistics', delivery: '2026-11-01', lines: [{ productId: 'p14', name: 'MOBI 10000mAh Power Bank', sku: 'PB-10K', qty: 1, price: 1899 }, { productId: 'p13', name: 'Anker 20W USB-C Charger', sku: 'ANK-20W', qty: 1, price: 1499 }] },
  { id: 'MSH-227210', platform: 'meesho', customer: 'Ankit Verma', amount: 1089, date: '2026-10-26T19:05:00', status: 'Delivered', address: 'A-42, MG Road, Sector 14, Gurugram – 122001', trackingId: 'VLM7730192', courier: 'Valmo', delivery: '2026-10-28', lines: [{ productId: 'p10', name: 'Phone Case (Black)', sku: 'CASE-001', qty: 1, price: 599 }, { productId: 'p12', name: 'Screen Guard', sku: 'SG-100', qty: 1, price: 490 }] },
  { id: 'FLP-553984', platform: 'flipkart', customer: 'Rahul Mehta', amount: 80999, date: '2026-10-26T13:40:00', status: 'Delivered', address: '12A, MG Road, New Delhi – 110001', trackingId: 'FMPP0921688450', courier: 'Ekart Logistics', delivery: '2026-10-28', lines: [{ productId: 'p2', name: 'Samsung Galaxy S25 (256GB)', sku: 'S25-256', qty: 1, price: 80999 }] },
  { id: 'BLK-119655', platform: 'blinkit', customer: 'Priya Singh', amount: 490, date: '2026-10-25T21:12:00', status: 'Delivered', address: '18, Park Street, Kolkata – 700016', trackingId: 'BLK-RIDER-4302', courier: 'Blinkit Rider', delivery: '2026-10-25', lines: [{ productId: 'p12', name: 'Screen Guard', sku: 'SG-100', qty: 1, price: 490 }] },
]

export const initialSyncLogs: SyncLog[] = [
  { id: 'LOG-78231', platform: 'amazon', event: 'Product Listed', sku: 'WH-1001', time: '2026-10-29T16:32:00', status: 'Success', message: 'Listing created and live on Amazon India.' },
  { id: 'LOG-78230', platform: 'flipkart', event: 'Inventory Updated', sku: 'SW-2030', time: '2026-10-29T16:28:00', status: 'Success', message: 'Stock updated from 37 to 34 units.' },
  { id: 'LOG-78229', platform: 'myntra', event: 'Price Updated', sku: 'PBM-500', time: '2026-10-29T16:20:00', status: 'Success', message: 'Price changed from ₹849 to ₹799.' },
  { id: 'LOG-78228', platform: 'nykaa', event: 'Product Listed', sku: 'CASE-001', time: '2026-10-29T16:18:00', status: 'Success', message: 'Listing approved by Nykaa catalogue team.' },
  { id: 'LOG-78227', platform: 'blinkit', event: 'Sync Failed', sku: 'SG-100', time: '2026-10-29T16:15:00', status: 'Failed', message: 'Category mapping missing for "Screen Protectors".' },
  { id: 'LOG-78226', platform: 'meesho', event: 'Order Imported', sku: 'CASE-455', time: '2026-10-29T15:58:00', status: 'Success', message: 'Order MSH-227433 imported.' },
  { id: 'LOG-78225', platform: 'amazon', event: 'Inventory Updated', sku: 'IP16-128', time: '2026-10-29T15:40:00', status: 'Success', message: 'Stock updated from 25 to 24 units.' },
  { id: 'LOG-78224', platform: 'flipkart', event: 'Price Updated', sku: 'S25-256', time: '2026-10-29T15:12:00', status: 'Pending', message: 'Waiting for Flipkart price approval.' },
  { id: 'LOG-78223', platform: 'amazon', event: 'Order Imported', sku: 'WH-1001', time: '2026-10-29T10:25:00', status: 'Success', message: 'Order AMZ-784521 imported.' },
  { id: 'LOG-78222', platform: 'meesho', event: 'Sync Failed', sku: 'RN14P-128', time: '2026-10-28T22:10:00', status: 'Failed', message: 'Product is out of stock; listing paused.' },
  { id: 'LOG-78221', platform: 'myntra', event: 'Inventory Updated', sku: 'BA-141', time: '2026-10-28T20:44:00', status: 'Success', message: 'Stock updated from 91 to 88 units.' },
  { id: 'LOG-78220', platform: 'blinkit', event: 'Product Listed', sku: 'ANK-20W', time: '2026-10-28T18:30:00', status: 'Success', message: 'Listing live in 4 dark stores.' },
]

/** Hourly sales for today (dashboard trend). */
export const salesToday = [
  { label: '10 AM', value: 4200 },
  { label: '11 AM', value: 6100 },
  { label: '12 PM', value: 5400 },
  { label: '1 PM', value: 8900 },
  { label: '2 PM', value: 7600 },
  { label: '3 PM', value: 11200 },
  { label: '4 PM', value: 13800 },
  { label: '5 PM', value: 12900 },
  { label: '6 PM', value: 18990 },
]

export const salesByPeriod = {
  Daily: [
    { label: 'Mon', value: 41200 },
    { label: 'Tue', value: 38600 },
    { label: 'Wed', value: 52400 },
    { label: 'Thu', value: 47800 },
    { label: 'Fri', value: 61300 },
    { label: 'Sat', value: 88900 },
    { label: 'Sun', value: 76400 },
  ],
  Weekly: [
    { label: 'Week 1', value: 284300 },
    { label: 'Week 2', value: 312800 },
    { label: 'Week 3', value: 298500 },
    { label: 'Week 4', value: 406600 },
  ],
  Monthly: [
    { label: 'May', value: 982000 },
    { label: 'Jun', value: 1045000 },
    { label: 'Jul', value: 1123000 },
    { label: 'Aug', value: 1098000 },
    { label: 'Sep', value: 1214000 },
    { label: 'Oct', value: 1302200 },
  ],
} as const

export const salesByCategory = [
  { label: 'Smartphones', value: 62 },
  { label: 'Accessories', value: 14 },
  { label: 'Audio', value: 11 },
  { label: 'Wearables', value: 9 },
  { label: 'Chargers', value: 4 },
]

export const platformTrend = [
  { label: 'Oct 23', value: 6200 },
  { label: 'Oct 24', value: 7400 },
  { label: 'Oct 25', value: 6900 },
  { label: 'Oct 26', value: 8800 },
  { label: 'Oct 27', value: 9600 },
  { label: 'Oct 28', value: 10400 },
  { label: 'Oct 29', value: 11500 },
]
