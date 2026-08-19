
-- ============================================================
-- OSA - OFFICIAL SHOP ADMINISTRATOR
-- Schema Completo para Supabase/PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. STORES (Lojas)
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    logo_url TEXT,
    cover_url TEXT,
    accent_color TEXT DEFAULT '#2563eb',
    currency TEXT DEFAULT 'MZN',
    locale TEXT DEFAULT 'pt-MZ',
    default_margin DECIMAL(5,2) DEFAULT 25.00,
    price_method TEXT DEFAULT 'margin', -- 'margin' | 'direct'
    is_active BOOLEAN DEFAULT true,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES (Perfis de Utilizadores - ligados ao auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'junior_admin', 'cashier')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. STORE_USERS (Associação Utilizador-Loja)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_id)
);

-- ============================================================
-- 4. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT DEFAULT 'un', -- un, kg, lt, cx, etc.
    cost_price DECIMAL(12,2) DEFAULT 0,
    margin DECIMAL(5,2) DEFAULT 25.00,
    sale_price DECIMAL(12,2) DEFAULT 0,
    price_method TEXT DEFAULT 'margin', -- 'margin' | 'direct'
    location TEXT, -- localização lógica
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, code),
    UNIQUE(store_id, name)
);

-- ============================================================
-- 6. STOCK_MOVEMENTS (Movimentações - FONTE DA VERDADE)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'entry', 'transfer_in', 'transfer_out', 'sale', 'return', 
        'loss', 'theft', 'inventory_adjustment', 'correction'
    )),
    origin TEXT, -- 'warehouse', 'store', 'supplier'
    destination TEXT, -- 'warehouse', 'store', 'customer'
    quantity DECIMAL(12,3) NOT NULL, -- positivo = entrada, negativo = saída
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    reference_id UUID, -- ID da venda, transferência, etc.
    reference_type TEXT, -- 'sale', 'transfer', 'inventory', 'loss', 'theft'
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TRANSFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    from_location TEXT NOT NULL CHECK (from_location IN ('warehouse', 'store')),
    to_location TEXT NOT NULL CHECK (to_location IN ('warehouse', 'store')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(12,3) DEFAULT 0,
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CHECK (from_location != to_location)
);

CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    cash_register_id UUID,
    sale_number TEXT UNIQUE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    total_profit DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile', 'mixed', 'credit')),
    payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial', 'cancelled')),
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_change DECIMAL(12,2) DEFAULT 0,
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    profit DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. CASH_REGISTERS (Caixas)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    register_name TEXT DEFAULT 'Caixa Principal',
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(12,2),
    expected_amount DECIMAL(12,2),
    difference_amount DECIMAL(12,2),
    difference_reason TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'income', 'expense', 'withdrawal', 'deposit', 'opening', 'closing')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    location TEXT NOT NULL CHECK (location IN ('warehouse', 'store', 'both')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    total_differences DECIMAL(12,3) DEFAULT 0,
    total_adjustment_cost DECIMAL(12,2) DEFAULT 0,
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    expected_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    counted_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    difference DECIMAL(12,3) DEFAULT 0,
    unit_cost DECIMAL(12,2),
    adjustment_cost DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. LOSSES (Perdas)
-- ============================================================
CREATE TABLE IF NOT EXISTS losses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    location TEXT NOT NULL CHECK (location IN ('warehouse', 'store')),
    reason TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. THEFTS (Furtos)
-- ============================================================
CREATE TABLE IF NOT EXISTS thefts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    location TEXT NOT NULL CHECK (location IN ('warehouse', 'store')),
    reference TEXT,
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. FUEL RECORDS (Combustível)
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    vehicle_name TEXT,
    fuel_type TEXT DEFAULT 'diesel',
    quantity_liters DECIMAL(10,2) NOT NULL,
    price_per_liter DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    mileage INTEGER,
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. DAILY_CLOSINGS (Fechamento do Dia)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    total_profit DECIMAL(12,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    total_entries DECIMAL(12,2) DEFAULT 0,
    total_transfers DECIMAL(12,2) DEFAULT 0,
    total_losses DECIMAL(12,2) DEFAULT 0,
    total_thefts DECIMAL(12,2) DEFAULT 0,
    opening_cash DECIMAL(12,2) DEFAULT 0,
    closing_cash DECIMAL(12,2) DEFAULT 0,
    cash_difference DECIMAL(12,2) DEFAULT 0,
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    is_closed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, closing_date)
);

