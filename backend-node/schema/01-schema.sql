-- 1. Profiles table (maps to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE,
  role text DEFAULT 'staff' -- 'owner' or 'staff'
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile."
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: Auto-create profile for every new user
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email); -- role defaults to 'staff'
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 2. Products table
CREATE TABLE products (
  id bigserial PRIMARY KEY,        
  name text NOT NULL,
  sku varchar(64) NOT NULL UNIQUE,  
  category text,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  version integer NOT NULL DEFAULT 1,  -- optimistic concurrency
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Automatically update updated_at on row changes
CREATE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ============================================================
-- 3. Helper function: role check
CREATE FUNCTION is_owner(uid uuid)
RETURNS boolean AS $$
  SELECT role = 'owner' FROM profiles WHERE id = uid;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 4. Row Level Security (RLS) policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users can see products
CREATE POLICY "Authenticated users can read products."
  ON products FOR SELECT TO authenticated
  USING (true);

-- Insert: any authenticated user can add products
CREATE POLICY "Authenticated users can insert products."
  ON products FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update: Owners can update all fields
CREATE POLICY "Owners can update products."
  ON products FOR UPDATE TO authenticated
  USING (is_owner(auth.uid()));


-- Delete: Only owners can delete products
CREATE POLICY "Owners can delete products."
  ON products FOR DELETE TO authenticated
  USING (is_owner(auth.uid()));

-- ============================================================
-- 5. Sample seed data (for dev only; remove in prod)
INSERT INTO products (name, sku, category, quantity, unit_price) VALUES
  ('Coca Cola 500ml', 'COKE-500', 'Beverages', 50, 2.50),
  ('White Bread', 'BREAD-WHITE', 'Bakery', 25, 1.75),
  ('Milk 1L', 'MILK-1L', 'Dairy', 30, 3.25),
  ('Bananas (per kg)', 'BANANA-KG', 'Fruits', 15, 2.99);
