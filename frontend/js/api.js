// API client
const API = {
    base: '/api',
    token: localStorage.getItem('token'),

    async request(method, path, body) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (this.token) {
            opts.headers['Authorization'] = 'Bearer ' + this.token;
        }
        if (body) {
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(this.base + path, opts);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Ошибка сервера');
        }
        return data;
    },

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    },

    // Auth
    login(username, password) {
        return this.request('POST', '/auth/login', { username, password });
    },
    me() {
        return this.request('GET', '/auth/me');
    },
    logout() {
        return this.request('POST', '/auth/logout');
    },

    // Users
    getUsers() {
        return this.request('GET', '/users');
    },
    createUser(data) {
        return this.request('POST', '/users', data);
    },
    updateUser(id, data) {
        return this.request('PUT', `/users/${id}`, data);
    },
    deleteUser(id) {
        return this.request('DELETE', `/users/${id}`);
    },

    // Templates
    getTemplates() {
        return this.request('GET', '/templates');
    },
    getTemplate(id) {
        return this.request('GET', `/templates/${id}`);
    },
    createTemplate(data) {
        return this.request('POST', '/templates', data);
    },
    updateTemplate(id, data) {
        return this.request('PUT', `/templates/${id}`, data);
    },
    deleteTemplate(id) {
        return this.request('DELETE', `/templates/${id}`);
    },

    // Checklists
    getChecklists(status) {
        const q = status ? `?status=${status}` : '';
        return this.request('GET', '/checklists' + q);
    },
    getChecklist(id) {
        return this.request('GET', `/checklists/${id}`);
    },
    createChecklist(data) {
        return this.request('POST', '/checklists', data);
    },
    checkItem(id, itemIndex, checked) {
        return this.request('POST', `/checklists/${id}/check`, { item_index: itemIndex, checked });
    },
    resetChecklist(id) {
        return this.request('POST', `/checklists/${id}/reset`);
    },
    deleteChecklist(id) {
        return this.request('DELETE', `/checklists/${id}`);
    },

    // Logs
    getChecklistLogs(id) {
        return this.request('GET', `/checklists/${id}/logs`);
    },
    getAllLogs(limit) {
        return this.request('GET', `/logs?limit=${limit || 100}`);
    },
};
