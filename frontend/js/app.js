// HoReCa Checklist App
const App = {
    user: null,
    currentPage: 'dashboard',

    async init() {
        if (API.token) {
            try {
                const data = await API.me();
                this.user = data.user;
                this.renderApp();
            } catch {
                API.setToken(null);
                this.renderLogin();
            }
        } else {
            this.renderLogin();
        }
    },

    // ===== LOGIN =====
    renderLogin() {
        document.getElementById('app').innerHTML = `
            <div class="login-page">
                <div class="login-card">
                    <h1>HoReCa Чеклист</h1>
                    <p class="subtitle">Система управления чеклистами для ресторанов и отелей</p>
                    <div id="login-error"></div>
                    <form id="login-form">
                        <div class="form-group">
                            <label>Логин</label>
                            <input type="text" class="form-control" id="login-username" placeholder="Введите логин" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" class="form-control" id="login-password" placeholder="Введите пароль" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block btn-lg">Войти</button>
                    </form>
                    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--gray-200);font-size:12px;color:var(--gray-400);text-align:center">
                        <p><b>Демо-доступ:</b></p>
                        <p>Админ: admin / admin123</p>
                        <p>Менеджер: manager / manager123</p>
                    </div>
                </div>
            </div>`;
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            try {
                const data = await API.login(username, password);
                API.setToken(data.token);
                this.user = data.user;
                this.renderApp();
            } catch (err) {
                document.getElementById('login-error').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
            }
        });
    },

    // ===== MAIN APP =====
    renderApp() {
        const isAdmin = this.user.role === 'admin';
        document.getElementById('app').innerHTML = `
            <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰</button>
            <div class="app-layout">
                <nav class="sidebar">
                    <div class="sidebar-header">
                        <h1>📋 HoReCa Чеклист</h1>
                        <small>Управление чеклистами</small>
                    </div>
                    <div class="sidebar-nav">
                        <div class="nav-section">Основное</div>
                        <button class="nav-item active" data-page="dashboard">
                            <span class="icon">📊</span> Главная
                        </button>
                        <button class="nav-item" data-page="checklists">
                            <span class="icon">✅</span> Мои чеклисты
                        </button>
                        ${isAdmin ? `
                        <div class="nav-section">Управление</div>
                        <button class="nav-item" data-page="templates">
                            <span class="icon">📝</span> Шаблоны
                        </button>
                        <button class="nav-item" data-page="constructor">
                            <span class="icon">🔧</span> Конструктор
                        </button>
                        <button class="nav-item" data-page="users">
                            <span class="icon">👥</span> Пользователи
                        </button>
                        <button class="nav-item" data-page="logs">
                            <span class="icon">📜</span> Журнал действий
                        </button>
                        ` : ''}
                    </div>
                    <div class="sidebar-footer">
                        <div class="user-info">
                            <div class="user-avatar">${this.user.display_name.charAt(0).toUpperCase()}</div>
                            <div class="user-meta">
                                <div class="name">${this.user.display_name}</div>
                                <div class="role">${this.user.role === 'admin' ? 'Администратор' : 'Исполнитель'}</div>
                            </div>
                        </div>
                        <button class="btn btn-outline btn-sm btn-block" onclick="App.doLogout()">Выйти</button>
                    </div>
                </nav>
                <main class="main-content" id="page-content"></main>
            </div>`;

        document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPage = btn.dataset.page;
                this.renderPage(btn.dataset.page);
                document.querySelector('.sidebar').classList.remove('open');
            });
        });

        this.renderPage('dashboard');
    },

    async renderPage(page) {
        const el = document.getElementById('page-content');
        switch (page) {
            case 'dashboard': return this.pageDashboard(el);
            case 'checklists': return this.pageChecklists(el);
            case 'templates': return this.pageTemplates(el);
            case 'constructor': return this.pageConstructor(el);
            case 'users': return this.pageUsers(el);
            case 'logs': return this.pageLogs(el);
        }
    },

    // ===== DASHBOARD =====
    async pageDashboard(el) {
        el.innerHTML = '<p>Загрузка...</p>';
        try {
            const checklists = await API.getChecklists();
            const active = checklists.filter(c => c.status === 'active');
            const completed = checklists.filter(c => c.status === 'completed');

            el.innerHTML = `
                <div class="page-header">
                    <h2>Главная</h2>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="App.showCreateChecklist()">+ Новый чеклист</button>
                    </div>
                </div>
                <div class="stat-cards">
                    <div class="stat-card">
                        <div class="stat-value">${checklists.length}</div>
                        <div class="stat-label">Всего чеклистов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${active.length}</div>
                        <div class="stat-label">Активных</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${completed.length}</div>
                        <div class="stat-label">Завершённых</div>
                    </div>
                </div>
                ${active.length > 0 ? `
                    <h3 style="margin-bottom:12px">Активные чеклисты</h3>
                    <div class="grid grid-2">
                        ${active.map(c => this.renderChecklistCard(c)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="icon">📋</div>
                        <h3>Нет активных чеклистов</h3>
                        <p>Создайте новый чеклист из шаблона</p>
                    </div>
                `}`;
        } catch (err) {
            el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
    },

    renderChecklistCard(c) {
        const items = c.items || [];
        const done = items.filter(i => i.checked).length;
        const total = items.length;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        return `
            <div class="tpl-card" style="cursor:pointer" onclick="App.openChecklist(${c.id})">
                <span class="badge ${c.status === 'completed' ? 'badge-completed' : 'badge-active'}">${c.status === 'completed' ? 'Завершён' : 'Активный'}</span>
                <h3>${this.esc(c.name)}</h3>
                <div class="desc">${c.assignee_name ? 'Исполнитель: ' + this.esc(c.assignee_name) : ''}</div>
                <div class="progress-text">${done} из ${total} (${pct}%)</div>
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width:${pct}%;${c.status === 'completed' ? 'background:var(--success)' : ''}"></div>
                </div>
                <div class="meta">
                    <span>Создан: ${this.formatDate(c.created_at)}</span>
                </div>
            </div>`;
    },

    // ===== CHECKLISTS LIST =====
    async pageChecklists(el) {
        el.innerHTML = '<p>Загрузка...</p>';
        try {
            const checklists = await API.getChecklists();
            el.innerHTML = `
                <div class="page-header">
                    <h2>Мои чеклисты</h2>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="App.showCreateChecklist()">+ Новый чеклист</button>
                    </div>
                </div>
                <div class="filters" id="cl-filters">
                    <button class="filter-chip active" data-filter="all">Все</button>
                    <button class="filter-chip" data-filter="active">Активные</button>
                    <button class="filter-chip" data-filter="completed">Завершённые</button>
                </div>
                <div class="grid grid-2" id="cl-grid">
                    ${checklists.length > 0 ? checklists.map(c => this.renderChecklistCard(c)).join('') :
                    '<div class="empty-state"><div class="icon">📋</div><h3>Чеклистов пока нет</h3></div>'}
                </div>`;

            let currentFilter = 'all';
            document.getElementById('cl-filters').addEventListener('click', (e) => {
                if (!e.target.classList.contains('filter-chip')) return;
                document.querySelectorAll('#cl-filters .filter-chip').forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                const filtered = currentFilter === 'all' ? checklists : checklists.filter(c => c.status === currentFilter);
                document.getElementById('cl-grid').innerHTML = filtered.length > 0 ?
                    filtered.map(c => this.renderChecklistCard(c)).join('') :
                    '<div class="empty-state"><h3>Нет чеклистов</h3></div>';
            });
        } catch (err) {
            el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
    },

    // ===== OPEN CHECKLIST =====
    async openChecklist(id) {
        const el = document.getElementById('page-content');
        el.innerHTML = '<p>Загрузка...</p>';
        try {
            const c = await API.getChecklist(id);
            const logs = await API.getChecklistLogs(id);
            this.renderChecklistView(el, c, logs);
        } catch (err) {
            el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
    },

    renderChecklistView(el, c, logs) {
        const items = c.items || [];
        const done = items.filter(i => i.checked).length;
        const total = items.length;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;

        // Group items by section
        const sections = {};
        items.forEach((item, idx) => {
            const sec = item.section || 'Общее';
            if (!sections[sec]) sections[sec] = [];
            sections[sec].push({ ...item, idx });
        });

        let itemsHtml = '';
        for (const [sec, secItems] of Object.entries(sections)) {
            itemsHtml += `<div class="checklist-section-title">${this.esc(sec)}</div>`;
            for (const item of secItems) {
                itemsHtml += `
                    <div class="checklist-item ${item.checked ? 'checked' : ''}" onclick="App.toggleItem(${c.id}, ${item.idx}, ${!item.checked})">
                        <input type="checkbox" ${item.checked ? 'checked' : ''} onclick="event.stopPropagation(); App.toggleItem(${c.id}, ${item.idx}, ${!item.checked})">
                        <span class="item-text">${this.esc(item.text)}</span>
                    </div>`;
            }
        }

        const isAdmin = this.user.role === 'admin';
        el.innerHTML = `
            <div class="checklist-view">
                <div class="page-header">
                    <div>
                        <button class="btn btn-outline btn-sm" onclick="App.renderPage('${App.currentPage === 'dashboard' ? 'dashboard' : 'checklists'}')" style="margin-bottom:8px">← Назад</button>
                        <h2>${this.esc(c.name)}</h2>
                        <div style="font-size:13px;color:var(--gray-500);margin-top:4px">
                            ${c.assignee_name ? 'Исполнитель: ' + this.esc(c.assignee_name) + ' · ' : ''}
                            Создан: ${this.formatDate(c.created_at)}
                            · <span class="badge ${c.status === 'completed' ? 'badge-completed' : 'badge-active'}">${c.status === 'completed' ? 'Завершён' : 'Активный'}</span>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-warning btn-sm" onclick="App.resetChecklist(${c.id})">Сбросить</button>
                        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="App.deleteChecklist(${c.id})">Удалить</button>` : ''}
                    </div>
                </div>

                <div class="progress-text">${done} из ${total} выполнено (${pct}%)</div>
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width:${pct}%;${c.status === 'completed' ? 'background:var(--success)' : ''}"></div>
                </div>

                <div style="margin-top:20px">${itemsHtml}</div>

                <div style="margin-top:32px">
                    <h3 style="margin-bottom:12px">Журнал действий</h3>
                    <div class="card">
                        <div class="card-body log-list">
                            ${logs.length > 0 ? logs.map(l => `
                                <div class="log-entry">
                                    <span class="log-time">${this.formatDateTime(l.timestamp)}</span>
                                    <span class="log-user">${this.esc(l.user_name || '')}</span>
                                    <span class="log-action">${this.formatLogAction(l)}</span>
                                </div>
                            `).join('') : '<p style="color:var(--gray-400)">Нет записей</p>'}
                        </div>
                    </div>
                </div>
            </div>`;
    },

    async toggleItem(checklistId, itemIndex, checked) {
        try {
            const c = await API.checkItem(checklistId, itemIndex, checked);
            const logs = await API.getChecklistLogs(checklistId);
            this.renderChecklistView(document.getElementById('page-content'), c, logs);
        } catch (err) {
            alert(err.message);
        }
    },

    async resetChecklist(id) {
        if (!confirm('Сбросить все отметки в этом чеклисте?')) return;
        try {
            const c = await API.resetChecklist(id);
            const logs = await API.getChecklistLogs(id);
            this.renderChecklistView(document.getElementById('page-content'), c, logs);
        } catch (err) {
            alert(err.message);
        }
    },

    async deleteChecklist(id) {
        if (!confirm('Удалить этот чеклист? Это действие необратимо.')) return;
        try {
            await API.deleteChecklist(id);
            this.renderPage(this.currentPage === 'dashboard' ? 'dashboard' : 'checklists');
        } catch (err) {
            alert(err.message);
        }
    },

    // ===== CREATE CHECKLIST =====
    async showCreateChecklist() {
        try {
            const templates = await API.getTemplates();
            const users = await API.getUsers();

            const html = `
                <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>Новый чеклист</h3>
                            <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Шаблон</label>
                                <select class="form-control" id="new-cl-template">
                                    <option value="">— Выберите шаблон —</option>
                                    ${templates.map(t => `<option value="${t.id}">${this.esc(t.name)} (${t.items.length} пунктов)</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Название (необязательно, берётся из шаблона)</label>
                                <input type="text" class="form-control" id="new-cl-name" placeholder="Название чеклиста">
                            </div>
                            <div class="form-group">
                                <label>Назначить исполнителя</label>
                                <select class="form-control" id="new-cl-assignee">
                                    <option value="">— Не назначен —</option>
                                    ${users.map(u => `<option value="${u.id}">${this.esc(u.display_name)} (${u.role === 'admin' ? 'Админ' : 'Исполнитель'})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                            <button class="btn btn-primary" onclick="App.doCreateChecklist()">Создать</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            alert(err.message);
        }
    },

    async doCreateChecklist() {
        const templateId = document.getElementById('new-cl-template').value;
        const name = document.getElementById('new-cl-name').value;
        const assignedTo = document.getElementById('new-cl-assignee').value;

        if (!templateId && !name) {
            alert('Выберите шаблон или укажите название');
            return;
        }

        try {
            const data = {};
            if (templateId) data.template_id = parseInt(templateId);
            if (name) data.name = name;
            if (assignedTo) data.assigned_to = parseInt(assignedTo);
            await API.createChecklist(data);
            document.querySelector('.modal-overlay').remove();
            this.renderPage(this.currentPage);
        } catch (err) {
            alert(err.message);
        }
    },

    // ===== TEMPLATES =====
    async pageTemplates(el) {
        el.innerHTML = '<p>Загрузка...</p>';
        try {
            const templates = await API.getTemplates();
            const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

            el.innerHTML = `
                <div class="page-header">
                    <h2>Шаблоны чеклистов</h2>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="App.navigateTo('constructor')">+ Новый шаблон</button>
                    </div>
                </div>
                <div class="filters" id="tpl-filters">
                    <button class="filter-chip active" data-cat="all">Все</button>
                    ${categories.map(c => `<button class="filter-chip" data-cat="${this.esc(c)}">${this.esc(c)}</button>`).join('')}
                </div>
                <div class="grid grid-2" id="tpl-grid">
                    ${templates.map(t => `
                        <div class="tpl-card">
                            ${t.category ? `<span class="category">${this.esc(t.category)}</span>` : ''}
                            <h3>${this.esc(t.name)}</h3>
                            <div class="desc">${this.esc(t.description)}</div>
                            <div class="meta">
                                <span>${t.items.length} пунктов</span>
                                <span>${this.formatDate(t.created_at)}</span>
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-primary btn-sm" onclick="App.createFromTemplate(${t.id})">Создать чеклист</button>
                                <button class="btn btn-outline btn-sm" onclick="App.editTemplate(${t.id})">Редактировать</button>
                                <button class="btn btn-danger btn-sm" onclick="App.deleteTemplate(${t.id})">Удалить</button>
                            </div>
                        </div>
                    `).join('')}
                </div>`;

            document.getElementById('tpl-filters').addEventListener('click', (e) => {
                if (!e.target.classList.contains('filter-chip')) return;
                document.querySelectorAll('#tpl-filters .filter-chip').forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                const cat = e.target.dataset.cat;
                const filtered = cat === 'all' ? templates : templates.filter(t => t.category === cat);
                document.getElementById('tpl-grid').innerHTML = filtered.map(t => `
                    <div class="tpl-card">
                        ${t.category ? `<span class="category">${this.esc(t.category)}</span>` : ''}
                        <h3>${this.esc(t.name)}</h3>
                        <div class="desc">${this.esc(t.description)}</div>
                        <div class="meta">
                            <span>${t.items.length} пунктов</span>
                            <span>${this.formatDate(t.created_at)}</span>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-primary btn-sm" onclick="App.createFromTemplate(${t.id})">Создать чеклист</button>
                            <button class="btn btn-outline btn-sm" onclick="App.editTemplate(${t.id})">Редактировать</button>
                            <button class="btn btn-danger btn-sm" onclick="App.deleteTemplate(${t.id})">Удалить</button>
                        </div>
                    </div>
                `).join('');
            });
        } catch (err) {
            el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
    },

    async createFromTemplate(templateId) {
        try {
            const users = await API.getUsers();
            const html = `
                <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>Создать чеклист из шаблона</h3>
                            <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Назначить исполнителя</label>
                                <select class="form-control" id="tpl-cl-assignee">
                                    <option value="">— Не назначен —</option>
                                    ${users.map(u => `<option value="${u.id}">${this.esc(u.display_name)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                            <button class="btn btn-primary" onclick="App.doCreateFromTemplate(${templateId})">Создать</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            alert(err.message);
        }
    },

    async doCreateFromTemplate(templateId) {
        const assignee = document.getElementById('tpl-cl-assignee').value;
        try {
            const data = { template_id: templateId };
            if (assignee) data.assigned_to = parseInt(assignee);
            const c = await API.createChecklist(data);
            document.querySelector('.modal-overlay').remove();
            this.openChecklist(c.id);
        } catch (err) {
            alert(err.message);
        }
    },

    async deleteTemplate(id) {
        if (!confirm('Удалить этот шаблон?')) return;
        try {
            await API.deleteTemplate(id);
            this.renderPage('templates');
        } catch (err) {
            alert(err.message);
        }
    },

    async editTemplate(id) {
        try {
            const t = await API.getTemplate(id);
            this.pageConstructor(document.getElementById('page-content'), t);
        } catch (err) {
            alert(err.message);
        }
    },

    // ===== CONSTRUCTOR =====
    constructorItems: [],

    pageConstructor(el, editTemplate) {
        const t = editTemplate || null;
        this.constructorItems = t ? [...t.items] : [];

        el.innerHTML = `
            <div class="page-header">
                <h2>${t ? 'Редактировать шаблон' : 'Конструктор шаблонов'}</h2>
            </div>

            <div style="max-width:720px">
                <div class="card" style="margin-bottom:20px">
                    <div class="card-body">
                        <div class="form-group">
                            <label>Название шаблона</label>
                            <input type="text" class="form-control" id="tpl-name" value="${t ? this.esc(t.name) : ''}" placeholder="Например: Открытие ресторана">
                        </div>
                        <div class="form-group">
                            <label>Описание</label>
                            <textarea class="form-control" id="tpl-desc" placeholder="Краткое описание шаблона">${t ? this.esc(t.description) : ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Категория</label>
                            <input type="text" class="form-control" id="tpl-category" value="${t ? this.esc(t.category) : ''}" placeholder="Например: Открытие, Закрытие, Тайный покупатель">
                        </div>
                    </div>
                </div>

                ${!t ? `
                <div class="card" style="margin-bottom:20px">
                    <div class="card-header">
                        <h3 style="font-size:15px">Готовые компоненты</h3>
                    </div>
                    <div class="card-body">
                        <p style="font-size:13px;color:var(--gray-500);margin-bottom:12px">Нажмите, чтобы добавить группу пунктов в шаблон</p>
                        <div style="display:flex;flex-wrap:wrap;gap:8px">
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('entrance')">🚪 Входная группа</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('hall')">🪑 Зал</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('kitchen')">🍳 Кухня</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('bar')">🍸 Бар</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('restroom')">🚻 Санузлы</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('cashier')">💳 Касса</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('staff')">👤 Персонал</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('service')">🤵 Сервис</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('sanitary')">🧹 Санитария</button>
                            <button class="btn btn-outline btn-sm" onclick="App.addComponent('hotel_reception')">🏨 Ресепшн</button>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="card">
                    <div class="card-header">
                        <h3 style="font-size:15px">Пункты чеклиста (${this.constructorItems.length})</h3>
                        <button class="btn btn-sm btn-outline" onclick="App.addConstructorItem()">+ Добавить пункт</button>
                    </div>
                    <div class="card-body" id="constructor-items">
                        ${this.renderConstructorItems()}
                    </div>
                </div>

                <div style="margin-top:20px;display:flex;gap:8px">
                    <button class="btn btn-primary btn-lg" onclick="App.saveTemplate(${t ? t.id : 'null'})">${t ? 'Сохранить изменения' : 'Создать шаблон'}</button>
                    <button class="btn btn-outline btn-lg" onclick="App.renderPage('templates')">Отмена</button>
                </div>
            </div>`;
    },

    renderConstructorItems() {
        if (this.constructorItems.length === 0) {
            return '<p style="color:var(--gray-400);text-align:center;padding:20px">Добавьте пункты чеклиста</p>';
        }
        return `<div class="constructor-items">
            ${this.constructorItems.map((item, idx) => `
                <div class="constructor-item">
                    <span class="drag-handle">⠿</span>
                    <input type="text" value="${this.esc(item.text)}" placeholder="Текст пункта"
                        onchange="App.updateConstructorItem(${idx}, 'text', this.value)">
                    <input type="text" class="section-input" value="${this.esc(item.section || '')}" placeholder="Секция"
                        onchange="App.updateConstructorItem(${idx}, 'section', this.value)">
                    <button class="remove-btn" onclick="App.removeConstructorItem(${idx})">×</button>
                </div>
            `).join('')}
        </div>`;
    },

    addConstructorItem() {
        this.constructorItems.push({ text: '', section: '', checked: false });
        document.getElementById('constructor-items').innerHTML = this.renderConstructorItems();
        // Focus the new item
        const inputs = document.querySelectorAll('.constructor-item input[type="text"]:not(.section-input)');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    },

    removeConstructorItem(idx) {
        this.constructorItems.splice(idx, 1);
        document.getElementById('constructor-items').innerHTML = this.renderConstructorItems();
    },

    updateConstructorItem(idx, field, value) {
        this.constructorItems[idx][field] = value;
    },

    addComponent(type) {
        const components = {
            entrance: [
                { text: 'Проверить чистоту входной группы', section: 'Вход' },
                { text: 'Проверить вывеску и подсветку', section: 'Вход' },
                { text: 'Проверить коврик и порог', section: 'Вход' },
                { text: 'Проверить работу двери', section: 'Вход' },
            ],
            hall: [
                { text: 'Проверить чистоту столов и стульев', section: 'Зал' },
                { text: 'Расставить салфетницы и специи', section: 'Зал' },
                { text: 'Разложить меню', section: 'Зал' },
                { text: 'Проверить освещение', section: 'Зал' },
                { text: 'Проверить температуру в зале', section: 'Зал' },
                { text: 'Включить фоновую музыку', section: 'Зал' },
            ],
            kitchen: [
                { text: 'Проверить температуру холодильников', section: 'Кухня' },
                { text: 'Проверить сроки годности', section: 'Кухня' },
                { text: 'Проверить чистоту рабочих поверхностей', section: 'Кухня' },
                { text: 'Проверить наличие заготовок', section: 'Кухня' },
                { text: 'Проверить работу оборудования', section: 'Кухня' },
            ],
            bar: [
                { text: 'Проверить наличие алкоголя', section: 'Бар' },
                { text: 'Проверить безалкогольные напитки', section: 'Бар' },
                { text: 'Проверить лёд и гарниры', section: 'Бар' },
                { text: 'Протереть барную стойку', section: 'Бар' },
                { text: 'Проверить чистоту бокалов', section: 'Бар' },
            ],
            restroom: [
                { text: 'Проверить чистоту санузлов', section: 'Санузлы' },
                { text: 'Пополнить мыло и бумагу', section: 'Санузлы' },
                { text: 'Проверить работу смесителей', section: 'Санузлы' },
                { text: 'Проверить освежитель воздуха', section: 'Санузлы' },
            ],
            cashier: [
                { text: 'Включить POS-терминал', section: 'Касса' },
                { text: 'Проверить наличие разменных денег', section: 'Касса' },
                { text: 'Проверить работу принтера чеков', section: 'Касса' },
                { text: 'Открыть кассовую смену', section: 'Касса' },
            ],
            staff: [
                { text: 'Проверить форму персонала', section: 'Персонал' },
                { text: 'Провести планёрку', section: 'Персонал' },
                { text: 'Проверить бейджи', section: 'Персонал' },
                { text: 'Распределить зоны ответственности', section: 'Персонал' },
            ],
            service: [
                { text: 'Встреча гостя в течение 30 сек', section: 'Сервис' },
                { text: 'Предложение столика', section: 'Сервис' },
                { text: 'Подача меню в течение 2 мин', section: 'Сервис' },
                { text: 'Принятие заказа', section: 'Сервис' },
                { text: 'Проверка «Всё ли понравилось?»', section: 'Сервис' },
                { text: 'Расчёт в течение 3 мин', section: 'Сервис' },
            ],
            sanitary: [
                { text: 'Спецодежда чистая', section: 'Санитария' },
                { text: 'Медицинские книжки в наличии', section: 'Санитария' },
                { text: 'Маркировка продуктов', section: 'Санитария' },
                { text: 'Товарное соседство', section: 'Санитария' },
                { text: 'Дезинфицирующие средства', section: 'Санитария' },
            ],
            hotel_reception: [
                { text: 'Принять смену, проверить журнал', section: 'Ресепшн' },
                { text: 'Проверить бронирования на сегодня', section: 'Ресепшн' },
                { text: 'Подготовить ключ-карты', section: 'Ресепшн' },
                { text: 'Проверить VIP-гостей', section: 'Ресепшн' },
                { text: 'Проверить чистоту лобби', section: 'Ресепшн' },
            ],
        };

        const items = components[type] || [];
        for (const item of items) {
            this.constructorItems.push({ ...item, checked: false });
        }
        document.getElementById('constructor-items').innerHTML = this.renderConstructorItems();
        // Update count
        const header = document.querySelector('.card-header h3');
        if (header) header.textContent = `Пункты чеклиста (${this.constructorItems.length})`;
    },

    async saveTemplate(editId) {
        const name = document.getElementById('tpl-name').value.trim();
        const desc = document.getElementById('tpl-desc').value.trim();
        const category = document.getElementById('tpl-category').value.trim();

        if (!name) { alert('Укажите название шаблона'); return; }
        if (this.constructorItems.length === 0) { alert('Добавьте хотя бы один пункт'); return; }

        // Filter out empty items
        const items = this.constructorItems.filter(i => i.text.trim());
        if (items.length === 0) { alert('Добавьте хотя бы один непустой пункт'); return; }

        try {
            const data = { name, description: desc, category, items };
            if (editId) {
                await API.updateTemplate(editId, data);
            } else {
                await API.createTemplate(data);
            }
            this.navigateTo('templates');
        } catch (err) {
            alert(err.message);
        }
    },

    // ===== USERS =====
    async pageUsers(el) {
        el.innerHTML = '<p>Загрузка...</p>';
        try {
            const users = await API.getUsers();
            el.innerHTML = `
                <div class="page-header">
                    <h2>Пользователи</h2>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="App.showCreateUser()">+ Добавить</button>
                    </div>
                </div>
                <div class="card">
                    <table>
                        <thead>
                            <tr>
                                <th>Имя</th>
                                <th>Логин</th>
                                <th>Роль</th>
                                <th>Создан</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td><strong>${this.esc(u.display_name)}</strong></td>
                                    <td>${this.esc(u.username)}</td>
                                    <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-executor'}">${u.role === 'admin' ? 'Админ' : 'Исполнитель'}</span></td>
                                    <td>${this.formatDate(u.created_at)}</td>
                                    <td style="text-align:right">
                                        <button class="btn btn-outline btn-sm" onclick="App.showEditUser(${u.id}, '${this.esc(u.display_name)}', '${u.role}')">Изменить</button>
                                        ${u.id !== App.user.id ? `<button class="btn btn-danger btn-sm" onclick="App.deleteUser(${u.id})">Удалить</button>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
    },

    showCreateUser() {
        const html = `
            <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Новый пользователь</h3>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Логин</label>
                            <input type="text" class="form-control" id="new-user-login" placeholder="Логин для входа">
                        </div>
                        <div class="form-group">
                            <label>Отображаемое имя</label>
                            <input type="text" class="form-control" id="new-user-name" placeholder="Имя пользователя">
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" class="form-control" id="new-user-pass" placeholder="Пароль">
                        </div>
                        <div class="form-group">
                            <label>Роль</label>
                            <select class="form-control" id="new-user-role">
                                <option value="executor">Исполнитель</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                        <button class="btn btn-primary" onclick="App.doCreateUser()">Создать</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async doCreateUser() {
        const username = document.getElementById('new-user-login').value.trim();
        const display_name = document.getElementById('new-user-name').value.trim();
        const password = document.getElementById('new-user-pass').value;
        const role = document.getElementById('new-user-role').value;

        if (!username || !password) { alert('Укажите логин и пароль'); return; }

        try {
            await API.createUser({ username, display_name: display_name || username, password, role });
            document.querySelector('.modal-overlay').remove();
            this.renderPage('users');
        } catch (err) {
            alert(err.message);
        }
    },

    showEditUser(id, name, role) {
        const html = `
            <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Редактировать пользователя</h3>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Отображаемое имя</label>
                            <input type="text" class="form-control" id="edit-user-name" value="${this.esc(name)}">
                        </div>
                        <div class="form-group">
                            <label>Новый пароль (оставьте пустым, чтобы не менять)</label>
                            <input type="password" class="form-control" id="edit-user-pass" placeholder="Новый пароль">
                        </div>
                        <div class="form-group">
                            <label>Роль</label>
                            <select class="form-control" id="edit-user-role">
                                <option value="executor" ${role === 'executor' ? 'selected' : ''}>Исполнитель</option>
                                <option value="admin" ${role === 'admin' ? 'selected' : ''}>Администратор</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                        <button class="btn btn-primary" onclick="App.doEditUser(${id})">Сохранить</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async doEditUser(id) {
        const data = {
            display_name: document.getElementById('edit-user-name').value.trim(),
            role: document.getElementById('edit-user-role').value,
        };
        const pass = document.getElementById('edit-user-pass').value;
        if (pass) data.password = pass;
        try {
            await API.updateUser(id, data);
            document.querySelector('.modal-overlay').remove();
            this.renderPage('users');
        } catch (err) {
            alert(err.message);
        }
    },

    async deleteUser(id) {
        if (!confirm('Удалить пользователя?')) return;
        try {
            await API.deleteUser(id);
            this.renderPage('users');
        } catch (err) {
            alert(err.message);
        }
    },

    // ===== LOGS =====
    async pageLogs(el) {
        el.innerHTML = '<p>Загрузка...</p>';
        try {
            const logs = await API.getAllLogs(200);
            el.innerHTML = `
                <div class="page-header">
                    <h2>Журнал действий</h2>
                </div>
                <div class="card">
                    <div class="card-body">
                        ${logs.length > 0 ? `
                            <div class="log-list" style="max-height:none">
                                ${logs.map(l => `
                                    <div class="log-entry">
                                        <span class="log-time">${this.formatDateTime(l.timestamp)}</span>
                                        <span class="log-user">${this.esc(l.user_name || '')}</span>
                                        <span class="log-action">
                                            ${this.formatLogAction(l)}
                                            ${l.checklist_id ? ` <a href="#" onclick="event.preventDefault();App.openChecklist(${l.checklist_id})" style="color:var(--primary)">[открыть]</a>` : ''}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p style="color:var(--gray-400);text-align:center;padding:20px">Нет записей</p>'}
                    </div>
                </div>`;
        } catch (err) {
            el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
    },

    // ===== HELPERS =====
    navigateTo(page) {
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.page === page);
        });
        this.currentPage = page;
        this.renderPage(page);
    },

    async doLogout() {
        try { await API.logout(); } catch {}
        API.setToken(null);
        this.user = null;
        this.renderLogin();
    },

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatDateTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' +
            d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },

    formatLogAction(log) {
        const actions = {
            check: '✅ Отмечено',
            uncheck: '⬜ Снята отметка',
            reset: '🔄 Сброс всех отметок',
            complete: '🏁 Чеклист завершён',
        };
        let text = actions[log.action] || log.action;
        if (log.item_text) text += ': ' + this.esc(log.item_text);
        if (log.details) text += ' — ' + this.esc(log.details);
        return text;
    },
};

// Start
App.init();
