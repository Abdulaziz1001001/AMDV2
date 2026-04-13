(function () {
  'use strict';

  var configured =
    typeof window.__AMD_API_BASE__ === 'string' && window.__AMD_API_BASE__.length > 0
      ? window.__AMD_API_BASE__.replace(/\/$/, '')
      : '';

  var base =
    configured ||
    (typeof location !== 'undefined' && location.origin && location.origin !== 'null'
      ? location.origin.replace(/\/$/, '') + '/api'
      : 'http://127.0.0.1:5000/api');

  function getHeaders() {
    var token = localStorage.getItem('amd_token');
    var h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    return h;
  }

  async function request(endpoint, method, body) {
    var path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    var config = { method: method || 'GET', headers: getHeaders() };
    if (body != null) config.body = JSON.stringify(body);
    var res;
    try {
      res = await fetch(base + path, config);
    } catch (e) {
      throw new Error('Network error');
    }
    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Server error');
    }
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('amd-unauthorized'));
      throw new Error(data.msg || 'Unauthorized');
    }
    if (!res.ok) throw new Error(data.msg || 'Error ' + res.status);
    return data;
  }
  // --- PASTE THIS IN http.js ---

// 1. Function to get Notifications
async function loadNotifications() {
  try {
      const response = await fetch('/api/admin/notifications', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const notifications = await response.json();
      
      const container = document.getElementById('notification-center');
      if (container && Array.isArray(notifications)) {
          container.innerHTML = notifications.map(notif => 
              `<div class="notification-item">
                  <p>${notif.message}</p>
               </div>`
          ).join('');
      }
  } catch (err) {
      console.error('Failed to load notifications', err);
  }
}

// 2. Function to get HR Data
async function loadHRModule() {
  try {
      const response = await fetch('/api/hr/dashboard', { // Adjust endpoint if your hr.js uses a different route
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      const container = document.getElementById('hr-module');
      if (container) {
          container.innerHTML = `
              <div class="hr-stats">
                  <p><strong>Total Employees:</strong> ${data.totalEmployees || 0}</p>
                  <p><strong>Pending Leaves:</strong> ${data.pendingLeaves || 0}</p>
              </div>
          `;
      }
  } catch (err) {
      console.error('Failed to load HR data', err);
  }
}

// 3. Make sure to call these functions right after a successful login!
// Find your login function in http.js and add:
// loadNotifications();
// loadHRModule();

  window.AMD_HTTP = { base: base, request: request, getHeaders: getHeaders };
})();
