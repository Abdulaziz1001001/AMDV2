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

  window.AMD_HTTP = { base: base, request: request, getHeaders: getHeaders };
})();
