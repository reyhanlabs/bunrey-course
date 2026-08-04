//  TOAST NOTIFICATIONS
// ════════════════════════════════════════════════
function showToast(msg, type='info', duration=3500){
  const cont = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<span>${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
  cont.appendChild(t);
  setTimeout(()=>{
    t.style.animation='toastOut .3s ease forwards';
    setTimeout(()=>t.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════════════════
// ✨ BEAUTIFUL MODAL DIALOG FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Show beautiful confirmation dialog
 */
function showModalDialog(title, message, onConfirm, options = {}) {
  const { okText = 'OK', cancelText = 'Cancel', type = 'confirm' } = options;
  const modalId = 'modal-dialog-' + Date.now();
  const cancelBtn = cancelText !== null
    ? `<button class="btn secondary" onclick="closeModalDialog('${modalId}')">${cancelText}</button>`
    : '';
  const overlayHTML = `
    <div class="overlay open" id="${modalId}">
      <div class="modal modal-sm">
        <div class="modal-title">${title}</div>
        <div class="modal-content">${message}</div>
        <div class="modal-footer ${cancelText === null ? 'center' : ''}">
          ${cancelBtn}
          <button class="btn ${type === 'danger' ? 'danger' : (type === 'success' ? 'success' : 'primary')}" 
                  onclick="confirmModalDialog('${modalId}')">
            ${okText}
          </button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = overlayHTML;
  document.body.appendChild(div.firstElementChild);
  window['modalCallback_' + modalId] = onConfirm;
  setTimeout(() => {
    document.querySelector(`#${modalId} .btn.${type === 'danger' ? 'danger' : (type === 'success' ? 'success' : 'primary')}`).focus();
  }, 100);
}

function confirmModal(title, message, onConfirm, options = {}) {
  showModalDialog(title, message, onConfirm, {
    okText: options.okText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
    type: 'confirm'
  });
}

function warningModal(title, message, onConfirm, options = {}) {
  showModalDialog(title, message, onConfirm, {
    okText: options.okText || 'Proceed',
    cancelText: options.cancelText || 'Cancel',
    type: 'warning'
  });
}

function dangerModal(title, message, onConfirm, options = {}) {
  showModalDialog(title, message, onConfirm, {
    okText: options.okText || 'Delete',
    cancelText: options.cancelText !== undefined ? options.cancelText : 'Cancel',
    type: 'danger'
  });
}

function infoModal(title, message, options = {}) {
  const modalId = 'modal-dialog-' + Date.now();
  const overlayHTML = `
    <div class="overlay open" id="${modalId}">
      <div class="modal modal-sm">
        <div class="modal-title">ℹ️ ${title}</div>
        <div class="modal-content">${message}</div>
        <div class="modal-footer">
          <button class="btn primary" onclick="closeModalDialog('${modalId}')">Close</button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = overlayHTML;
  document.body.appendChild(div.firstElementChild);
}

function successModal(title, message, options = {}) {
  const modalId = 'modal-dialog-' + Date.now();
  const overlayHTML = `
    <div class="overlay open" id="${modalId}">
      <div class="modal modal-sm">
        <div class="modal-title">✅ ${title}</div>
        <div class="modal-content">${message}</div>
        <div class="modal-footer">
          <button class="btn success" onclick="closeModalDialog('${modalId}')">Close</button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = overlayHTML;
  document.body.appendChild(div.firstElementChild);
  if(options.autoClose) setTimeout(() => closeModalDialog(modalId), options.autoClose);
}

function closeModalDialog(modalId) {
  const modal = document.getElementById(modalId);
  if(modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  }
  delete window['modalCallback_' + modalId];
}

function confirmModalDialog(modalId) {
  const callback = window['modalCallback_' + modalId];
  if(typeof callback === 'function') callback();
  closeModalDialog(modalId);
}


// ════════════════════════════════════════════════
//  PATCH saveAbsensi — upgrade ke toast + validasi payment-conflict
//  PENTING: Preserve ID lama agar sesiIds di payment tidak putus
// ════════════════════════════════════════════════
saveAbsensi = function(){
  const d=document.getElementById('absen-date').value;
  if(!d){ showToast('Select a date first!','warn'); return; }
  if(!siswaList.length){ showToast('No students found!','warn'); return; }

  // ── VALIDASI: Blokir jika ada perubahan Hadir→non-Hadir yang sudah punya payment ──
  const conflicts = [];
  siswaList.forEach(s => {
    const newStatus = document.getElementById(`att-${s.id}`)?.value || 'Hadir';
    const oldAtt = absensiList.find(a => a.tanggal === d && a.siswaId === s.id);
    if(oldAtt && oldAtt.status === 'Hadir' && newStatus !== 'Hadir') {
      const paymentWithThisSesi = bayarList.find(b =>
        b.sesiIds && b.sesiIds.includes(oldAtt.id)
      );
      if(paymentWithThisSesi) {
        conflicts.push({
          nama: s.nama, tanggal: d,
          oldStatus: oldAtt.status, newStatus,
          payment: paymentWithThisSesi
        });
      }
    }
  });

  if(conflicts.length > 0) {
    const conflictHtml = conflicts.map((c, idx) => `
      <div style="background:var(--bg3);padding:12px;border-radius:8px;margin:8px 0;border-left:4px solid var(--yellow)">
        <div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <span style="background:var(--accent);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem">${idx+1}</span>
          👤 ${c.nama}
        </div>
        <div style="font-size:0.9rem;color:var(--muted);margin-left:32px">
          <div>📅 Date: <strong>${tglFmt(c.tanggal)}</strong></div>
          <div>Status: <strong>${c.oldStatus}</strong> → <strong style="color:var(--red)">${c.newStatus}</strong></div>
          <div>💰 Payment: <strong>${fmt(c.payment.jumlah)}</strong> (${c.payment.status})</div>
        </div>
      </div>`).join('');
    dangerModal(
      `⚠️ ${conflicts.length} Student(s) with Payment`,
      `<div style="text-align:left;line-height:1.8">
        <p>❌ <strong>Cannot save attendance.</strong></p>
        <p>Payment records exist for these students:</p>
        ${conflictHtml}
        <p style="margin-top:16px">💡 Delete the payment first, then try again.</p>
      </div>`,
      null, { okText: 'OK', cancelText: null }
    );
    return;
  }

  // ── SIMPAN: Pertahankan ID lama agar link payment tidak putus ──
  const oldRecords = {};
  absensiList.filter(a => a.tanggal === d).forEach(a => { oldRecords[a.siswaId] = a; });
  absensiList = absensiList.filter(a => a.tanggal !== d);
  siswaList.forEach(s => {
    const old = oldRecords[s.id];
    absensiList.push({
      id: old ? old.id : uid(),   // ← PAKAI ID LAMA jika sesi ini sudah pernah ada
      tanggal: d, siswaId: s.id, namaSiswa: s.nama,
      status:      document.getElementById(`att-${s.id}`)?.value || 'Hadir',
      keterangan:  document.getElementById(`att-ket-${s.id}`)?.value || '',
    });
  });
  DB.set('absensi', absensiList);
  renderAttendance();
  updateUnpaidBadge(); updateMbnBadge();
  if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
  showToast('✅ Attendance saved!', 'success');
};

// ════════════════════════════════════════════════
//  NOTIFICATION SYSTEM
// ════════════════════════════════════════════════
let _notifList = JSON.parse(localStorage.getItem('notifList')||'[]');
function saveNotifs(){ localStorage.setItem('notifList', JSON.stringify(_notifList)); }

function addNotif(title, sub, icon='🔔'){
  const n = {id:uid(), title, sub, icon, ts: Date.now(), read: false};
  _notifList.unshift(n);
  if(_notifList.length > 50) _notifList = _notifList.slice(0,50);
  saveNotifs();
  updateNotifBadge();
  renderNotifPanel();
}

function updateNotifBadge(){
  const unread = _notifList.filter(n=>!n.read).length;
  const dot = document.getElementById('notif-dot');
  if(dot){ dot.className = 'notif-dot' + (unread>0?' active':''); }
}

function toggleNotifPanel(){
  const p = document.getElementById('notif-panel');
  p.classList.toggle('open');
  if(p.classList.contains('open')){
    _notifList.forEach(n=>n.read=true);
    saveNotifs(); updateNotifBadge(); renderNotifPanel();
  }
}

function renderNotifPanel(){
  const el = document.getElementById('notif-list');
  if(!el) return;
  if(!_notifList.length){
    el.innerHTML='<div class="notif-empty">No notifications yet.</div>'; return;
  }
  const rel = ts => {
    const d = Date.now() - ts;
    if(d < 60000) return 'Just now';
    if(d < 3600000) return Math.round(d/60000)+'m ago';
    if(d < 86400000) return Math.round(d/3600000)+'h ago';
    return Math.round(d/86400000)+'d ago';
  };
  el.innerHTML = _notifList.slice(0,20).map(n=>`
    <div class="notif-item ${!n.read?'unread':''}">
      <div class="ni-icon">${n.icon}</div>
      <div class="ni-body">
        <div class="ni-title">${n.title}</div>
        <div class="ni-sub">${n.sub} · ${rel(n.ts)}</div>
      </div>
    </div>`).join('');
}

function clearAllNotifs(){
  _notifList=[]; saveNotifs(); updateNotifBadge(); renderNotifPanel();
}

// Close notif panel on outside click
document.addEventListener('click', e=>{
  const p = document.getElementById('notif-panel');
  const b = document.getElementById('notif-btn');
  if(p && b && !p.contains(e.target) && !b.contains(e.target)){
    p.classList.remove('open');
  }
});

updateNotifBadge();

// ════════════════════════════════════════════════
//  CALENDAR WIDGET
// ════════════════════════════════════════════════
let _calYear = new Date().getFullYear();  // always current year on init
let _calMonth = new Date().getMonth();    // always current month on init

// ── Indonesian National Holidays & Cuti Bersama 2026 (SKB 3 Menteri) ──
const HOLIDAYS_ID = {
  // === 2026 - Libur Nasional ===
  '2026-01-01': {name:'Tahun Baru Masehi', type:'libur'},
  '2026-01-16': {name:'Isra Mi\'raj Nabi Muhammad SAW', type:'libur'},
  '2026-02-17': {name:'Tahun Baru Imlek 2577 Kongzili', type:'libur'},
  '2026-03-19': {name:'Hari Suci Nyepi (Tahun Baru Saka 1948)', type:'libur'},
  '2026-03-21': {name:'Hari Raya Idul Fitri 1447 H', type:'libur'},
  '2026-03-22': {name:'Hari Raya Idul Fitri 1447 H', type:'libur'},
  '2026-04-03': {name:'Wafat Yesus Kristus (Jumat Agung)', type:'libur'},
  '2026-04-05': {name:'Kebangkitan Yesus Kristus (Paskah)', type:'libur'},
  '2026-05-01': {name:'Hari Buruh Internasional', type:'libur'},
  '2026-05-14': {name:'Kenaikan Yesus Kristus', type:'libur'},
  '2026-05-27': {name:'Hari Raya Idul Adha 1447 H', type:'libur'},
  '2026-05-31': {name:'Hari Raya Waisak 2570 BE', type:'libur'},
  '2026-06-01': {name:'Hari Lahir Pancasila', type:'libur'},
  '2026-06-16': {name:'Tahun Baru Islam 1448 H', type:'libur'},
  '2026-08-17': {name:'Hari Kemerdekaan RI ke-81', type:'libur'},
  '2026-08-25': {name:'Maulid Nabi Muhammad SAW', type:'libur'},
  '2026-12-25': {name:'Hari Natal', type:'libur'},
  // === 2026 - Cuti Bersama ===
  '2026-02-16': {name:'Cuti Bersama Imlek', type:'cuti'},
  '2026-03-18': {name:'Cuti Bersama Nyepi', type:'cuti'},
  '2026-03-20': {name:'Cuti Bersama Idul Fitri', type:'cuti'},
  '2026-03-23': {name:'Cuti Bersama Idul Fitri', type:'cuti'},
  '2026-03-24': {name:'Cuti Bersama Idul Fitri', type:'cuti'},
  '2026-05-15': {name:'Cuti Bersama Kenaikan Yesus Kristus', type:'cuti'},
  '2026-05-28': {name:'Cuti Bersama Idul Adha', type:'cuti'},
  '2026-12-24': {name:'Cuti Bersama Natal', type:'cuti'},
};

function renderCalendar(){
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date();
  const y = _calYear, m = _calMonth;
  const label = new Date(y,m,1).toLocaleString('en',{month:'long',year:'numeric'});
  const labelEl = document.getElementById('cal-month-label');
  if(labelEl) labelEl.textContent = label;

  const attDates = new Set(absensiList.map(a=>a.tanggal));
  const payDates = new Set(bayarList.map(b=>b.tanggal));

  const grid = document.getElementById('cal-grid');
  if(!grid) return;

  // DOW headers
  let html = DAYS.map(d=>`<div class="cal-dow">${d}</div>`).join('');

  // Mon-based offset: (getDay()+6)%7
  const firstDay = new Date(y, m, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(y, m+1, 0).getDate();

  // Collect holidays for this month
  const monthHolidays = [];

  // Leading empty cells
  for(let i=0;i<startOffset;i++){
    html += `<div class="cal-day" style="visibility:hidden;pointer-events:none"></div>`;
  }

  for(let d=1;d<=daysInMonth;d++){
    const dateStr = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isToday = today.getFullYear()===y && today.getMonth()===m && today.getDate()===d;
    const hasAtt = attDates.has(dateStr);
    const hasPay = payDates.has(dateStr);
    const holiday = HOLIDAYS_ID[dateStr];
    let cls = 'cal-day';
    if(isToday) cls+=' today';
    else if(holiday && holiday.type==='libur') cls+=' holiday';
    else if(holiday && holiday.type==='cuti') cls+=' cuti';
    let dots = '';
    if(hasAtt) dots += `<div class="cal-dot" style="background:var(--green)"></div>`;
    if(hasPay) dots += `<div class="cal-dot" style="background:var(--yellow)"></div>`;
    if(holiday && holiday.type==='libur') dots += `<div class="cal-dot" style="background:var(--red)"></div>`;
    if(holiday && holiday.type==='cuti') dots += `<div class="cal-dot" style="background:var(--orange)"></div>`;
    const titleAttr = holiday ? dateStr+' · '+holiday.name : dateStr;
    html += `<div class="${cls}" onclick="calSelectDate('${dateStr}')" title="${titleAttr}">${d}${dots?`<div class="cal-dots">${dots}</div>`:''}</div>`;

    if(holiday) monthHolidays.push({date:d, ...holiday});
  }

  // Trailing cells
  const totalCells = startOffset + daysInMonth;
  const remainder = totalCells % 7;
  if(remainder !== 0){
    const trailing = 7 - remainder;
    for(let i=0;i<trailing;i++){
      html += `<div class="cal-day" style="visibility:hidden;pointer-events:none"></div>`;
    }
  }

  grid.innerHTML = html;

  // Render holiday info panel
  const infoEl = document.getElementById('cal-holiday-info');
  if(infoEl){
    if(monthHolidays.length){
      infoEl.innerHTML = monthHolidays.map(h=>`
        <div class="cal-holiday-item">
          <div class="chi-date ${h.type}">${h.date}</div>
          <div class="chi-label">${h.name}</div>
          <div class="chi-type ${h.type}">${h.type==='libur'?'Libur':'Cuti'}</div>
        </div>`).join('');
    } else {
      infoEl.innerHTML = `<div style="text-align:center;padding:8px;font-size:0.72rem;color:var(--muted)">Tidak ada hari libur bulan ini</div>`;
    }
  }
}

function calNav(dir){
  _calMonth += dir;
  if(_calMonth > 11){ _calMonth=0; _calYear++; }
  if(_calMonth < 0){ _calMonth=11; _calYear--; }
  renderCalendar();
}

function calToday(){
  _calYear = new Date().getFullYear();
  _calMonth = new Date().getMonth();
  renderCalendar();
}

function calSelectDate(dateStr){
  // Navigate to attendance and pre-select that date
  navigate('attendance');
  document.getElementById('absen-date').value = dateStr;
  loadAbsensi();
}

// ════════════════════════════════════════════════
//  PAYMENT REMINDERS
// ════════════════════════════════════════════════
function renderPaymentReminders(){
  const el = document.getElementById('dash-reminders');
  const countEl = document.getElementById('reminder-count');
  if(!el) return;

  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });

  const reminders = [];
  siswaList.forEach(siswa=>{
    const isMonthly = siswa.billingType==='monthly';
    if(!isMonthly){
      const unpaid = absensiList.filter(a=>a.siswaId===siswa.id && a.status==='Hadir' && !paidSesiIds.has(a.id));
      if(!unpaid.length) return;
      const fee = siswa.feePerSesi || 0;
      const total = fee * unpaid.length;
      const oldest = unpaid.sort((a,b)=>a.tanggal.localeCompare(b.tanggal))[0];
      const daysSince = oldest ? Math.round((Date.now()-new Date(oldest.tanggal))/86400000) : 0;
      reminders.push({ siswa, unpaidCount:unpaid.length, total, daysSince, isMonthly:false });
    } else {
      // Check unpaid months
      const sessionMonths = {};
      absensiList.filter(a=>a.siswaId===siswa.id&&a.status==='Hadir').forEach(a=>{
        const d=new Date(a.tanggal);
        const ym=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
        sessionMonths[ym]=(sessionMonths[ym]||0)+1;
      });
      const paidMonths = new Set();
      bayarList.filter(b=>b.siswaId===siswa.id&&b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{
        const parsed=parsePeriodeToYearMonth(b.periode||'');
        if(parsed) paidMonths.add(parsed.y+'-'+parsed.m.toString().padStart(2,'0'));
      });
      const unpaidMonths = Object.keys(sessionMonths).filter(ym=>!paidMonths.has(ym));
      if(!unpaidMonths.length) return;
      const total = unpaidMonths.length * (siswa.feeMonthly||0);
      reminders.push({ siswa, unpaidCount:unpaidMonths.length, total, isMonthly:true });
    }
  });

  if(!reminders.length){
    el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px">🎉 All payments are up to date!</div>';
    if(countEl) countEl.style.display='none';
    return;
  }

  if(countEl){ countEl.style.display='inline'; countEl.textContent=reminders.length+' pending'; }

  // Sort by most urgent (most sessions/days)
  reminders.sort((a,b)=>(b.daysSince||b.unpaidCount*30)-(a.daysSince||a.unpaidCount*30));

  el.innerHTML = reminders.slice(0,5).map(r=>{
    const isUrgent = r.daysSince > 14 || r.unpaidCount >= 4;
    const cls = isUrgent ? 'critical' : r.unpaidCount >= 2 ? 'warn' : 'ok';
    const hp = (r.siswa.hp||'').replace(/\D/g,'');
    const waUrl = hp ? `https://wa.me/62${hp.replace(/^0/,'')}` : 'https://wa.me/';
    return `<div class="reminder-card ${cls}">
      <div class="reminder-card-header">
        <div class="reminder-name">👤 ${r.siswa.nama}${r.siswa.nick?` (${r.siswa.nick})`:''}</div>
        ${r.total ? `<strong style="color:var(--red)">${fmt(r.total)}</strong>` : ''}
      </div>
      <div class="reminder-detail">
        ${r.isMonthly ? `${r.unpaidCount} unpaid month(s)` : `${r.unpaidCount} unpaid session(s)${r.daysSince>0?' · '+r.daysSince+'d overdue':''}`}
      </div>
      <div class="reminder-actions">
        <button class="btn wa sm" onclick="window.open('${waUrl}?text='+encodeURIComponent(buildPaymentReminderWA(siswaList.find(s=>s.id==='${r.siswa.id}'))),'_blank')">💬 Remind via WA</button>
        <button class="btn sm primary" onclick="navigate('payment');openPaymentFormForStudent('${r.siswa.id}')">💰 Record Payment</button>
      </div>
    </div>`;
  }).join('');
}

function buildPaymentReminderWA(siswa){
  if(!siswa) return '';
  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });
  const unpaid = absensiList.filter(a=>a.siswaId===siswa.id && a.status==='Hadir' && !paidSesiIds.has(a.id));
  const fee = siswa.feePerSesi||0;
  const total = fee * unpaid.length;
  const now = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  return `Hello, ${siswa.namaOrtu||'Parent'}.\n\nWe would like to remind you that the English tutoring payment for *${siswa.nama}* has not been settled yet — *${unpaid.length} session(s)* are outstanding${total?` (total: *${fmt(total)}*)`:''}.

Please confirm at your earliest convenience. Thank you 🙏

— LittleLume English Course`;
}

// ════════════════════════════════════════════════
