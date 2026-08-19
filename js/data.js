// OSA - Camada de Dados Central (Data Layer)
// CREATE, READ, UPDATE, DELETE, COUNT - tudo centralizado

const Data = {
    // ========== STORES ==========
    async getStores() {
        const sb = getSupabase();
        const { data, error } = await sb.from('stores').select('*').order('name');
        if (error) throw error;
        return data || [];
    },

    async getStore(id) {
        const sb = getSupabase();
        const { data, error } = await sb.from('stores').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async createStore(storeData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('stores').insert(storeData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Store created but no data returned');
        return data;
    },

    async updateStore(id, storeData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('stores').update(storeData).eq('id', id).select().single();
        if (error) throw error;
        if (!data || data.id !== id) throw new Error('Store update not confirmed');
        return data;
    },

    // ========== PROFILES / USERS ==========
    async getProfiles() {
        const sb = getSupabase();
        const { data, error } = await sb.from('profiles').select('*').order('full_name');
        if (error) throw error;
        return data || [];
    },

    async getProfile(id) {
        const sb = getSupabase();
        const { data, error } = await sb.from('profiles').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async updateProfile(id, profileData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('profiles').update(profileData).eq('id', id).select().single();
        if (error) throw error;
        if (!data || data.id !== id) throw new Error('Profile update not confirmed');
        return data;
    },

    async getStoreUsers(storeId) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('store_users')
            .select('*, profiles(*)')
            .eq('store_id', storeId);
        if (error) throw error;
        return data || [];
    },

    async assignUserToStore(userId, storeId, isDefault = false) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('store_users')
            .insert({ user_id: userId, store_id: storeId, is_default: isDefault })
            .select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Assignment not confirmed');
        return data;
    },

    async removeUserFromStore(id) {
        const sb = getSupabase();
        const { error } = await sb.from('store_users').delete().eq('id', id);
        if (error) throw error;
        // Verify deletion
        const { data: check } = await sb.from('store_users').select('id').eq('id', id).single();
        if (check) throw new Error('Record still exists after deletion');
        return true;
    },

    // ========== CATEGORIES ==========
    async getCategories(storeId) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('categories')
            .select('*')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createCategory(categoryData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('categories').insert(categoryData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Category not confirmed');
        return data;
    },

    async updateCategory(id, categoryData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('categories').update(categoryData).eq('id', id).select().single();
        if (error) throw error;
        if (!data || data.id !== id) throw new Error('Category update not confirmed');
        return data;
    },

    async deleteCategory(id) {
        const sb = getSupabase();
        const { error } = await sb.from('categories').delete().eq('id', id);
        if (error) throw error;
        const { data: check } = await sb.from('categories').select('id').eq('id', id).single();
        if (check) throw new Error('Category still exists after deletion');
        return true;
    },

    // ========== PRODUCTS ==========
    async getProducts(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('products').select('*').eq('store_id', storeId);
        if (options.activeOnly !== false) query = query.eq('is_active', true);
        if (options.categoryId) query = query.eq('category_id', options.categoryId);
        if (options.search) query = query.ilike('name', `%${options.search}%`);
        if (options.limit) query = query.limit(options.limit);
        query = query.order('name');
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getProduct(id) {
        const sb = getSupabase();
        const { data, error } = await sb.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async createProduct(productData) {
        const sb = getSupabase();
        // Check for duplicates
        const { data: dup } = await sb.from('products')
            .select('id')
            .eq('store_id', productData.store_id)
            .or(`name.eq.${productData.name},code.eq.${productData.code}`)
            .single();
        if (dup) throw new Error('Product with same name or code already exists');

        const { data, error } = await sb.from('products').insert(productData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Product not confirmed');
        return data;
    },

    async updateProduct(id, productData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('products').update(productData).eq('id', id).select().single();
        if (error) throw error;
        if (!data || data.id !== id) throw new Error('Product update not confirmed');
        return data;
    },

    async deleteProduct(id) {
        const sb = getSupabase();
        const { error } = await sb.from('products').delete().eq('id', id);
        if (error) throw error;
        const { data: check } = await sb.from('products').select('id').eq('id', id).single();
        if (check) throw new Error('Product still exists after deletion');
        return true;
    },

    // ========== STOCK MOVEMENTS ==========
    async getStockMovements(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('stock_movements')
            .select('*, products(name, code, unit)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (options.productId) query = query.eq('product_id', options.productId);
        if (options.type) query = query.eq('movement_type', options.type);
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getProductStock(productId) {
        const sb = getSupabase();
        const { data: movements, error } = await sb
            .from('stock_movements')
            .select('movement_type, quantity')
            .eq('product_id', productId);
        if (error) throw error;
        let stock = 0;
        (movements || []).forEach(m => {
            if (['entry','transfer_in','return'].includes(m.movement_type)) stock += parseFloat(m.quantity);
            else if (['sale','transfer_out','loss','theft','inventory_adjustment'].includes(m.movement_type)) stock -= parseFloat(m.quantity);
        });
        return stock;
    },

    async createStockMovement(movementData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('stock_movements').insert(movementData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Movement not confirmed');
        return data;
    },

    // ========== SALES ==========
    async getSales(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('sales')
            .select('*, profiles(full_name), sale_items(*, products(name, code))')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (options.from) query = query.gte('created_at', options.from);
        if (options.to) query = query.lte('created_at', options.to);
        if (options.limit) query = query.limit(options.limit);
        if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getSale(id) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('sales')
            .select('*, profiles(full_name), sale_items(*, products(name, code, unit))')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async createSale(saleData, items) {
        const sb = getSupabase();

        // Start by creating the sale
        const { data: sale, error: saleError } = await sb
            .from('sales')
            .insert(saleData)
            .select()
            .single();
        if (saleError) throw saleError;
        if (!sale || !sale.id) throw new Error('Sale not confirmed');

        // Create sale items
        const itemsWithSaleId = items.map(i => ({ ...i, sale_id: sale.id }));
        const { data: saleItems, error: itemsError } = await sb
            .from('sale_items')
            .insert(itemsWithSaleId)
            .select();
        if (itemsError) {
            // Attempt rollback
            await sb.from('sales').delete().eq('id', sale.id);
            throw itemsError;
        }

        // Create stock movements for each item
        const movements = items.map(i => ({
            store_id: saleData.store_id,
            product_id: i.product_id,
            movement_type: 'sale',
            origin: 'store',
            destination: 'customer',
            quantity: i.quantity,
            unit_cost: i.unit_cost,
            total_cost: i.total_cost,
            reference_id: sale.id,
            reference_type: 'sale',
            user_id: saleData.user_id
        }));
        const { error: movError } = await sb.from('stock_movements').insert(movements);
        if (movError) {
            // Rollback
            await sb.from('sale_items').delete().eq('sale_id', sale.id);
            await sb.from('sales').delete().eq('id', sale.id);
            throw movError;
        }

        // Cash movement if paid
        if (saleData.payment_status === 'paid' && saleData.amount_paid > 0) {
            const { error: cashError } = await sb.from('cash_movements').insert({
                store_id: saleData.store_id,
                cash_register_id: saleData.cash_register_id,
                user_id: saleData.user_id,
                movement_type: 'sale',
                amount: saleData.amount_paid,
                description: `Venda ${sale.sale_number || sale.id}`,
                reference_id: sale.id,
                reference_type: 'sale'
            });
            if (cashError) console.warn('Cash movement error:', cashError);
        }

        return { ...sale, sale_items: saleItems };
    },

    async cancelSale(id, userId) {
        const sb = getSupabase();
        const { data: sale, error: fetchError } = await sb.from('sales').select('*').eq('id', id).single();
        if (fetchError) throw fetchError;
        if (sale.is_cancelled) throw new Error('Sale already cancelled');

        const { data, error } = await sb.from('sales')
            .update({ is_cancelled: true, cancelled_at: new Date().toISOString(), cancelled_by: userId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        // Reverse stock movements
        const { data: items } = await sb.from('sale_items').select('*').eq('sale_id', id);
        if (items && items.length > 0) {
            const returnMovements = items.map(i => ({
                store_id: sale.store_id,
                product_id: i.product_id,
                movement_type: 'return',
                origin: 'customer',
                destination: 'store',
                quantity: i.quantity,
                unit_cost: i.unit_cost,
                total_cost: i.total_cost,
                reference_id: id,
                reference_type: 'sale',
                user_id: userId,
                notes: 'Devolução por cancelamento'
            }));
            await sb.from('stock_movements').insert(returnMovements);
        }

        return data;
    },

    // ========== TRANSFERS ==========
    async getTransfers(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('transfers')
            .select('*, profiles(full_name), transfer_items(*, products(name, code, unit))')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (options.status) query = query.eq('status', options.status);
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createTransfer(transferData, items) {
        const sb = getSupabase();

        const { data: transfer, error: tError } = await sb
            .from('transfers')
            .insert(transferData)
            .select()
            .single();
        if (tError) throw tError;
        if (!transfer || !transfer.id) throw new Error('Transfer not confirmed');

        const itemsWithId = items.map(i => ({ ...i, transfer_id: transfer.id }));
        const { data: tItems, error: iError } = await sb
            .from('transfer_items')
            .insert(itemsWithId)
            .select();
        if (iError) {
            await sb.from('transfers').delete().eq('id', transfer.id);
            throw iError;
        }

        // If completed immediately, create stock movements
        if (transferData.status === 'completed') {
            const movements = items.map(i => ({
                store_id: transferData.store_id,
                product_id: i.product_id,
                movement_type: transferData.from_location === 'warehouse' ? 'transfer_out' : 'transfer_in',
                origin: transferData.from_location,
                destination: transferData.to_location,
                quantity: i.quantity,
                unit_cost: i.unit_cost,
                reference_id: transfer.id,
                reference_type: 'transfer',
                user_id: transferData.user_id
            }));
            // Also create the opposite movement
            const movementsIn = items.map(i => ({
                store_id: transferData.store_id,
                product_id: i.product_id,
                movement_type: transferData.to_location === 'warehouse' ? 'transfer_in' : 'transfer_in',
                origin: transferData.from_location,
                destination: transferData.to_location,
                quantity: i.quantity,
                unit_cost: i.unit_cost,
                reference_id: transfer.id,
                reference_type: 'transfer',
                user_id: transferData.user_id
            }));

            // For warehouse->store: warehouse loses, store gains
            const outMovements = items.map(i => ({
                store_id: transferData.store_id,
                product_id: i.product_id,
                movement_type: 'transfer_out',
                origin: transferData.from_location,
                destination: transferData.to_location,
                quantity: i.quantity,
                unit_cost: i.unit_cost,
                reference_id: transfer.id,
                reference_type: 'transfer',
                user_id: transferData.user_id
            }));
            const inMovements = items.map(i => ({
                store_id: transferData.store_id,
                product_id: i.product_id,
                movement_type: 'transfer_in',
                origin: transferData.from_location,
                destination: transferData.to_location,
                quantity: i.quantity,
                unit_cost: i.unit_cost,
                reference_id: transfer.id,
                reference_type: 'transfer',
                user_id: transferData.user_id
            }));

            const { error: mError } = await sb.from('stock_movements').insert([...outMovements, ...inMovements]);
            if (mError) {
                await sb.from('transfer_items').delete().eq('transfer_id', transfer.id);
                await sb.from('transfers').delete().eq('id', transfer.id);
                throw mError;
            }
        }

        return { ...transfer, transfer_items: tItems };
    },

    async completeTransfer(id, userId) {
        const sb = getSupabase();
        const { data: transfer, error: fError } = await sb
            .from('transfers')
            .select('*, transfer_items(*)')
            .eq('id', id)
            .single();
        if (fError) throw fError;
        if (transfer.status !== 'pending') throw new Error('Transfer already processed');

        const { data, error } = await sb.from('transfers')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        const items = transfer.transfer_items || [];
        const outMovements = items.map(i => ({
            store_id: transfer.store_id,
            product_id: i.product_id,
            movement_type: 'transfer_out',
            origin: transfer.from_location,
            destination: transfer.to_location,
            quantity: i.quantity,
            unit_cost: i.unit_cost,
            reference_id: transfer.id,
            reference_type: 'transfer',
            user_id: userId
        }));
        const inMovements = items.map(i => ({
            store_id: transfer.store_id,
            product_id: i.product_id,
            movement_type: 'transfer_in',
            origin: transfer.from_location,
            destination: transfer.to_location,
            quantity: i.quantity,
            unit_cost: i.unit_cost,
            reference_id: transfer.id,
            reference_type: 'transfer',
            user_id: userId
        }));

        const { error: mError } = await sb.from('stock_movements').insert([...outMovements, ...inMovements]);
        if (mError) throw mError;

        return data;
    },

    // ========== CASH REGISTERS ==========
    async getCashRegisters(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('cash_registers')
            .select('*, profiles(full_name)')
            .eq('store_id', storeId)
            .order('opened_at', { ascending: false });
        if (options.status) query = query.eq('status', options.status);
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getCashRegister(id) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('cash_registers')
            .select('*, profiles(full_name)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async openCashRegister(registerData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('cash_registers').insert(registerData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Register not confirmed');

        // Create opening movement
        await sb.from('cash_movements').insert({
            store_id: registerData.store_id,
            cash_register_id: data.id,
            user_id: registerData.user_id,
            movement_type: 'opening',
            amount: registerData.opening_amount,
            description: 'Abertura de caixa'
        });

        return data;
    },

    async closeCashRegister(id, closeData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('cash_registers')
            .update({ ...closeData, status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        await sb.from('cash_movements').insert({
            store_id: closeData.store_id || data.store_id,
            cash_register_id: id,
            user_id: closeData.user_id,
            movement_type: 'closing',
            amount: closeData.closing_amount || 0,
            description: 'Fechamento de caixa'
        });

        return data;
    },

    async getCashMovements(registerId) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('cash_movements')
            .select('*')
            .eq('cash_register_id', registerId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createCashMovement(movementData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('cash_movements').insert(movementData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Movement not confirmed');
        return data;
    },

    // ========== INVENTORY ==========
    async getInventories(storeId) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('inventories')
            .select('*, profiles(full_name)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getInventory(id) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('inventories')
            .select('*, inventory_items(*, products(name, code, unit))')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async createInventory(inventoryData, items) {
        const sb = getSupabase();
        const { data: inv, error: iError } = await sb
            .from('inventories')
            .insert(inventoryData)
            .select()
            .single();
        if (iError) throw iError;
        if (!inv || !inv.id) throw new Error('Inventory not confirmed');

        const itemsWithId = items.map(it => ({ ...it, inventory_id: inv.id }));
        const { data: invItems, error: itemsError } = await sb
            .from('inventory_items')
            .insert(itemsWithId)
            .select();
        if (itemsError) {
            await sb.from('inventories').delete().eq('id', inv.id);
            throw itemsError;
        }
        return { ...inv, inventory_items: invItems };
    },

    async updateInventoryItem(id, countedQty, notes) {
        const sb = getSupabase();
        const { data: item } = await sb.from('inventory_items').select('*').eq('id', id).single();
        const diff = countedQty - item.expected_quantity;
        const adjCost = diff * (item.unit_cost || 0);

        const { data, error } = await sb.from('inventory_items')
            .update({ counted_quantity: countedQty, difference: diff, adjustment_cost: adjCost, notes })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async closeInventory(id, userId) {
        const sb = getSupabase();
        const { data: inv } = await sb.from('inventories').select('*, inventory_items(*)').eq('id', id).single();

        // Update inventory status
        const { data, error } = await sb.from('inventories')
            .update({ status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        // Create adjustments for differences
        const adjustments = (inv.inventory_items || []).filter(i => i.difference !== 0).map(i => ({
            store_id: inv.store_id,
            product_id: i.product_id,
            movement_type: 'inventory_adjustment',
            origin: inv.location,
            destination: inv.location,
            quantity: Math.abs(i.difference),
            unit_cost: i.unit_cost,
            total_cost: Math.abs(i.adjustment_cost || 0),
            reference_id: inv.id,
            reference_type: 'inventory',
            user_id: userId,
            notes: `Ajuste inventário: ${i.difference > 0 ? 'Excesso' : 'Falta'} de ${Math.abs(i.difference)} unidades`
        }));

        if (adjustments.length > 0) {
            const { error: mError } = await sb.from('stock_movements').insert(adjustments);
            if (mError) throw mError;
        }

        return data;
    },

    // ========== LOSSES ==========
    async getLosses(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('losses')
            .select('*, products(name, code)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createLoss(lossData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('losses').insert(lossData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Loss not confirmed');

        // Create stock movement
        await sb.from('stock_movements').insert({
            store_id: lossData.store_id,
            product_id: lossData.product_id,
            movement_type: 'loss',
            origin: lossData.location,
            destination: lossData.location,
            quantity: lossData.quantity,
            unit_cost: lossData.unit_cost,
            total_cost: lossData.total_cost,
            reference_id: data.id,
            reference_type: 'loss',
            user_id: lossData.user_id,
            notes: lossData.reason
        });

        return data;
    },

    // ========== THEFTS ==========
    async getThefts(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('thefts')
            .select('*, products(name, code)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createTheft(theftData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('thefts').insert(theftData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Theft not confirmed');

        await sb.from('stock_movements').insert({
            store_id: theftData.store_id,
            product_id: theftData.product_id,
            movement_type: 'theft',
            origin: theftData.location,
            destination: theftData.location,
            quantity: theftData.quantity,
            unit_cost: theftData.unit_cost,
            total_cost: theftData.total_cost,
            reference_id: data.id,
            reference_type: 'theft',
            user_id: theftData.user_id,
            notes: theftData.reference
        });

        return data;
    },

    // ========== FUEL ==========
    async getFuelRecords(storeId) {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('fuel_records')
            .select('*, profiles(full_name)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createFuelRecord(recordData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('fuel_records').insert(recordData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Fuel record not confirmed');
        return data;
    },

    // ========== DAILY CLOSINGS ==========
    async getDailyClosings(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('daily_closings')
            .select('*')
            .eq('store_id', storeId)
            .order('closing_date', { ascending: false });
        if (options.limit) query = query.limit(options.limit);
        if (options.from) query = query.gte('closing_date', options.from);
        if (options.to) query = query.lte('closing_date', options.to);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createDailyClosing(closingData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('daily_closings').insert(closingData).select().single();
        if (error) throw error;
        if (!data || !data.id) throw new Error('Closing not confirmed');
        return data;
    },

    // ========== AUDIT ==========
    async getAuditLogs(storeId, options = {}) {
        const sb = getSupabase();
        let query = sb.from('audit_logs')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createAuditLog(logData) {
        const sb = getSupabase();
        const { data, error } = await sb.from('audit_logs').insert(logData).select().single();
        if (error) throw error;
        return data;
    },

    // ========== DASHBOARD STATS ==========
    async getDashboardStats(storeId, period = 'today') {
        const sb = getSupabase();
        let fromDate, toDate;
        const now = new Date();

        switch(period) {
            case 'today':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
                break;
            case 'yesterday':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                break;
            case 'week':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
                toDate = now.toISOString();
                break;
            case 'month':
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                toDate = now.toISOString();
                break;
            default:
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        }

        // Sales stats
        const { data: salesData, error: sError } = await sb
            .from('sales')
            .select('total_amount, total_cost, total_profit')
            .eq('store_id', storeId)
            .eq('is_cancelled', false)
            .gte('created_at', fromDate)
            .lte('created_at', toDate);
        if (sError) throw sError;

        const totalSales = (salesData || []).reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
        const totalCost = (salesData || []).reduce((sum, s) => sum + (parseFloat(s.total_cost) || 0), 0);
        const totalProfit = (salesData || []).reduce((sum, s) => sum + (parseFloat(s.total_profit) || 0), 0);
        const transactionCount = (salesData || []).length;

        // Stock movements
        const { data: movements, error: mError } = await sb
            .from('stock_movements')
            .select('movement_type, quantity')
            .eq('store_id', storeId)
            .gte('created_at', fromDate)
            .lte('created_at', toDate);
        if (mError) throw mError;

        const entries = (movements || []).filter(m => m.movement_type === 'entry').reduce((s, m) => s + parseFloat(m.quantity), 0);
        const transfersOut = (movements || []).filter(m => m.movement_type === 'transfer_out').reduce((s, m) => s + parseFloat(m.quantity), 0);
        const losses = (movements || []).filter(m => m.movement_type === 'loss').reduce((s, m) => s + parseFloat(m.quantity), 0);
        const thefts = (movements || []).filter(m => m.movement_type === 'theft').reduce((s, m) => s + parseFloat(m.quantity), 0);

        // Products count
        const { count: productCount, error: pError } = await sb
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true);
        if (pError) throw pError;

        // Cash register
        const { data: cashRegs, error: cError } = await sb
            .from('cash_registers')
            .select('*')
            .eq('store_id', storeId)
            .eq('status', 'open');
        if (cError) throw cError;

        return {
            totalSales,
            totalCost,
            totalProfit,
            transactionCount,
            entries,
            transfersOut,
            losses,
            thefts,
            productCount: productCount || 0,
            openCashRegisters: cashRegs || [],
            margin: totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(2) : 0
        };
    },

    async getSalesChartData(storeId, days = 7) {
        const sb = getSupabase();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const { data, error } = await sb
            .from('sales')
            .select('created_at, total_amount')
            .eq('store_id', storeId)
            .eq('is_cancelled', false)
            .gte('created_at', fromDate.toISOString())
            .order('created_at');
        if (error) throw error;

        const grouped = {};
        (data || []).forEach(sale => {
            const date = sale.created_at.split('T')[0];
            grouped[date] = (grouped[date] || 0) + parseFloat(sale.total_amount);
        });

        const labels = [];
        const values = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(dateStr.split('-').reverse().join('/'));
            values.push(grouped[dateStr] || 0);
        }
        return { labels, values };
    },

    async getTopProducts(storeId, limit = 5) {
        const sb = getSupabase();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);

        const { data, error } = await sb
            .from('sale_items')
            .select('product_id, quantity, products(name)')
            .eq('products.store_id', storeId)
            .gte('created_at', fromDate.toISOString());
        if (error) throw error;

        const grouped = {};
        (data || []).forEach(item => {
            const name = item.products?.name || 'Desconhecido';
            grouped[name] = (grouped[name] || 0) + parseFloat(item.quantity);
        });

        return Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, qty]) => ({ name, quantity: qty }));
    }
};

window.Data = Data;
