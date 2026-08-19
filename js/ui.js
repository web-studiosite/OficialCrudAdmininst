// OSA - UI Utilities

const UI = {
    // Loading overlay
    showLoading(text = 'A carregar...') {
        let overlay = document.getElementById('osa-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'osa-loading-overlay';
            overlay.innerHTML = `
                <div class="osa-loading-content">
                    <div class="osa-spinner"></div>
                    <p class="osa-loading-text">${text}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.osa-loading-text').textContent = text;
            overlay.style.display = 'flex';
        }
    },

    hideLoading() {
        const overlay = document.getElementById('osa-loading-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // Notifications
    notify(message, type = 'info') {
        const container = document.getElementById('osa-notifications') || this.createNotificationContainer();
        const toast = document.createElement('div');
        toast.className = `osa-toast osa-toast-${type}`;
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span class="osa-toast-icon">${icons[type]}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('osa-toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'osa-notifications';
        document.body.appendChild(container);
        return container;
    },

    // Modal
    showModal(title, content, options = {}) {
        return new Promise((resolve) => {
            let modal = document.getElementById('osa-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'osa-modal';
                modal.className = 'osa-modal';
                document.body.appendChild(modal);
            }

            const buttons = [];
            if (options.confirm) buttons.push(`<button class="osa-btn osa-btn-primary" id="osa-modal-confirm">${options.confirmText || 'Confirmar'}</button>`);
            if (options.cancel !== false) buttons.push(`<button class="osa-btn osa-btn-secondary" id="osa-modal-cancel">${options.cancelText || 'Cancelar'}</button>`);

            modal.innerHTML = `
                <div class="osa-modal-backdrop"></div>
                <div class="osa-modal-content">
                    <div class="osa-modal-header">
                        <h3>${title}</h3>
                        <button class="osa-modal-close" id="osa-modal-close">&times;</button>
                    </div>
                    <div class="osa-modal-body">${content}</div>
                    <div class="osa-modal-footer">${buttons.join('')}</div>
                </div>
            `;
            modal.style.display = 'flex';

            const closeModal = (result) => {
                modal.style.display = 'none';
                resolve(result);
            };

            modal.querySelector('#osa-modal-close')?.addEventListener('click', () => closeModal(false));
            modal.querySelector('.osa-modal-backdrop')?.addEventListener('click', () => closeModal(false));
            modal.querySelector('#osa-modal-cancel')?.addEventListener('click', () => closeModal(false));
            modal.querySelector('#osa-modal-confirm')?.addEventListener('click', () => closeModal(true));
        });
    },

    // Confirm dialog
    async confirm(message, title = 'Confirmação') {
        return await this.showModal(title, `<p>${message}</p>`, { confirm: true, cancel: true });
    },

    // Alert dialog
    async alert(message, title = 'Aviso') {
        return await this.showModal(title, `<p>${message}</p>`, { confirm: false, cancel: false });
    },

    // Table builder
    buildTable(headers, rows, options = {}) {
        const emptyMsg = options.emptyMessage || 'Nenhum registo encontrado.';
        if (!rows || rows.length === 0) {
            return `<div class="osa-empty-state"><p>${emptyMsg}</p></div>`;
        }

        let html = '<div class="osa-table-wrap"><table class="osa-table">';
        html += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
        html += '<tbody>';
        rows.forEach(row => {
            html += '<tr>' + row.map(cell => `<td>${cell !== null && cell !== undefined ? cell : '-'}</td>`).join('') + '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    },

    // Form builder
    buildForm(fields, options = {}) {
        let html = `<form id="${options.id || 'osa-form'}" class="osa-form">`;
        fields.forEach(f => {
            const required = f.required ? 'required' : '';
            const value = f.value !== undefined ? `value="${f.value}"` : '';
            const placeholder = f.placeholder ? `placeholder="${f.placeholder}"` : '';

            if (f.type === 'select') {
                html += `<div class="osa-form-group">
                    <label>${f.label}${f.required ? ' *' : ''}</label>
                    <select name="${f.name}" ${required} ${f.disabled ? 'disabled' : ''}>
                        ${f.options?.map(o => `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`).join('') || ''}
                    </select>
                </div>`;
            } else if (f.type === 'textarea') {
                html += `<div class="osa-form-group">
                    <label>${f.label}${f.required ? ' *' : ''}</label>
                    <textarea name="${f.name}" ${placeholder} ${required} ${f.disabled ? 'disabled' : ''} rows="${f.rows || 3}">${f.value || ''}</textarea>
                </div>`;
            } else {
                html += `<div class="osa-form-group">
                    <label>${f.label}${f.required ? ' *' : ''}</label>
                    <input type="${f.type || 'text'}" name="${f.name}" ${value} ${placeholder} ${required} ${f.disabled ? 'disabled' : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.step !== undefined ? `step="${f.step}"` : ''}>
                </div>`;
            }
        });
        if (options.submitText) {
            html += `<div class="osa-form-actions"><button type="submit" class="osa-btn osa-btn-primary">${options.submitText}</button></div>`;
        }
        html += '</form>';
        return html;
    },

    // Parse form data
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        const data = {};
        const elements = form.querySelectorAll('input, select, textarea');
        elements.forEach(el => {
            if (el.type === 'checkbox') {
                data[el.name] = el.checked;
            } else if (el.type === 'number') {
                data[el.name] = el.value ? parseFloat(el.value) : null;
            } else {
                data[el.name] = el.value || null;
            }
        });
        return data;
    },

    // Pagination
    buildPagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';
        let html = '<div class="osa-pagination">';
        html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo;</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += '<span>...</span>';
            }
        }
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&raquo;</button>`;
        html += '</div>';

        setTimeout(() => {
            document.querySelectorAll('.osa-pagination button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.target.dataset.page);
                    if (page && page !== currentPage) onPageChange(page);
                });
            });
        }, 0);

        return html;
    },

    // Empty state
    emptyState(message, icon = '📦') {
        return `<div class="osa-empty-state"><div class="osa-empty-icon">${icon}</div><p>${message}</p></div>`;
    },

    // Card stats
    statCard(title, value, subtitle, icon, color = 'blue') {
        return `
            <div class="osa-stat-card osa-stat-${color}">
                <div class="osa-stat-icon">${icon}</div>
                <div class="osa-stat-info">
                    <div class="osa-stat-value">${value}</div>
                    <div class="osa-stat-title">${title}</div>
                    ${subtitle ? `<div class="osa-stat-subtitle">${subtitle}</div>` : ''}
                </div>
            </div>
        `;
    },

    // Format error from Supabase
    formatError(error) {
        if (!error) return 'Erro desconhecido';
        if (error.message) return error.message;
        if (error.error_description) return error.error_description;
        if (typeof error === 'string') return error;
        return JSON.stringify(error);
    }
};

window.UI = UI;
