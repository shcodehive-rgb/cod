-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  product TEXT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  product_cost DECIMAL(10,2) NOT NULL,
  packaging_cost DECIMAL(10,2) DEFAULT 5.00,
  shipping_fee DECIMAL(10,2) NOT NULL,
  return_fee DECIMAL(10,2) DEFAULT 15.00,
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'returned')),
  campaign_source TEXT NOT NULL DEFAULT 'Organic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  planned_budget DECIMAL(10,2) DEFAULT 0.00,
  actual_spent DECIMAL(10,2) DEFAULT 0.00,
  orders_generated INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON blacklist(phone);

-- DISABLE Row Level Security for now (service role key will work)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist DISABLE ROW LEVEL SECURITY;