-- ============================================================
-- 15. AUDIT_LOGS (Auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'TRANSFER', 'SALE', 'INVENTORY', 'ADJUSTMENT', 'LOSS', 'THEFT', 'CLOSING', 'LOGIN', 'LOGOUT')),
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. CONFIGS (Configurações)
-- ============================================================
CREATE TABLE IF NOT EXISTS configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    config_value TEXT,
    config_type TEXT DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, config_key)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_movements_store ON stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_transfers_store ON transfers(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_store ON cash_registers(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_losses_store ON losses(store_id);
CREATE INDEX IF NOT EXISTS idx_thefts_store ON thefts(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store ON audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- FUNÇÕES
-- ============================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configs_updated_at ON configs;
CREATE TRIGGER update_configs_updated_at BEFORE UPDATE ON configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular saldo de estoque
CREATE OR REPLACE FUNCTION get_stock_balance(p_product_id UUID, p_location TEXT)
RETURNS DECIMAL AS $$
DECLARE
    v_balance DECIMAL(12,3);
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN movement_type IN ('entry', 'transfer_in', 'return') THEN quantity
            WHEN movement_type IN ('sale', 'transfer_out', 'loss', 'theft', 'inventory_adjustment') THEN -quantity
            ELSE 0
        END
    ), 0)
    INTO v_balance
    FROM stock_movements
    WHERE product_id = p_product_id
    AND (
        (p_location = 'warehouse' AND origin = 'warehouse' AND destination = 'warehouse') OR
        (p_location = 'store' AND origin = 'store' AND destination = 'store') OR
        (p_location = 'warehouse' AND movement_type = 'entry') OR
        (p_location = 'store' AND movement_type = 'transfer_in' AND destination = 'store') OR
        (p_location = 'warehouse' AND movement_type = 'transfer_out' AND origin = 'warehouse') OR
        (p_location = 'store' AND movement_type = 'sale') OR
        (p_location = 'warehouse' AND movement_type = 'loss' AND origin = 'warehouse') OR
        (p_location = 'store' AND movement_type = 'loss' AND origin = 'store') OR
        (p_location = 'warehouse' AND movement_type = 'theft' AND origin = 'warehouse') OR
        (p_location = 'store' AND movement_type = 'theft' AND origin = 'store') OR
        (p_location = 'warehouse' AND movement_type = 'inventory_adjustment' AND origin = 'warehouse') OR
        (p_location = 'store' AND movement_type = 'inventory_adjustment' AND origin = 'store')
    );
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar número de venda
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TEXT AS $$
DECLARE
    v_date TEXT;
    v_count INTEGER;
    v_number TEXT;
BEGIN
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count FROM sales WHERE DATE(created_at) = CURRENT_DATE;
    v_number := 'V' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS - ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE thefts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

-- Políticas para STORES
CREATE POLICY "stores_select_all" ON stores FOR SELECT USING (true);
CREATE POLICY "stores_insert_admin" ON stores FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "stores_update_admin" ON stores FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para PROFILES
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para STORE_USERS
CREATE POLICY "store_users_select" ON store_users FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "store_users_insert_admin" ON store_users FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "store_users_delete_admin" ON store_users FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para CATEGORIES
CREATE POLICY "categories_select" ON categories FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = categories.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para PRODUCTS
CREATE POLICY "products_select" ON products FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = products.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "products_update" ON products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "products_delete" ON products FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para STOCK_MOVEMENTS
CREATE POLICY "stock_movements_select" ON stock_movements FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = stock_movements.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier'))
);

-- Políticas para SALES
CREATE POLICY "sales_select" ON sales FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = sales.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier'))
);
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para SALE_ITEMS
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales s 
        JOIN store_users su ON s.store_id = su.store_id 
        WHERE s.id = sale_items.sale_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier'))
);

