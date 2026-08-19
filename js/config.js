// OSA - Official Shop Administrator
// Configuração Central

const OSA_CONFIG = {
    SUPABASE_URL: 'https://seu-projeto.supabase.co',
    SUPABASE_ANON_KEY: 'sua-chave-anonima-aqui',

    APP_NAME: 'OSA',
    APP_FULL_NAME: 'OFFICIAL SHOP ADMINISTRATOR',
    VERSION: '1.0.0',

    DEFAULT_CURRENCY: 'MZN',
    DEFAULT_LOCALE: 'pt-MZ',

    PAGINATION: { DEFAULT_LIMIT: 20, MAX_LIMIT: 100 },

    ROLES: { ADMIN: 'admin', JUNIOR_ADMIN: 'junior_admin', CASHIER: 'cashier' },

    MOVEMENT_TYPES: {
        ENTRY: 'entry', TRANSFER_IN: 'transfer_in', TRANSFER_OUT: 'transfer_out',
        SALE: 'sale', RETURN: 'return', LOSS: 'loss', THEFT: 'theft',
        INVENTORY_ADJUSTMENT: 'inventory_adjustment', CORRECTION: 'correction'
    },

    PRICE_METHODS: { MARGIN: 'margin', DIRECT: 'direct' }
};

function formatCurrency(value, currency = OSA_CONFIG.DEFAULT_CURRENCY) {
    if (value === null || value === undefined) return `0,00 ${currency}`;
    return new Intl.NumberFormat(OSA_CONFIG.DEFAULT_LOCALE, {
        style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(value) + ` ${currency}`;
}

function formatDate(dateStr, includeTime = false) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    return d.toLocaleDateString(OSA_CONFIG.DEFAULT_LOCALE, opts);
}

function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat(OSA_CONFIG.DEFAULT_LOCALE, {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(value);
}

window.OSA_CONFIG = OSA_CONFIG;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
