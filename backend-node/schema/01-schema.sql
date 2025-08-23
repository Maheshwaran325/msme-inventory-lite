-- Supabase PostgreSQL Database

-- Create a table for public profiles with roles
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE,
  role text DEFAULT 'staff' -- Can be 'owner' or 'staff'
);

-- Set up Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create a profile for every new user
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'staff'); -- All new users default to 'staff'
  RETURN new;
END;
$$ language plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create the products table
CREATE TABLE products (
  id bigserial PRIMARY KEY, -- Simpler than UUID
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  category text,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price decimal(10, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  version integer NOT NULL DEFAULT 1, -- For optimistic concurrency
  created_at timestamptz DEFAULT now()
);

-- Set up Row Level Security for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can see all products." ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products." ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products." ON products FOR UPDATE TO authenticated USING (true);
-- Deletion limited to owners for safety
CREATE POLICY "Owners can delete products." ON products FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

-- Sample data for development
INSERT INTO products (name, sku, category, quantity, unit_price) VALUES
  ('Coca Cola 500ml', 'COKE-500', 'Beverages', 50, 2.50),
  ('White Bread', 'BREAD-WHITE', 'Bakery', 25, 1.75),
  ('Milk 1L', 'MILK-1L', 'Dairy', 30, 3.25),
  ('Bananas (per kg)', 'BANANA-KG', 'Fruits', 15, 2.99);
