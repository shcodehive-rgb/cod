-- Seed Orders Table with Initial Data
INSERT INTO orders (
  customer_name, 
  phone, 
  city, 
  product, 
  selling_price, 
  product_cost, 
  packaging_cost, 
  shipping_fee, 
  return_fee, 
  status, 
  campaign_source,
  created_at
) VALUES 
(
  'reda',
  '664609889',
  'Douar Boumaiz',
  'Ceinture de cheville',
  149.00,
  50.00,
  5.00,
  45.00,
  15.00,
  'delivered',
  'bismiallh tawkalto 3la allh',
  NOW()
),
(
  'Talhrechet mohammed',
  '675867222',
  'Skhirat',
  'Ceinture de cheville',
  149.00,
  50.00,
  5.00,
  35.00,
  15.00,
  'delivered',
  'حملة إعلانية جديدة بهدف المبيعات',
  NOW()
),
(
  'mousa',
  '772964113',
  'Moulay Bousselham',
  'Ceinture de cheville',
  149.00,
  50.00,
  5.00,
  45.00,
  15.00,
  'delivered',
  'حملة إعلانية جديدة بهدف المبيعات',
  NOW()
),
(
  'Hamza El hilali',
  '628087703',
  'Agadir',
  'Ceinture de cheville',
  149.00,
  50.00,
  5.00,
  35.00,
  15.00,
  'delivered',
  'حملة إعلانية جديدة بهدف المبيعات',
  NOW()
),
(
  'Ahmed Mohamed',
  '+212612345678',
  'Casablanca',
  'Wireless Headphones',
  299.00,
  150.00,
  5.00,
  20.00,
  15.00,
  'pending',
  '1',
  NOW()
),
(
  'Fatima Ali',
  '+212698765432',
  'Agadir',
  'Phone Case',
  49.00,
  25.00,
  5.00,
  35.00,
  15.00,
  'delivered',
  '2',
  NOW()
);

-- Seed Campaigns Table with Initial Data
INSERT INTO campaigns (
  name,
  is_active,
  status,
  planned_budget,
  actual_spent,
  orders_generated,
  leads_generated,
  notes,
  created_at
) VALUES 
(
  'AD de Prospects',
  false,
  'stopped',
  50.00,
  41.60,
  0,
  0,
  NULL,
  NOW()
),
(
  'test 2',
  false,
  'stopped',
  50.00,
  32.60,
  0,
  0,
  NULL,
  NOW()
),
(
  'bismiallh tawkalto 3la allh',
  false,
  'stopped',
  70.00,
  82.60,
  0,
  0,
  NULL,
  NOW()
),
(
  'Super Adsorption',
  false,
  'stopped',
  50.00,
  9.60,
  0,
  0,
  NULL,
  NOW()
),
(
  'حملة إعلانية جديدة بهدف المبيعات',
  false,
  'stopped',
  100.00,
  173.10,
  0,
  0,
  NULL,
  NOW()
),
(
  '50',
  false,
  'stopped',
  50.00,
  130.00,
  0,
  0,
  NULL,
  NOW()
);
