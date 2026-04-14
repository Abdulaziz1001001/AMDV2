(function () {
  'use strict';

  var supabaseUrl = window.__AMD_SUPABASE_URL__ || '';
  var supabaseAnonKey = window.__AMD_SUPABASE_ANON_KEY__ || '';
  var client = null;
  var leaveTypes = [
    'Sick Leave',
    'Annual Leave',
    'Unpaid Leave',
    'Emergency Leave',
    'Maternity/Paternity Leave',
    'Bereavement Leave',
    'Study Leave',
    'Hajj/Umrah Leave',
    'Marriage Leave',
    'Work Injury',
  ];

  function ensureClient() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase client library not loaded');
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not configured');
    }
    client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return client;
  }

  function getUserContext() {
    var role = localStorage.getItem('amd_role') === 'admin' ? 'admin' : (localStorage.getItem('amd_emp_role') || 'employee');
    var userJson = role === 'admin' ? localStorage.getItem('amd_user_admin') : localStorage.getItem('amd_user_emp');
    var user = null;
    try { user = userJson ? JSON.parse(userJson) : null; } catch (_) { user = null; }
    return { role: role, user: user };
  }

  async function getSessionUserId() {
    var sb = ensureClient();
    var response = await sb.auth.getUser();
    var authUser = response && response.data ? response.data.user : null;
    return authUser ? authUser.id : null;
  }

  async function getEmployeeLeaveRequests() {
    var sb = ensureClient();
    var uid = await getSessionUserId();
    if (!uid) throw new Error('No Supabase session');
    var q = await sb
      .from('leave_requests')
      .select('*')
      .eq('employee_id', uid)
      .order('created_at', { ascending: false });
    if (q.error) throw new Error(q.error.message);
    return q.data || [];
  }

  async function createLeaveRequest(payload) {
    var sb = ensureClient();
    var uid = await getSessionUserId();
    if (!uid) throw new Error('No Supabase session');
    if (leaveTypes.indexOf(payload.type) === -1) throw new Error('Invalid leave type');
    var ins = await sb
      .from('leave_requests')
      .insert([{
        employee_id: uid,
        department_id: payload.department_id || null,
        start_date: payload.start_date,
        end_date: payload.end_date,
        requested_days: payload.requested_days,
        type: payload.type,
        reason: payload.reason || null,
        status: 'pending',
        attachment_url: payload.attachment_url || null,
      }])
      .select()
      .single();
    if (ins.error) throw new Error(ins.error.message);
    return ins.data;
  }

  async function uploadLeaveAttachment(file) {
    var sb = ensureClient();
    var uid = await getSessionUserId();
    if (!uid) throw new Error('No Supabase session');
    var allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!file || allowed.indexOf(file.type) === -1) throw new Error('Only PDF/images are allowed');
    if (file.size > 5 * 1024 * 1024) throw new Error('Attachment must be 5MB or less');
    var ext = (file.name || '').split('.').pop() || 'bin';
    var key = uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var up = await sb.storage.from('leave-attachments').upload(key, file, { upsert: false });
    if (up.error) throw new Error(up.error.message);
    return key;
  }

  async function getNotifications() {
    var sb = ensureClient();
    var uid = await getSessionUserId();
    if (!uid) throw new Error('No Supabase session');
    var q = await sb
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (q.error) throw new Error(q.error.message);
    return q.data || [];
  }

  async function markNotificationRead(id) {
    var sb = ensureClient();
    var upd = await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (upd.error) throw new Error(upd.error.message);
    return true;
  }

  async function getMyLeaveBalance() {
    var sb = ensureClient();
    var uid = await getSessionUserId();
    if (!uid) throw new Error('No Supabase session');
    var q = await sb.from('leave_balances').select('*').eq('user_id', uid).maybeSingle();
    if (q.error) throw new Error(q.error.message);
    return q.data || { annual_balance_days: 0 };
  }

  async function setLeaveBalance(userId, annualBalanceDays) {
    var sb = ensureClient();
    var authUid = await getSessionUserId();
    var up = await sb
      .from('leave_balances')
      .upsert([{ user_id: userId, annual_balance_days: annualBalanceDays, updated_by: authUid, updated_at: new Date().toISOString() }], { onConflict: 'user_id' });
    if (up.error) throw new Error(up.error.message);
    return true;
  }

  async function getAttachmentSignedUrl(path, download) {
    var sb = ensureClient();
    var res = await sb.storage.from('leave-attachments').createSignedUrl(path, 60, download ? { download: true } : undefined);
    if (res.error) throw new Error(res.error.message);
    return res.data.signedUrl;
  }

  function subscribeToLeaveAndNotifications(onLeaveUpdate, onNotificationInsert) {
    var sb = ensureClient();
    var channel = sb
      .channel('leave-notify-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leave_requests' }, function (payload) {
        if (typeof onLeaveUpdate === 'function') onLeaveUpdate(payload);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, function (payload) {
        if (typeof onNotificationInsert === 'function') onNotificationInsert(payload);
      })
      .subscribe();
    return channel;
  }

  window.SupabaseService = {
    ensureClient: ensureClient,
    getUserContext: getUserContext,
    leaveTypes: leaveTypes,
    getEmployeeLeaveRequests: getEmployeeLeaveRequests,
    createLeaveRequest: createLeaveRequest,
    uploadLeaveAttachment: uploadLeaveAttachment,
    getNotifications: getNotifications,
    markNotificationRead: markNotificationRead,
    getMyLeaveBalance: getMyLeaveBalance,
    setLeaveBalance: setLeaveBalance,
    getAttachmentSignedUrl: getAttachmentSignedUrl,
    subscribeToLeaveAndNotifications: subscribeToLeaveAndNotifications,
  };
})();
