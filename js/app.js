// OSA - Official Shop Administrator
// Aplicação Principal (SPA)

const App = {
    currentPage: 'dashboard',
    currentSubPage: null,
    chartInstances: {},
    tempData: {}, // Dados temporários de formulários

    async init() {
        // Verificar sessão
        const isAuth = await Auth.init();
        if (!isAuth) {
            window.location.href = 'index.html';
            return;
        }
        this.renderLayout();
        this.navigate('dashboard');
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Mobile menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.osa-menu-toggle')) {
                document.querySelector('.osa-sidebar').classList.toggle('open');
            }
            if (e.target.closest('.osa-modal-backdrop') || e.target.closest('.osa-modal-close')) {
                const modal = document.getElementById('osa-modal');
                if (modal) modal.style.display = 'none';
            }
        });
    },

    renderLayout() {
        const store = Auth.currentStore;
        const profile = Auth.currentProfile;
        const stores = Auth.userStores;
        const role = profile?.role || 'cashier';
        const roleLabel = { admin: 'Administrador', junior_admin: 'Administrador Junior', cashier: 'Caixa' }[role];

        const storeOptions = stores.map(s => 
            `<option value="${s.store_id}" ${store?.id === s.store_id ? 'selected' : ''}>${s.stores?.name || 'Loja'}</option>`
        ).join('');

        // Build navigation based on role
        let navHTML = '';

        // Dashboard - all roles
        navHTML += this.navSection('Principal', [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' }
        ]);

        // Operation
        const operationItems = [];
        if (Auth.canSell()) operationItems.push({ id: 'sales', label: 'Vendas', icon: '🛒' });
        if (Auth.canManageCash()) operationItems.push({ id: 'cash', label: 'Caixa', icon: '💰' });
        if (Auth.canManageProducts()) operationItems.push({ id: 'products', label: 'Produtos', icon: '📦' });
        if (Auth.canManageInventory()) {
            operationItems.push({ id: 'warehouse', label: 'Armazém', icon: '🏭' });
            operationItems.push({ id: 'store-stock', label: 'Loja', icon: '🏪' });
            operationItems.push({ id: 'transfers', label: 'Transferências', icon: '🚚' });
        }
        if (operationItems.length > 0) {
            navHTML += this.navSection('Operação', operationItems);
        }

        // Stock
        const stockItems = [];
        if (Auth.canManageInventory()) {
            stockItems.push({ id: 'inventory', label: 'Inventário', icon: '📋' });
            stockItems.push({ id: 'losses', label: 'Perdas', icon: '⚠️' });
            stockItems.push({ id: 'thefts', label: 'Furtos', icon: '🚨' });
        }
        if (stockItems.length > 0) {
            navHTML += this.navSection('Estoque', stockItems);
        }

        // Management
        const mgmtItems = [];
        if (Auth.canManageProducts()) mgmtItems.push({ id: 'categories', label: 'Categorias', icon: '🏷️' });
        if (Auth.canManageStores()) {
            mgmtItems.push({ id: 'stores', label: 'Lojas', icon: '🏢' });
            mgmtItems.push({ id: 'users', label: 'Utilizadores', icon: '👥' });
        }
        if (Auth.canManageInventory()) mgmtItems.push({ id: 'fuel', label: 'Combustível', icon: '⛽' });
        if (mgmtItems.length > 0) {
            navHTML += this.navSection('Gestão', mgmtItems);
        }

        // Reports
        if (Auth.canViewReports()) {
            navHTML += this.navSection('Relatórios', [
                { id: 'reports-sales', label: 'Vendas', icon: '📈' },
                { id: 'reports-stock', label: 'Estoque', icon: '📉' },
                { id: 'reports-movements', label: 'Movimentações', icon: '📑' },
                { id: 'reports-audit', label: 'Auditoria', icon: '🔍' }
            ]);
        }

        // System
        const sysItems = [{ id: 'closing', label: 'Fechamento', icon: '🔒' }];
        if (Auth.canManageStores()) {
            sysItems.push({ id: 'settings', label: 'Configurações', icon: '⚙️' });
            sysItems.push({ id: 'diagnostics', label: 'Diagnóstico', icon: '🔧' });
        }
        navHTML += this.navSection('Sistema', sysItems);

        document.body.innerHTML = `
            <div class="osa-app">
                <aside class="osa-sidebar">
                    <div class="osa-sidebar-header">
                        <div class="osa-sidebar-brand">
                            <h2>OSA</h2>
                            <p>OFFICIAL SHOP ADMINISTRATOR</p>
                        </div>
                    </div>
                    <div class="osa-store-selector">
                        <select id="store-selector" onchange="App.changeStore(this.value)">
                            ${storeOptions}
                        </select>
                    </div>
                    <nav class="osa-nav">${navHTML}</nav>
                    <div class="osa-sidebar-footer">
                        <div class="osa-user-info">
                            <div class="osa-user-avatar">${(profile?.full_name || 'U').charAt(0).toUpperCase()}</div>
                            <div class="osa-user-details">
                                <div class="osa-user-name">${profile?.full_name || profile?.email || 'Utilizador'}</div>
                                <div class="osa-user-role">${roleLabel}</div>
                            </div>
                        </div>
                        <button class="osa-logout-btn" onclick="App.logout()">Terminar Sessão</button>
                    </div>
                </aside>
                <main class="osa-main">
                    <header class="osa-topbar">
                        <div class="osa-topbar-left">
                            <button class="osa-menu-toggle">☰</button>
                            <h1 class="osa-page-title" id="page-title">Dashboard</h1>
                        </div>
                        <div class="osa-topbar-right">
                            <div class="osa-store-badge">
                                <span class="dot"></span>
                                <span>${store?.name || 'Sem Loja'}</span>
                            </div>
                        </div>
                    </header>
                    <div class="osa-content" id="osa-content"></div>
                </main>
            </div>
        `;
    },

    navSection(label, items) {
        const itemsHTML = items.map(item => `
            <button class="osa-nav-item ${this.currentPage === item.id ? 'active' : ''}" 
                    onclick="App.navigate('${item.id}')">
                <span class="icon">${item.icon}</span>
                <span>${item.label}</span>
            </button>
        `).join('');
        return `
            <div class="osa-nav-section">
                <div class="osa-nav-label">${label}</div>
                ${itemsHTML}
            </div>
        `;
    },

    navigate(page, subPage = null) {
        this.currentPage = page;
        this.currentSubPage = subPage;

        // Update active nav
        document.querySelectorAll('.osa-nav-item').forEach(el => el.classList.remove('active'));
        const activeBtn = document.querySelector(`.osa-nav-item[onclick*="'${page}'"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            sales: 'Vendas', cash: 'Caixa', products: 'Produtos',
            warehouse: 'Armazém', 'store-stock': 'Loja', transfers: 'Transferências',
            inventory: 'Inventário', losses: 'Perdas', thefts: 'Furtos',
            categories: 'Categorias', stores: 'Lojas', users: 'Utilizadores', fuel: 'Combustível',
            'reports-sales': 'Relatório de Vendas', 'reports-stock': 'Relatório de Estoque',
            'reports-movements': 'Relatório de Movimentações', 'reports-audit': 'Auditoria',
            closing: 'Fechamento do Dia', settings: 'Configurações', diagnostics: 'Diagnóstico'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        // Render content
        const content = document.getElementById('osa-content');
        content.innerHTML = '';

        switch(page) {
            case 'dashboard': this.renderDashboard(content); break;
            case 'sales': this.renderSales(content); break;
            case 'cash': this.renderCash(content); break;
            case 'products': this.renderProducts(content); break;
            case 'warehouse': this.renderWarehouse(content); break;
            case 'store-stock': this.renderStoreStock(content); break;
            case 'transfers': this.renderTransfers(content); break;
            case 'inventory': this.renderInventory(content); break;
            case 'losses': this.renderLosses(content); break;
            case 'thefts': this.renderThefts(content); break;
            case 'categories': this.renderCategories(content); break;
            case 'stores': this.renderStores(content); break;
            case 'users': this.renderUsers(content); break;
            case 'fuel': this.renderFuel(content); break;
            case 'reports-sales': this.renderReportSales(content); break;
            case 'reports-stock': this.renderReportStock(content); break;
            case 'reports-movements': this.renderReportMovements(content); break;
            case 'reports-audit': this.renderReportAudit(content); break;
            case 'closing': this.renderClosing(content); break;
            case 'settings': this.renderSettings(content); break;
            case 'diagnostics': this.renderDiagnostics(content); break;
            default: content.innerHTML = UI.emptyState('Página em desenvolvimento');
        }

        // Close mobile sidebar
        document.querySelector('.osa-sidebar')?.classList.remove('open');
    },

    async changeStore(storeId) {
        if (Auth.setCurrentStore(storeId)) {
            UI.notify('Loja alterada com sucesso', 'success');
            this.renderLayout();
            this.navigate('dashboard');
        }
    },

    async logout() {
        await Auth.logout();
        window.location.href = 'index.html';
    },

    // ========== DASHBOARD ==========
    async renderDashboard(container) {
        const storeId = Auth.currentStore?.id;
        if (!storeId) {
            container.innerHTML = UI.emptyState('Selecione uma loja primeiro');
            return;
        }

        UI.showLoading('A carregar Dashboard...');
        try {
            const stats = await Data.getDashboardStats(storeId, 'today');
            const chartData = await Data.getSalesChartData(storeId, 7);
            const topProducts = await Data.getTopProducts(storeId, 5);

            let statsHTML = '';
            if (Auth.canViewCosts()) {
                statsHTML += UI.statCard('Vendas Hoje', formatCurrency(stats.totalSales), `${stats.transactionCount} transações`, '💰', 'green');
                statsHTML += UI.statCard('Lucro', formatCurrency(stats.totalProfit), `${stats.margin}% margem`, '📈', 'blue');
                statsHTML += UI.statCard('Custo', formatCurrency(stats.totalCost), 'Total de custos', '📉', 'yellow');
            } else {
                statsHTML += UI.statCard('Vendas Hoje', formatCurrency(stats.totalSales), `${stats.transactionCount} transações`, '💰', 'green');
                statsHTML += UI.statCard('Transações', stats.transactionCount, 'Número de vendas', '📊', 'blue');
            }
            statsHTML += UI.statCard('Produtos', stats.productCount, 'Activos no sistema', '📦', 'blue');
            statsHTML += UI.statCard('Entradas', formatNumber(stats.entries, 0), 'Unidades', '📥', 'green');
            if (Auth.canViewCosts()) {
                statsHTML += UI.statCard('Perdas', formatNumber(stats.losses, 0), 'Unidades', '⚠️', 'red');
            }

            container.innerHTML = `
                <div class="osa-stats-grid">${statsHTML}</div>
                <div class="osa-dashboard-grid">
                    <div class="osa-dashboard-left">
                        <div class="osa-chart-container">
                            <div class="osa-chart-header">
                                <span class="osa-chart-title">Vendas dos Últimos 7 Dias</span>
                            </div>
                            <canvas id="sales-chart" class="osa-chart-canvas"></canvas>
                        </div>
                    </div>
                    <div class="osa-dashboard-right">
                        <div class="osa-chart-container">
                            <div class="osa-chart-header">
                                <span class="osa-chart-title">Produtos Mais Vendidos</span>
                            </div>
                            ${topProducts.length === 0 ? UI.emptyState('Sem dados suficientes') : `
                                <div style="padding: 10px 0;">
                                    ${topProducts.map((p, i) => `
                                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--osa-border);">
                                            <span><strong>#${i+1}</strong> ${p.name}</span>
                                            <span style="font-weight:600;">${formatNumber(p.quantity)} un</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                        <div class="osa-chart-container">
                            <div class="osa-chart-header">
                                <span class="osa-chart-title">Caixa Aberto</span>
                            </div>
                            ${stats.openCashRegisters.length === 0 ? 
                                '<p style="color:var(--osa-text-muted);padding:10px;">Nenhum caixa aberto</p>' :
                                stats.openCashRegisters.map(r => `
                                    <div style="padding:10px 0;border-bottom:1px solid var(--osa-border);">
                                        <strong>${r.register_name}</strong><br>
                                        <span style="color:var(--osa-text-muted);font-size:12px;">
                                            Aberto: ${formatDate(r.opened_at, true)}<br>
                                            Montante: ${formatCurrency(r.opening_amount)}
                                        </span>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            `;

            // Draw chart
            setTimeout(() => this.drawBarChart('sales-chart', chartData.labels, chartData.values, 'Vendas (MZN)'), 100);

        } catch (error) {
            container.innerHTML = `<div class="osa-empty-state"><p>Erro ao carregar Dashboard: ${UI.formatError(error)}</p></div>`;
        } finally {
            UI.hideLoading();
        }
    },

    drawBarChart(canvasId, labels, values, label) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const padding = { top: 30, right: 20, bottom: 50, left: 60 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const maxVal = Math.max(...values, 1);
        const barWidth = chartW / values.length * 0.6;
        const barGap = chartW / values.length * 0.4;

        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + chartH - (i / 5) * chartH;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatNumber((maxVal / 5) * i, 0), padding.left - 8, y + 4);
        }

        // Bars
        values.forEach((val, i) => {
            const x = padding.left + i * (barWidth + barGap) + barGap / 2;
            const barH = (val / maxVal) * chartH;
            const y = padding.top + chartH - barH;

            ctx.fillStyle = '#2563eb';
            ctx.fillRect(x, y, barWidth, barH);

            // Value on top
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(formatNumber(val, 0), x + barWidth / 2, y - 6);

            // Label
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.save();
            ctx.translate(x + barWidth / 2, h - padding.bottom + 15);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(labels[i], 0, 0);
            ctx.restore();
        });
    },

    // ========== PRODUCTS ==========
    async renderProducts(container) {
        const storeId = Auth.currentStore?.id;
        if (!storeId) { container.innerHTML = UI.emptyState('Selecione uma loja'); return; }

        container.innerHTML = `
            <div class="osa-page-header">
                <h2>Produtos</h2>
                <button class="osa-btn osa-btn-primary" onclick="App.showProductForm()">+ Novo Produto</button>
            </div>
            <div class="osa-filters">
                <input type="text" id="product-search" placeholder="Pesquisar produto..." oninput="App.filterProducts()">
                <select id="product-category-filter" onchange="App.filterProducts()">
                    <option value="">Todas as categorias</option>
                </select>
            </div>
            <div id="products-table"></div>
        `;

        // Load categories for filter
        try {
            const categories = await Data.getCategories(storeId);
            const select = document.getElementById('product-category-filter');
            categories.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        } catch(e) { console.error(e); }

        await this.loadProducts();
    },

    async loadProducts() {
        const storeId = Auth.currentStore?.id;
        const search = document.getElementById('product-search')?.value || '';
        const categoryId = document.getElementById('product-category-filter')?.value || '';
        const container = document.getElementById('products-table');

        UI.showLoading();
        try {
            const products = await Data.getProducts(storeId, { search, categoryId });
            const categories = await Data.getCategories(storeId);
            const catMap = {};
            categories.forEach(c => catMap[c.id] = c.name);

            const headers = ['Código', 'Nome', 'Categoria', 'Unidade', 'Preço Venda', 'Estado', 'Ações'];
            const rows = products.map(p => [
                p.code,
                p.name,
                catMap[p.category_id] || '-',
                p.unit,
                formatCurrency(p.sale_price),
                p.is_active ? '<span class="osa-badge osa-badge-success">Activo</span>' : '<span class="osa-badge osa-badge-neutral">Inactivo</span>',
                `<div class="actions">
                    <button class="btn-view" onclick="App.viewProduct('${p.id}')">Ver</button>
                    ${Auth.canManageProducts() ? `<button class="btn-edit" onclick="App.editProduct('${p.id}')">Editar</button>` : ''}
                    ${Auth.canDelete() ? `<button class="btn-delete" onclick="App.deleteProduct('${p.id}')">Eliminar</button>` : ''}
                </div>`
            ]);

            container.innerHTML = UI.buildTable(headers, rows, { emptyMessage: 'Nenhum produto encontrado.' });
        } catch (error) {
            container.innerHTML = `<p class="osa-text-danger">Erro: ${UI.formatError(error)}</p>`;
        } finally {
            UI.hideLoading();
        }
    },

    filterProducts() { this.loadProducts(); },

    async showProductForm(product = null) {
        const storeId = Auth.currentStore?.id;
        const categories = await Data.getCategories(storeId);
        const catOptions = categories.map(c => ({ value: c.id, label: c.name, selected: product?.category_id === c.id }));

        const isEdit = !!product;
        const title = isEdit ? 'Editar Produto' : 'Novo Produto';

        const fields = [
            { name: 'code', label: 'Código', required: true, value: product?.code || '' },
            { name: 'name', label: 'Nome do Produto', required: true, value: product?.name || '' },
            { name: 'category_id', label: 'Categoria', type: 'select', options: [{ value: '', label: 'Sem categoria' }, ...catOptions], value: product?.category_id || '' },
            { name: 'unit', label: 'Unidade', value: product?.unit || 'un', placeholder: 'ex: un, kg, lt, cx' },
            { name: 'description', label: 'Descrição', type: 'textarea', value: product?.description || '' },
            { name: 'location', label: 'Localização', value: product?.location || '' }
        ];

        if (Auth.canViewCosts()) {
            fields.push(
                { name: 'cost_price', label: 'Preço de Custo', type: 'number', step: 0.01, value: product?.cost_price || 0 },
                { name: 'price_method', label: 'Método de Preço', type: 'select', options: [
                    { value: 'margin', label: 'Margem (%)', selected: product?.price_method !== 'direct' },
                    { value: 'direct', label: 'Preço Directo', selected: product?.price_method === 'direct' }
                ]},
                { name: 'margin', label: 'Margem (%)', type: 'number', step: 0.01, value: product?.margin || 25 },
                { name: 'sale_price', label: 'Preço de Venda', type: 'number', step: 0.01, value: product?.sale_price || 0 }
            );
        }

        const content = UI.buildForm(fields, { id: 'product-form', submitText: isEdit ? 'Actualizar' : 'Guardar' });

        await UI.showModal(title, content, { confirm: false, cancel: true });

        // Setup form submit
        setTimeout(() => {
            const form = document.getElementById('product-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const data = UI.getFormData('product-form');
                    data.store_id = storeId;
                    data.is_active = true;

                    // Calculate sale price if margin method
                    if (data.price_method === 'margin' && data.cost_price && data.margin) {
                        data.sale_price = parseFloat(data.cost_price) * (1 + parseFloat(data.margin) / 100);
                    }

                    UI.showLoading(isEdit ? 'A actualizar...' : 'A guardar...');
                    try {
                        if (isEdit) {
                            await Data.updateProduct(product.id, data);
                            UI.notify('Produto actualizado com sucesso', 'success');
                        } else {
                            const newProduct = await Data.createProduct(data);
                            UI.notify('Produto criado com sucesso', 'success');
                            // Prompt for initial stock entry
                            const doEntry = await UI.confirm('Deseja registar a entrada inicial no armazém?');
                            if (doEntry) {
                                document.getElementById('osa-modal').style.display = 'none';
                                this.showStockEntryForm(newProduct.id);
                                return;
                            }
                        }
                        document.getElementById('osa-modal').style.display = 'none';
                        this.loadProducts();
                    } catch (error) {
                        UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
                    } finally {
                        UI.hideLoading();
                    }
                });
            }
        }, 100);
    },

    async viewProduct(id) {
        try {
            const product = await Data.getProduct(id);
            const stock = await Data.getProductStock(id);
            const content = `
                <div class="osa-form">
                    <p><strong>Código:</strong> ${product.code}</p>
                    <p><strong>Nome:</strong> ${product.name}</p>
                    <p><strong>Unidade:</strong> ${product.unit}</p>
                    <p><strong>Descrição:</strong> ${product.description || '-'}</p>
                    <p><strong>Localização:</strong> ${product.location || '-'}</p>
                    ${Auth.canViewCosts() ? `
                        <p><strong>Custo:</strong> ${formatCurrency(product.cost_price)}</p>
                        <p><strong>Margem:</strong> ${product.margin}%</p>
                        <p><strong>Preço Venda:</strong> ${formatCurrency(product.sale_price)}</p>
                    ` : `<p><strong>Preço Venda:</strong> ${formatCurrency(product.sale_price)}</p>`}
                    <p><strong>Estoque Calculado:</strong> ${formatNumber(stock, 2)} ${product.unit}</p>
                </div>
            `;
            await UI.showModal('Detalhes do Produto', content, { confirm: false, cancel: false });
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        }
    },

    async editProduct(id) {
        try {
            const product = await Data.getProduct(id);
            this.showProductForm(product);
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        }
    },

    async deleteProduct(id) {
        const confirmed = await UI.confirm('Tem certeza que deseja eliminar este produto? Esta acção não pode ser desfeita.');
        if (!confirmed) return;

        UI.showLoading('A eliminar...');
        try {
            await Data.deleteProduct(id);
            UI.notify('Produto eliminado com sucesso', 'success');
            this.loadProducts();
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        } finally {
            UI.hideLoading();
        }
    },

    // ========== CATEGORIES ==========
    async renderCategories(container) {
        container.innerHTML = `
            <div class="osa-page-header">
                <h2>Categorias</h2>
                <button class="osa-btn osa-btn-primary" onclick="App.showCategoryForm()">+ Nova Categoria</button>
            </div>
            <div id="categories-table"></div>
        `;
        await this.loadCategories();
    },

    async loadCategories() {
        const storeId = Auth.currentStore?.id;
        const container = document.getElementById('categories-table');
        UI.showLoading();
        try {
            const categories = await Data.getCategories(storeId);
            const headers = ['Nome', 'Descrição', 'Estado', 'Ações'];
            const rows = categories.map(c => [
                c.name,
                c.description || '-',
                c.is_active ? '<span class="osa-badge osa-badge-success">Activa</span>' : '<span class="osa-badge osa-badge-neutral">Inactiva</span>',
                `<div class="actions">
                    <button class="btn-edit" onclick="App.editCategory('${c.id}')">Editar</button>
                    ${Auth.canDelete() ? `<button class="btn-delete" onclick="App.deleteCategory('${c.id}')">Eliminar</button>` : ''}
                </div>`
            ]);
            container.innerHTML = UI.buildTable(headers, rows, { emptyMessage: 'Nenhuma categoria encontrada.' });
        } catch (error) {
            container.innerHTML = `<p class="osa-text-danger">Erro: ${UI.formatError(error)}</p>`;
        } finally {
            UI.hideLoading();
        }
    },

    async showCategoryForm(category = null) {
        const isEdit = !!category;
        const fields = [
            { name: 'name', label: 'Nome', required: true, value: category?.name || '' },
            { name: 'description', label: 'Descrição', type: 'textarea', value: category?.description || '' }
        ];
        const content = UI.buildForm(fields, { id: 'category-form', submitText: isEdit ? 'Actualizar' : 'Guardar' });
        await UI.showModal(isEdit ? 'Editar Categoria' : 'Nova Categoria', content, { confirm: false, cancel: true });

        setTimeout(() => {
            const form = document.getElementById('category-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const data = UI.getFormData('category-form');
                    data.store_id = Auth.currentStore?.id;

                    UI.showLoading(isEdit ? 'A actualizar...' : 'A guardar...');
                    try {
                        if (isEdit) {
                            await Data.updateCategory(category.id, data);
                            UI.notify('Categoria actualizada', 'success');
                        } else {
                            await Data.createCategory(data);
                            UI.notify('Categoria criada', 'success');
                        }
                        document.getElementById('osa-modal').style.display = 'none';
                        this.loadCategories();
                    } catch (error) {
                        UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
                    } finally {
                        UI.hideLoading();
                    }
                });
            }
        }, 100);
    },

    async editCategory(id) {
        try {
            const cats = await Data.getCategories(Auth.currentStore?.id);
            const cat = cats.find(c => c.id === id);
            if (cat) this.showCategoryForm(cat);
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        }
    },

    async deleteCategory(id) {
        const confirmed = await UI.confirm('Eliminar esta categoria?');
        if (!confirmed) return;
        UI.showLoading('A eliminar...');
        try {
            await Data.deleteCategory(id);
            UI.notify('Categoria eliminada', 'success');
            this.loadCategories();
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        } finally {
            UI.hideLoading();
        }
    },

    // ========== WAREHOUSE / STOCK ENTRY ==========
    async renderWarehouse(container) {
        container.innerHTML = `
            <div class="osa-page-header">
                <h2>Armazém</h2>
                <button class="osa-btn osa-btn-primary" onclick="App.showStockEntryForm()">+ Nova Entrada</button>
            </div>
            <div class="osa-filters">
                <input type="text" id="wh-search" placeholder="Pesquisar produto..." oninput="App.loadWarehouse()">
            </div>
            <div id="warehouse-table"></div>
        `;
        await this.loadWarehouse();
    },

    async loadWarehouse() {
        const storeId = Auth.currentStore?.id;
        const search = document.getElementById('wh-search')?.value || '';
        const container = document.getElementById('warehouse-table');

        UI.showLoading();
        try {
            const products = await Data.getProducts(storeId, { search });
            const movements = await Data.getStockMovements(storeId, { limit: 100 });

            // Calculate stock per product from movements
            const stockMap = {};
            movements.forEach(m => {
                const pid = m.product_id;
                if (!stockMap[pid]) stockMap[pid] = { warehouse: 0, store: 0 };
                const qty = parseFloat(m.quantity);
                if (m.movement_type === 'entry') stockMap[pid].warehouse += qty;
                else if (m.movement_type === 'transfer_out' && m.origin === 'warehouse') stockMap[pid].warehouse -= qty;
                else if (m.movement_type === 'transfer_in' && m.destination === 'warehouse') stockMap[pid].warehouse += qty;
                else if (m.movement_type === 'loss' && m.origin === 'warehouse') stockMap[pid].warehouse -= qty;
                else if (m.movement_type === 'theft' && m.origin === 'warehouse') stockMap[pid].warehouse -= qty;
                else if (m.movement_type === 'inventory_adjustment' && m.origin === 'warehouse') {
                    // For adjustments, we need to track differently - simplified here
                }
            });

            const headers = ['Código', 'Produto', 'Est. Armazém', 'Est. Loja', 'Custo', 'Valor Est.'];
            const rows = products.map(p => {
                const whStock = stockMap[p.id]?.warehouse || 0;
                const storeStock = stockMap[p.id]?.store || 0;
                const stockValue = whStock * (p.cost_price || 0);
                return [
                    p.code,
                    p.name,
                    formatNumber(whStock, 2) + ' ' + p.unit,
                    formatNumber(storeStock, 2) + ' ' + p.unit,
                    Auth.canViewCosts() ? formatCurrency(p.cost_price) : '-',
                    Auth.canViewCosts() ? formatCurrency(stockValue) : '-'
                ];
            });

            container.innerHTML = UI.buildTable(headers, rows, { emptyMessage: 'Nenhum produto no armazém.' });
        } catch (error) {
            container.innerHTML = `<p class="osa-text-danger">Erro: ${UI.formatError(error)}</p>`;
        } finally {
            UI.hideLoading();
        }
    },

    async showStockEntryForm(productId = null) {
        const storeId = Auth.currentStore?.id;
        const products = await Data.getProducts(storeId);
        const prodOptions = products.map(p => ({ value: p.id, label: `${p.code} - ${p.name}`, selected: p.id === productId }));

        const fields = [
            { name: 'product_id', label: 'Produto', type: 'select', required: true, options: prodOptions },
            { name: 'quantity', label: 'Quantidade', type: 'number', step: 0.001, required: true, value: 1 },
            { name: 'unit_cost', label: 'Custo Unitário', type: 'number', step: 0.01, value: 0 },
            { name: 'notes', label: 'Observações', type: 'textarea', placeholder: 'Fornecedor, nota fiscal, etc.' }
        ];

        const content = UI.buildForm(fields, { id: 'entry-form', submitText: 'Registar Entrada' });
        await UI.showModal('Entrada no Armazém', content, { confirm: false, cancel: true });

        setTimeout(() => {
            const form = document.getElementById('entry-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const data = UI.getFormData('entry-form');

                    UI.showLoading('A registar entrada...');
                    try {
                        const product = products.find(p => p.id === data.product_id);
                        const cost = parseFloat(data.unit_cost) || product?.cost_price || 0;

                        await Data.createStockMovement({
                            store_id: storeId,
                            product_id: data.product_id,
                            movement_type: 'entry',
                            origin: 'supplier',
                            destination: 'warehouse',
                            quantity: parseFloat(data.quantity),
                            unit_cost: cost,
                            total_cost: cost * parseFloat(data.quantity),
                            user_id: Auth.currentUser?.id,
                            notes: data.notes
                        });

                        // Update product cost if changed
                        if (cost > 0 && product && cost !== product.cost_price) {
                            await Data.updateProduct(product.id, { cost_price: cost });
                        }

                        UI.notify('Entrada registada com sucesso', 'success');
                        document.getElementById('osa-modal').style.display = 'none';
                        if (this.currentPage === 'warehouse') this.loadWarehouse();
                        if (this.currentPage === 'products') this.loadProducts();
                    } catch (error) {
                        UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
                    } finally {
                        UI.hideLoading();
                    }
                });
            }
        }, 100);
    },

    // ========== STORE STOCK ==========
    async renderStoreStock(container) {
        container.innerHTML = `
            <div class="osa-page-header">
                <h2>Estoque da Loja</h2>
            </div>
            <div class="osa-filters">
                <input type="text" id="ss-search" placeholder="Pesquisar..." oninput="App.loadStoreStock()">
            </div>
            <div id="store-stock-table"></div>
        `;
        await this.loadStoreStock();
    },

    async loadStoreStock() {
        const storeId = Auth.currentStore?.id;
        const search = document.getElementById('ss-search')?.value || '';
        const container = document.getElementById('store-stock-table');

        UI.showLoading();
        try {
            const products = await Data.getProducts(storeId, { search });
            const movements = await Data.getStockMovements(storeId, { limit: 200 });

            const stockMap = {};
            movements.forEach(m => {
                const pid = m.product_id;
                if (!stockMap[pid]) stockMap[pid] = 0;
                const qty = parseFloat(m.quantity);
                if (m.movement_type === 'transfer_in' && m.destination === 'store') stockMap[pid] += qty;
                else if (m.movement_type === 'sale') stockMap[pid] -= qty;
                else if (m.movement_type === 'return' && m.destination === 'store') stockMap[pid] += qty;
                else if (m.movement_type === 'loss' && m.origin === 'store') stockMap[pid] -= qty;
                else if (m.movement_type === 'theft' && m.origin === 'store') stockMap[pid] -= qty;
            });

            const headers = ['Código', 'Produto', 'Stock Loja', 'Preço Venda', 'Valor'];
            const rows = products.map(p => {
                const stock = stockMap[p.id] || 0;
                return [
                    p.code,
                    p.name,
                    formatNumber(stock, 2) + ' ' + p.unit,
                    formatCurrency(p.sale_price),
                    formatCurrency(stock * p.sale_price)
                ];
            });

            container.innerHTML = UI.buildTable(headers, rows, { emptyMessage: 'Nenhum produto na loja.' });
        } catch (error) {
            container.innerHTML = `<p class="osa-text-danger">Erro: ${UI.formatError(error)}</p>`;
        } finally {
            UI.hideLoading();
        }
    },

    // ========== TRANSFERS ==========
    async renderTransfers(container) {
        container.innerHTML = `
            <div class="osa-page-header">
                <h2>Transferências</h2>
                <button class="osa-btn osa-btn-primary" onclick="App.showTransferForm()">+ Nova Transferência</button>
            </div>
            <div id="transfers-table"></div>
        `;
        await this.loadTransfers();
    },

    async loadTransfers() {
        const storeId = Auth.currentStore?.id;
        const container = document.getElementById('transfers-table');
        UI.showLoading();
        try {
            const transfers = await Data.getTransfers(storeId);
            const headers = ['Data', 'Origem', 'Destino', 'Itens', 'Estado', 'Ações'];
            const rows = transfers.map(t => [
                formatDate(t.created_at, true),
                t.from_location === 'warehouse' ? 'Armazém' : 'Loja',
                t.to_location === 'warehouse' ? 'Armazém' : 'Loja',
                t.total_items || 0,
                t.status === 'pending' ? '<span class="osa-badge osa-badge-warning">Pendente</span>' :
                t.status === 'completed' ? '<span class="osa-badge osa-badge-success">Concluída</span>' :
                '<span class="osa-badge osa-badge-danger">Cancelada</span>',
                `<div class="actions">
                    <button class="btn-view" onclick="App.viewTransfer('${t.id}')">Ver</button>
                    ${t.status === 'pending' ? `<button class="btn-edit" onclick="App.completeTransfer('${t.id}')">Concluir</button>` : ''}
                </div>`
            ]);
            container.innerHTML = UI.buildTable(headers, rows, { emptyMessage: 'Nenhuma transferência encontrada.' });
        } catch (error) {
            container.innerHTML = `<p class="osa-text-danger">Erro: ${UI.formatError(error)}</p>`;
        } finally {
            UI.hideLoading();
        }
    },

    async showTransferForm() {
        const storeId = Auth.currentStore?.id;
        const products = await Data.getProducts(storeId);

        this.tempData.transferItems = [];

        const content = `
            <form id="transfer-form" class="osa-form">
                <div class="osa-form-row">
                    <div class="osa-form-group">
                        <label>Origem *</label>
                        <select name="from_location" required>
                            <option value="warehouse">Armazém</option>
                            <option value="store">Loja</option>
                        </select>
                    </div>
                    <div class="osa-form-group">
                        <label>Destino *</label>
                        <select name="to_location" required>
                            <option value="store">Loja</option>
                            <option value="warehouse">Armazém</option>
                        </select>
                    </div>
                </div>
                <div class="osa-form-group">
                    <label>Observações</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>
                <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--osa-border);">
                <h4 style="margin-bottom: 12px;">Itens da Transferência</h4>
                <div class="osa-product-search">
                    <input type="text" id="transfer-product-search" placeholder="Pesquisar produto..." autocomplete="off">
                    <div id="transfer-search-results" class="osa-product-search-results" style="display:none;"></div>
                </div>
                <div id="transfer-items-list" style="margin-bottom: 16px;"></div>
                <div class="osa-form-actions">
                    <button type="submit" class="osa-btn osa-btn-primary">Criar Transferência</button>
                </div>
            </form>
        `;

        await UI.showModal('Nova Transferência', content, { confirm: false, cancel: true });

        setTimeout(() => {
            // Product search
            const searchInput = document.getElementById('transfer-product-search');
            const resultsDiv = document.getElementById('transfer-search-results');

            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                if (term.length < 2) { resultsDiv.style.display = 'none'; return; }
                const matches = products.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term));
                resultsDiv.innerHTML = matches.map(p => `
                    <div class="osa-product-search-item" data-id="${p.id}">
                        <span>${p.code} - ${p.name}</span>
                        <span class="price">${formatCurrency(p.sale_price)}</span>
                    </div>
                `).join('');
                resultsDiv.style.display = matches.length ? 'block' : 'none';

                resultsDiv.querySelectorAll('.osa-product-search-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const pid = item.dataset.id;
                        const prod = products.find(p => p.id === pid);
                        if (prod && !this.tempData.transferItems.find(i => i.product_id === pid)) {
                            this.tempData.transferItems.push({ product_id: pid, product: prod, quantity: 1, unit_cost: prod.cost_price || 0 });
                            this.renderTransferItems();
                        }
                        searchInput.value = '';
                        resultsDiv.style.display = 'none';
                    });
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.osa-product-search')) resultsDiv.style.display = 'none';
            });

            // Form submit
            document.getElementById('transfer-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                if (this.tempData.transferItems.length === 0) {
                    UI.notify('Adicione pelo menos um item', 'warning');
                    return;
                }

                const formData = new FormData(e.target);
                const fromLoc = formData.get('from_location');
                const toLoc = formData.get('to_location');

                if (fromLoc === toLoc) {
                    UI.notify('Origem e destino devem ser diferentes', 'warning');
                    return;
                }

                UI.showLoading('A criar transferência...');
                try {
                    // Validate stock for warehouse origin
                    if (fromLoc === 'warehouse') {
                        for (const item of this.tempData.transferItems) {
                            const stock = await Data.getProductStock(item.product_id);
                            if (stock < item.quantity) {
                                throw new Error(`Stock insuficiente para ${item.product.name}. Disponível: ${stock}`);
                            }
                        }
                    }

                    const transferData = {
                        store_id: storeId,
                        from_location: fromLoc,
                        to_location: toLoc,
                        total_items: this.tempData.transferItems.length,
                        total_quantity: this.tempData.transferItems.reduce((s, i) => s + i.quantity, 0),
                        user_id: Auth.currentUser?.id,
                        notes: formData.get('notes'),
                        status: 'pending'
                    };

                    const items = this.tempData.transferItems.map(i => ({
                        product_id: i.product_id,
                        quantity: i.quantity,
                        unit_cost: i.unit_cost
                    }));

                    await Data.createTransfer(transferData, items);
                    UI.notify('Transferência criada com sucesso', 'success');
                    document.getElementById('osa-modal').style.display = 'none';
                    this.loadTransfers();
                } catch (error) {
                    UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        }, 100);
    },

    renderTransferItems() {
        const container = document.getElementById('transfer-items-list');
        if (!container) return;
        if (this.tempData.transferItems.length === 0) {
            container.innerHTML = '<p style="color:var(--osa-text-muted);font-size:13px;">Nenhum item adicionado</p>';
            return;
        }
        container.innerHTML = `
            <table class="osa-table" style="font-size:13px;">
                <thead><tr><th>Produto</th><th>Qtd</th><th></th></tr></thead>
                <tbody>
                    ${this.tempData.transferItems.map((item, idx) => `
                        <tr>
                            <td>${item.product.code} - ${item.product.name}</td>
                            <td><input type="number" step="0.001" value="${item.quantity}" style="width:80px;padding:4px;" onchange="App.updateTransferItemQty(${idx}, this.value)"></td>
                            <td><button type="button" class="osa-btn osa-btn-danger" style="padding:4px 8px;font-size:11px;" onclick="App.removeTransferItem(${idx})">Remover</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    updateTransferItemQty(idx, qty) {
        this.tempData.transferItems[idx].quantity = parseFloat(qty) || 1;
    },

    removeTransferItem(idx) {
        this.tempData.transferItems.splice(idx, 1);
        this.renderTransferItems();
    },

    async viewTransfer(id) {
        try {
            // Fetch transfer details from transfers list (simplified)
            const storeId = Auth.currentStore?.id;
            const transfers = await Data.getTransfers(storeId);
            const transfer = transfers.find(t => t.id === id);
            if (!transfer) throw new Error('Transferência não encontrada');

            const itemsHTML = (transfer.transfer_items || []).map(i => `
                <tr><td>${i.products?.name || '?'}</td><td>${formatNumber(i.quantity, 2)}</td><td>${formatCurrency(i.unit_cost)}</td></tr>
            `).join('');

            const content = `
                <div class="osa-form">
                    <p><strong>Origem:</strong> ${transfer.from_location === 'warehouse' ? 'Armazém' : 'Loja'}</p>
                    <p><strong>Destino:</strong> ${transfer.to_location === 'warehouse' ? 'Armazém' : 'Loja'}</p>
                    <p><strong>Estado:</strong> ${transfer.status}</p>
                    <p><strong>Observações:</strong> ${transfer.notes || '-'}</p>
                    <p><strong>Data:</strong> ${formatDate(transfer.created_at, true)}</p>
                    <h4 style="margin-top:16px;margin-bottom:8px;">Itens</h4>
                    <table class="osa-table" style="font-size:13px;">
                        <thead><tr><th>Produto</th><th>Qtd</th><th>Custo</th></tr></thead>
                        <tbody>${itemsHTML}</tbody>
                    </table>
                </div>
            `;
            await UI.showModal('Detalhes da Transferência', content, { confirm: false, cancel: false });
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        }
    },

    async completeTransfer(id) {
        const confirmed = await UI.confirm('Confirmar conclusão desta transferência? O stock será movimentado.');
        if (!confirmed) return;

        UI.showLoading('A processar...');
        try {
            await Data.completeTransfer(id, Auth.currentUser?.id);
            UI.notify('Transferência concluída com sucesso', 'success');
            this.loadTransfers();
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        } finally {
            UI.hideLoading();
        }
    },

    // ========== SALES ==========
    async renderSales(container) {
        container.innerHTML = `
            <div class="osa-page-header">
                <h2>Vendas</h2>
                <button class="osa-btn osa-btn-primary" onclick="App.showSaleForm()">+ Nova Venda</button>
            </div>
            <div class="osa-filters">
                <input type="date" id="sale-from" onchange="App.loadSales()">
                <input type="date" id="sale-to" onchange="App.loadSales()">
                <input type="text" id="sale-search" placeholder="Número ou cliente..." oninput="App.loadSales()">
            </div>
            <div id="sales-table"></div>
        `;
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sale-from').value = today;
        document.getElementById('sale-to').value = today;
        await this.loadSales();
    },

    async loadSales() {
        const storeId = Auth.currentStore?.id;
        const from = document.getElementById('sale-from')?.value;
        const to = document.getElementById('sale-to')?.value;
        const search = document.getElementById('sale-search')?.value || '';
        const container = document.getElementById('sales-table');

        UI.showLoading();
        try {
            const options = { from: from ? new Date(from).toISOString() : null, to: to ? new Date(to + 'T23:59:59').toISOString() : null, limit: 50 };
            const sales = await Data.getSales(storeId, options);

            const filtered = search ? sales.filter(s => 
                (s.sale_number || '').toLowerCase().includes(search.toLowerCase()) ||
                (s.customer_name || '').toLowerCase().includes(search.toLowerCase())
            ) : sales;

            const headers = ['Nº', 'Data', 'Cliente', 'Total', 'Pagamento', 'Estado', 'Ações'];
            const rows = filtered.map(s => [
                s.sale_number || s.id.slice(0, 8),
                formatDate(s.created_at, true),
                s.customer_name || '-',
                formatCurrency(s.total_amount),
                s.payment_method,
                s.is_cancelled ? '<span class="osa-badge osa-badge-danger">Cancelada</span>' : '<span class="osa-badge osa-badge-success">Concluída</span>',
                `<div class="actions">
                    <button class="btn-view" onclick="App.viewSale('${s.id}')">Ver</button>
                    ${!s.is_cancelled ? `<button class="btn-delete" onclick="App.cancelSale('${s.id}')">Cancelar</button>` : ''}
                </div>`
            ]);

            container.innerHTML = UI.buildTable(headers, rows, { emptyMessage: 'Nenhuma venda encontrada.' });
        } catch (error) {
            container.innerHTML = `<p class="osa-text-danger">Erro: ${UI.formatError(error)}</p>`;
        } finally {
            UI.hideLoading();
        }
    },

    async showSaleForm() {
        const storeId = Auth.currentStore?.id;
        const products = await Data.getProducts(storeId);
        const cashRegisters = await Data.getCashRegisters(storeId, { status: 'open' });

        if (cashRegisters.length === 0) {
            UI.notify('Nenhum caixa aberto. Abra um caixa primeiro.', 'warning');
            return;
        }

        this.tempData.saleItems = [];
        this.tempData.saleTotal = 0;

        const content = `
            <form id="sale-form" class="osa-form">
                <div class="osa-form-row">
                    <div class="osa-form-group">
                        <label>Caixa *</label>
                        <select name="cash_register_id" required>
                            ${cashRegisters.map(r => `<option value="${r.id}">${r.register_name} (${formatCurrency(r.opening_amount)})</option>`).join('')}
                        </select>
                    </div>
                    <div class="osa-form-group">
                        <label>Cliente</label>
                        <input type="text" name="customer_name" placeholder="Nome do cliente">
                    </div>
                </div>
                <div class="osa-form-row">
                    <div class="osa-form-group">
                        <label>Método de Pagamento *</label>
                        <select name="payment_method" required>
                            <option value="cash">Dinheiro</option>
                            <option value="card">Cartão</option>
                            <option value="mobile">Mobile</option>
                            <option value="mixed">Misto</option>
                        </select>
                    </div>
                    <div class="osa-form-group">
                        <label>Telefone</label>
                        <input type="text" name="customer_phone" placeholder="Contacto">
                    </div>
                </div>
                <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--osa-border);">
                <h4 style="margin-bottom: 12px;">Itens da Venda</h4>
                <div class="osa-product-search">
                    <input type="text" id="sale-product-search" placeholder="Pesquisar produto..." autocomplete="off">
                    <div id="sale-search-results" class="osa-product-search-results" style="display:none;"></div>
                </div>
                <div id="sale-items-list" style="margin-bottom: 16px;"></div>
                <div class="osa-sale-total">
                    <span>TOTAL</span>
                    <span id="sale-total-display">${formatCurrency(0)}</span>
                </div>
                <div class="osa-form-row osa-mt-2">
                    <div class="osa-form-group">
                        <label>Valor Pago</label>
                        <input type="number" name="amount_paid" id="sale-amount-paid" step="0.01" value="0" required>
                    </div>
                    <div class="osa-form-group">
                        <label>Troco</label>
                        <input type="number" name="amount_change" id="sale-amount-change" step="0.01" value="0" readonly>
                    </div>
                </div>
                <div class="osa-form-actions">
                    <button type="submit" class="osa-btn osa-btn-primary">Finalizar Venda</button>
                </div>
            </form>
        `;

        await UI.showModal('Nova Venda', content, { confirm: false, cancel: true });

        setTimeout(() => {
            // Product search
            const searchInput = document.getElementById('sale-product-search');
            const resultsDiv = document.getElementById('sale-search-results');

            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                if (term.length < 2) { resultsDiv.style.display = 'none'; return; }
                const matches = products.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term));
                resultsDiv.innerHTML = matches.map(p => `
                    <div class="osa-product-search-item" data-id="${p.id}">
                        <span>${p.code} - ${p.name}</span>
                        <span class="price">${formatCurrency(p.sale_price)}</span>
                    </div>
                `).join('');
                resultsDiv.style.display = matches.length ? 'block' : 'none';

                resultsDiv.querySelectorAll('.osa-product-search-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const pid = item.dataset.id;
                        const prod = products.find(p => p.id === pid);
                        if (prod) {
                            const existing = this.tempData.saleItems.find(i => i.product_id === pid);
                            if (existing) {
                                existing.quantity += 1;
                            } else {
                                this.tempData.saleItems.push({
                                    product_id: pid,
                                    product: prod,
                                    quantity: 1,
                                    unit_cost: prod.cost_price || 0,
                                    unit_price: prod.sale_price || 0
                                });
                            }
                            this.renderSaleItems();
                        }
                        searchInput.value = '';
                        resultsDiv.style.display = 'none';
                    });
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.osa-product-search')) resultsDiv.style.display = 'none';
            });

            // Amount paid change
            document.getElementById('sale-amount-paid').addEventListener('input', (e) => {
                const paid = parseFloat(e.target.value) || 0;
                const change = paid - this.tempData.saleTotal;
                document.getElementById('sale-amount-change').value = change > 0 ? change.toFixed(2) : '0.00';
            });

            // Form submit
            document.getElementById('sale-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                if (this.tempData.saleItems.length === 0) {
                    UI.notify('Adicione pelo menos um item', 'warning');
                    return;
                }

                const formData = new FormData(e.target);
                const amountPaid = parseFloat(formData.get('amount_paid')) || 0;

                if (amountPaid < this.tempData.saleTotal) {
                    UI.notify('Valor pago insuficiente', 'warning');
                    return;
                }

                UI.showLoading('A processar venda...');
                try {
                    // Validate stock
                    for (const item of this.tempData.saleItems) {
                        const stock = await Data.getProductStock(item.product_id);
                        if (stock < item.quantity) {
                            throw new Error(`Stock insuficiente para ${item.product.name}. Disponível: ${stock}`);
                        }
                    }

                    const totalCost = this.tempData.saleItems.reduce((s, i) => s + (i.unit_cost * i.quantity), 0);
                    const totalProfit = this.tempData.saleTotal - totalCost;

                    const saleData = {
                        store_id: storeId,
                        user_id: Auth.currentUser?.id,
                        cash_register_id: formData.get('cash_register_id'),
                        total_amount: this.tempData.saleTotal,
                        total_cost: totalCost,
                        total_profit: totalProfit,
                        payment_method: formData.get('payment_method'),
                        payment_status: 'paid',
                        amount_paid: amountPaid,
                        amount_change: Math.max(0, amountPaid - this.tempData.saleTotal),
                        customer_name: formData.get('customer_name') || null,
                        customer_phone: formData.get('customer_phone') || null
                    };

                    const items = this.tempData.saleItems.map(i => ({
                        product_id: i.product_id,
                        quantity: i.quantity,
                        unit_cost: i.unit_cost,
                        unit_price: i.unit_price,
                        total_price: i.unit_price * i.quantity,
                        total_cost: i.unit_cost * i.quantity,
                        profit: (i.unit_price - i.unit_cost) * i.quantity
                    }));

                    await Data.createSale(saleData, items);
                    UI.notify('Venda registada com sucesso', 'success');
                    document.getElementById('osa-modal').style.display = 'none';
                    this.loadSales();
                } catch (error) {
                    UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        }, 100);
    },

    renderSaleItems() {
        const container = document.getElementById('sale-items-list');
        if (!container) return;

        let total = 0;
        if (this.tempData.saleItems.length === 0) {
            container.innerHTML = '<p style="color:var(--osa-text-muted);font-size:13px;">Nenhum item adicionado</p>';
        } else {
            container.innerHTML = this.tempData.saleItems.map((item, idx) => {
                const itemTotal = item.unit_price * item.quantity;
                total += itemTotal;
                return `
                    <div class="osa-sale-item">
                        <div>
                            <strong>${item.product.name}</strong><br>
                            <small style="color:var(--osa-text-muted);">${formatCurrency(item.unit_price)} / ${item.product.unit}</small>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <input type="number" step="0.001" value="${item.quantity}" style="width:70px;padding:4px;text-align:center;" 
                                   onchange="App.updateSaleItemQty(${idx}, this.value)">
                            <span style="font-weight:600;min-width:100px;text-align:right;">${formatCurrency(itemTotal)}</span>
                            <button type="button" class="osa-btn osa-btn-danger" style="padding:4px 8px;font-size:11px;" onclick="App.removeSaleItem(${idx})">×</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.tempData.saleTotal = total;
        const totalDisplay = document.getElementById('sale-total-display');
        if (totalDisplay) totalDisplay.textContent = formatCurrency(total);
    },

    updateSaleItemQty(idx, qty) {
        this.tempData.saleItems[idx].quantity = parseFloat(qty) || 1;
        this.renderSaleItems();
    },

    removeSaleItem(idx) {
        this.tempData.saleItems.splice(idx, 1);
        this.renderSaleItems();
    },

    async viewSale(id) {
        try {
            const sale = await Data.getSale(id);
            const itemsHTML = (sale.sale_items || []).map(i => `
                <tr>
                    <td>${i.products?.name || '?'}</td>
                    <td>${formatNumber(i.quantity, 2)} ${i.products?.unit || ''}</td>
                    <td>${formatCurrency(i.unit_price)}</td>
                    <td>${formatCurrency(i.total_price)}</td>
                </tr>
            `).join('');

            const content = `
                <div class="osa-form">
                    <p><strong>Número:</strong> ${sale.sale_number || '-'}</p>
                    <p><strong>Data:</strong> ${formatDate(sale.created_at, true)}</p>
                    <p><strong>Cliente:</strong> ${sale.customer_name || '-'}</p>
                    <p><strong>Pagamento:</strong> ${sale.payment_method} - ${sale.payment_status}</p>
                    <p><strong>Total:</strong> ${formatCurrency(sale.total_amount)}</p>
                    ${Auth.canViewCosts() ? `<p><strong>Custo:</strong> ${formatCurrency(sale.total_cost)}</p><p><strong>Lucro:</strong> ${formatCurrency(sale.total_profit)}</p>` : ''}
                    <h4 style="margin-top:16px;margin-bottom:8px;">Itens</h4>
                    <table class="osa-table" style="font-size:13px;">
                        <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
                        <tbody>${itemsHTML}</tbody>
                    </table>
                </div>
            `;
            await UI.showModal('Detalhes da Venda', content, { confirm: false, cancel: false });
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        }
    },

    async cancelSale(id) {
        const confirmed = await UI.confirm('Cancelar esta venda? O stock será reposto.');
        if (!confirmed) return;

        UI.showLoading('A cancelar...');
        try {
            await Data.cancelSale(id, Auth.currentUser?.id);
            UI.notify('Venda cancelada com sucesso', 'success');
            this.loadSales();
        } catch (error) {
            UI.notify(`Erro: ${UI.formatError(error)}`, 'error');
        } finally {
            UI.hideLoading();
        }
    },
