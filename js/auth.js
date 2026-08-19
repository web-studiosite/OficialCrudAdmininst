// OSA - Autenticação

const Auth = {
    currentUser: null,
    currentProfile: null,
    currentStore: null,
    userStores: [],

    async init() {
        const sb = getSupabase();
        if (!sb) return false;

        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadProfile();
            await this.loadUserStores();
            const savedStore = localStorage.getItem('osa_current_store');
            if (savedStore) {
                const store = this.userStores.find(s => s.store_id === savedStore);
                if (store) this.currentStore = store.stores;
            }
            if (!this.currentStore && this.userStores.length > 0) {
                this.currentStore = this.userStores[0].stores;
                localStorage.setItem('osa_current_store', this.currentStore.id);
            }
            return true;
        }
        return false;
    },

    async loadProfile() {
        if (!this.currentUser) return;
        const sb = getSupabase();
        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        if (error) {
            console.error('Error loading profile:', error);
            return;
        }
        this.currentProfile = data;
    },

    async loadUserStores() {
        if (!this.currentUser) return;
        const sb = getSupabase();
        const { data, error } = await sb
            .from('store_users')
            .select('*, stores(*)')
            .eq('user_id', this.currentUser.id);
        if (error) {
            console.error('Error loading stores:', error);
            return;
        }
        this.userStores = data || [];
    },

    async login(email, password) {
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase not initialized');

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        this.currentUser = data.user;
        await this.loadProfile();
        await this.loadUserStores();

        const savedStore = localStorage.getItem('osa_current_store');
        if (savedStore) {
            const store = this.userStores.find(s => s.store_id === savedStore);
            if (store) this.currentStore = store.stores;
        }
        if (!this.currentStore && this.userStores.length > 0) {
            this.currentStore = this.userStores[0].stores;
            localStorage.setItem('osa_current_store', this.currentStore.id);
        }
        return data;
    },

    async logout() {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
        this.currentUser = null;
        this.currentProfile = null;
        this.currentStore = null;
        this.userStores = [];
        localStorage.removeItem('osa_current_store');
    },

    async register(email, password, fullName, role = 'cashier') {
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase not initialized');

        const { data, error } = await sb.auth.signUp({
            email, password,
            options: { data: { full_name: fullName, role: role } }
        });
        if (error) throw error;
        return data;
    },

    setCurrentStore(storeId) {
        const store = this.userStores.find(s => s.store_id === storeId);
        if (store) {
            this.currentStore = store.stores;
            localStorage.setItem('osa_current_store', storeId);
            return true;
        }
        return false;
    },

    isAdmin() {
        return this.currentProfile?.role === OSA_CONFIG.ROLES.ADMIN;
    },

    isJuniorAdmin() {
        return this.currentProfile?.role === OSA_CONFIG.ROLES.JUNIOR_ADMIN;
    },

    isCashier() {
        return this.currentProfile?.role === OSA_CONFIG.ROLES.CASHIER;
    },

    canManageUsers() {
        return this.isAdmin();
    },

    canManageStores() {
        return this.isAdmin();
    },

    canManageProducts() {
        return this.isAdmin() || this.isJuniorAdmin();
    },

    canManagePrices() {
        return this.isAdmin() || this.isJuniorAdmin();
    },

    canViewCosts() {
        return this.isAdmin() || this.isJuniorAdmin();
    },

    canSell() {
        return this.isAdmin() || this.isJuniorAdmin() || this.isCashier();
    },

    canManageCash() {
        return this.isAdmin() || this.isJuniorAdmin() || this.isCashier();
    },

    canManageInventory() {
        return this.isAdmin() || this.isJuniorAdmin();
    },

    canViewReports() {
        return this.isAdmin() || this.isJuniorAdmin();
    },

    canDelete() {
        return this.isAdmin();
    }
};

window.Auth = Auth;
