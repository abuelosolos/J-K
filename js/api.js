var API_URL = 'https://j-k-production.up.railway.app';

var Api = {

  getToken: function() { return localStorage.getItem('fara_token'); },
  setToken: function(t) { localStorage.setItem('fara_token', t); },

  getUser: function() {
    var raw = localStorage.getItem('fara_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser: function(u) { localStorage.setItem('fara_user', JSON.stringify(u)); },

  clearSession: function() {
    localStorage.removeItem('fara_token');
    localStorage.removeItem('fara_user');
  },

  request: async function(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var options = { method: method, headers: headers };
    if (body) options.body = JSON.stringify(body);
    var res  = await fetch(API_URL + path, options);
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get:  function(path)       { return this.request('GET',  path, null); },
  post: function(path, body) { return this.request('POST', path, body); },

  login: async function(email, password) {
    var data = await this.post('/auth/login', { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  signup: async function(name, email, password, role) {
    var data = await this.post('/auth/signup', {
      full_name: name,
      email,
      password,
      role: role || 'freelancer',
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  // called after Firebase gives us an ID token
  firebaseAuth: async function(idToken, role) {
    var body = { id_token: idToken };
    if (role) body.role = role;
    var data = await this.post('/auth/firebase', body);
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  logout: function() {
    this.clearSession();
    window.location.href = 'login.html';
  },

  requireAuth: function() {
    if (!this.getToken()) { window.location.href = 'login.html'; return false; }
    return true;
  },

  requireFreelancer: function() {
    if (!this.requireAuth()) return false;
    var user = this.getUser();
    if (user && user.role !== 'freelancer') { window.location.href = 'dashboard-client.html'; return false; }
    return true;
  },

  requireClient: function() {
    if (!this.requireAuth()) return false;
    var user = this.getUser();
    if (user && user.role !== 'client') { window.location.href = 'dashboard-freelancer.html'; return false; }
    return true;
  },

  getWallet:         function() { return this.get('/wallet'); },
  getTransactions:   function() { return this.get('/wallet/transactions'); },
  createInvoice:     function(title, amount) { return this.post('/payments/jobs', { title, amount_usd: amount }); },
  getPaymentHistory: function() { return this.get('/payments/history'); },

  withdraw: function(amount, bankCode, accountNumber, accountName, password) {
    return this.post('/withdrawals', {
      amount_ngn:     amount,
      bank_code:      bankCode,
      account_number: accountNumber,
      account_name:   accountName,
      password,
    });
  },

  requestPasswordChange: function(currentPassword, newPassword) {
    return this.post('/auth/change-password/request', {
      current_password: currentPassword,
      new_password:     newPassword,
    });
  },

  confirmPasswordChange: function(code) {
    return this.post('/auth/change-password/confirm', { code });
  },
};