-- Políticas para CASH_REGISTERS
CREATE POLICY "cash_registers_select" ON cash_registers FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = cash_registers.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "cash_registers_insert" ON cash_registers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier'))
);
CREATE POLICY "cash_registers_update" ON cash_registers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier'))
);

-- Políticas para CASH_MOVEMENTS
CREATE POLICY "cash_movements_select" ON cash_movements FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = cash_movements.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "cash_movements_insert" ON cash_movements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier'))
);

-- Políticas para TRANSFERS
CREATE POLICY "transfers_select" ON transfers FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = transfers.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "transfers_insert" ON transfers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "transfers_update" ON transfers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para LOSSES
CREATE POLICY "losses_select" ON losses FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = losses.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "losses_insert" ON losses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para THEFTS
CREATE POLICY "thefts_select" ON thefts FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = thefts.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "thefts_insert" ON thefts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para INVENTORIES
CREATE POLICY "inventories_select" ON inventories FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = inventories.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "inventories_insert" ON inventories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para AUDIT_LOGS
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- Políticas para CONFIGS
CREATE POLICY "configs_select" ON configs FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = configs.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "configs_insert" ON configs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);
CREATE POLICY "configs_update" ON configs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para DAILY_CLOSINGS
CREATE POLICY "daily_closings_select" ON daily_closings FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = daily_closings.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "daily_closings_insert" ON daily_closings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- Políticas para FUEL_RECORDS
CREATE POLICY "fuel_records_select" ON fuel_records FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = fuel_records.store_id AND su.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "fuel_records_insert" ON fuel_records FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin'))
);

-- ============================================================
-- VIEW PARA ESTOQUE ATUAL
-- ============================================================
CREATE OR REPLACE VIEW v_stock_current AS
SELECT 
    p.id AS product_id,
    p.store_id,
    p.name AS product_name,
    p.code,
    p.unit,
    p.cost_price,
    p.sale_price,
    COALESCE(SUM(CASE WHEN sm.movement_type IN ('entry', 'transfer_in', 'return') THEN sm.quantity ELSE 0 END), 0) AS total_in,
    COALESCE(SUM(CASE WHEN sm.movement_type IN ('sale', 'transfer_out', 'loss', 'theft', 'inventory_adjustment') THEN sm.quantity ELSE 0 END), 0) AS total_out,
    COALESCE(SUM(CASE 
        WHEN sm.movement_type IN ('entry', 'transfer_in', 'return') THEN sm.quantity 
        WHEN sm.movement_type IN ('sale', 'transfer_out', 'loss', 'theft', 'inventory_adjustment') THEN -sm.quantity 
        ELSE 0 
    END), 0) AS current_stock,
    p.created_at
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.store_id, p.name, p.code, p.unit, p.cost_price, p.sale_price, p.created_at;

-- ============================================================
-- VIEW PARA SALDO DE CAIXA
-- ============================================================
CREATE OR REPLACE VIEW v_cash_balance AS
SELECT 
    cr.id AS register_id,
    cr.store_id,
    cr.register_name,
    cr.status,
    cr.opening_amount,
    COALESCE(SUM(CASE WHEN cm.movement_type IN ('sale', 'income', 'deposit') THEN cm.amount ELSE 0 END), 0) AS total_in,
    COALESCE(SUM(CASE WHEN cm.movement_type IN ('expense', 'withdrawal') THEN cm.amount ELSE 0 END), 0) AS total_out,
    cr.opening_amount + COALESCE(SUM(CASE WHEN cm.movement_type IN ('sale', 'income', 'deposit') THEN cm.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN cm.movement_type IN ('expense', 'withdrawal') THEN cm.amount ELSE 0 END), 0) AS expected_balance,
    cr.opened_at,
    cr.closed_at
FROM cash_registers cr
LEFT JOIN cash_movements cm ON cm.cash_register_id = cr.id
GROUP BY cr.id, cr.store_id, cr.register_name, cr.status, cr.opening_amount, cr.opened_at, cr.closed_at;
