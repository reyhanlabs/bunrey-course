//  PAYMENT TAB SWITCHER
// ════════════════════════════════════════════════
function switchPayTab(tab){
  ['rekap','hutang'].forEach(t=>{
    document.getElementById('ptab-'+t).classList.toggle('active', t===tab);
    const panel = document.getElementById('ptab-panel-'+t);
    if(panel) panel.style.display = t===tab ? 'block' : 'none';
  });
  if(tab==='hutang') renderHutangSesi();
}

// ════════════════════════════════════════════════
//  SESSION PICKER (for payment form)
// ════════════════════════════════════════════════
function loadSesiForPayment(){
  const siswaId = document.getElementById('b-siswa').value;
  const wrap    = document.getElementById('sesi-picker-wrap');
  const countEl = document.getElementById('sesi-selected-count');

  // ✅ FIX: Always clear wrap + reset count display before rendering
  // Prevents stale checkboxes from a previous form session being counted
  wrap.innerHTML = '';
  if(countEl) countEl.textContent = '';

  if(!siswaId){ wrap.innerHTML='<div style="color:var(--muted);font-size:0.83rem">Please select a student first.</div>'; return; }

  // Get the payment ID being edited (if any)
  const editId = document.getElementById('b-id').value;
  const linkedInCurrentPayment = new Set();
  if(editId){
    const editBayar = bayarList.find(b=>b.id===editId);
    if(editBayar?.sesiIds) editBayar.sesiIds.forEach(id=>linkedInCurrentPayment.add(id));
  }

  // ✅ FIX: Include attendance yang statusnya 'Hadir' ATAU sudah linked di payment yang sedang diedit
  // Ini memastikan jika attendance diedit statusnya, tapi masih terlihat di payment form
  const sesiSiswa = absensiList
    .filter(a => {
      if(a.siswaId !== siswaId) return false;
      // Tampilkan jika: status 'Hadir' ATAU sudah linked di payment yang sedang diedit
      return a.status === 'Hadir' || linkedInCurrentPayment.has(a.id);
    })
    .sort((a,b) => b.tanggal.localeCompare(a.tanggal));

  // Get all already-paid session IDs for this student
  const paidSesiIds = new Set();
  bayarList.filter(b => b.siswaId === siswaId && b.sesiIds && b.sesiIds.length)
    .forEach(b => b.sesiIds.forEach(id => paidSesiIds.add(id)));

  // Also exclude editId's own sesiIds from "paid"
  if(editId){
    const editBayar = bayarList.find(b=>b.id===editId);
    if(editBayar?.sesiIds) editBayar.sesiIds.forEach(id=>paidSesiIds.delete(id));
  }

  if(!sesiSiswa.length){
    wrap.innerHTML='<div style="color:var(--muted);font-size:0.83rem">No attendance records found for this student yet.</div>';
    return;
  }

  wrap.innerHTML = sesiSiswa.map(a => {
    const isPaid = paidSesiIds.has(a.id);
    const isLinkedInCurrent = linkedInCurrentPayment.has(a.id);
    const isInvalid = isLinkedInCurrent && a.status !== 'Hadir';  // Mark if status changed
    const label  = tglFmt(a.tanggal) + (a.keterangan ? ' · '+a.keterangan : '');
    
    let statusHtml = '';
    if(isPaid){
      statusHtml = '<div style="font-size:0.72rem;color:var(--green)">✅ Already paid in another payment</div>';
    } else if(isInvalid){
      // ✅ NEW: Visual warning if attendance status changed
      statusHtml = `<div style="font-size:0.72rem;color:var(--yellow)">⚠️ Status changed to ${a.status} - still linked to this payment</div>`;
    } else {
      statusHtml = '<div style="font-size:0.72rem;color:var(--muted)">Not yet paid</div>';
    }
    
    return `<div class="sesi-row" onclick="toggleSesiCheck('${a.id}')" ${isInvalid ? 'style="opacity:0.7"' : ''}>
      <div class="sesi-check ${isPaid?'checked disabled':''}" id="scheck-${a.id}" title="${isPaid?'Already paid in another transaction':''}">
        ${isPaid?'✓':''}
      </div>
      <div style="flex:1">
        <div style="font-size:0.87rem;font-weight:700">${label}</div>
        ${statusHtml}
      </div>
    </div>`;
  }).join('');

  updateSesiCount();
}

function toggleSesiCheck(sesiId){
  const el = document.getElementById('scheck-'+sesiId);
  if(!el || el.classList.contains('disabled')) return;
  el.classList.toggle('checked');
  el.textContent = el.classList.contains('checked') ? '✓' : '';
  updateSesiCount();
}

// Flag: user sudah edit nominal secara manual?
// Di-reset setiap kali form dibuka baru atau siswa diganti
let _paymentAmountManuallyEdited = false;

function updateSesiCount(){
  const checked = document.querySelectorAll('#sesi-picker-wrap .sesi-check.checked:not(.disabled)').length;
  const countEl = document.getElementById('sesi-selected-count');

  const siswaId = document.getElementById('b-siswa').value;
  const siswa = siswaId ? siswaList.find(x => x.id === siswaId) : null;

  if(siswa && checked > 0){
    const feePerSesi = siswa.feePerSesi || 0;
    if(feePerSesi <= 0){
      if(countEl) countEl.textContent = `${checked} session(s) selected`;
      return;
    }

    const totalAmount = checked * feePerSesi;
    const formatted   = 'Rp ' + Number(totalAmount).toLocaleString('id-ID');

    if(!_paymentAmountManuallyEdited){
      // Selalu update mengikuti jumlah sesi yang aktif dicentang
      document.getElementById('b-tagihan').value = formatted;
      document.getElementById('b-jumlah').value  = formatted;
    }

    if(countEl) countEl.textContent =
      `${checked} session(s) × ${fmt(feePerSesi)} = ${fmt(totalAmount)}` +
      (_paymentAmountManuallyEdited ? ' (nominal diisi manual)' : '');

  } else if(checked === 0){
    if(!_paymentAmountManuallyEdited){
      document.getElementById('b-tagihan').value = '';
      document.getElementById('b-jumlah').value  = '';
    }
    if(countEl) countEl.textContent = '';

  } else if(!siswa){
    document.getElementById('b-tagihan').value = '';
    document.getElementById('b-jumlah').value  = '';
    if(countEl) countEl.textContent = '';
  }
}

function selectAllSesi(select){
  document.querySelectorAll('#sesi-picker-wrap .sesi-check:not(.disabled)').forEach(el=>{
    if(select){ el.classList.add('checked'); el.textContent='✓'; }
    else { el.classList.remove('checked'); el.textContent=''; }
  });
  updateSesiCount();
}

function getSelectedSesiIds(){
  return Array.from(document.querySelectorAll('#sesi-picker-wrap .sesi-check.checked:not(.disabled)'))
    .map(el => el.id.replace('scheck-',''));
}

function renderSesiChecksForEdit(sesiIds){
  // After loading sesi picker for edit, re-check previously selected
  if(!sesiIds || !sesiIds.length) return;
  sesiIds.forEach(id=>{
    const el = document.getElementById('scheck-'+id);
    if(el && !el.classList.contains('disabled')){
      el.classList.add('checked'); el.textContent='✓';
    }
  });
  updateSesiCount();
}

// ════════════════════════════════════════════════
//  PAYMENT
// ════════════════════════════════════════════════
function openPaymentForm(id){
  const b=id?bayarList.find(x=>x.id===id):null;
  // Pastikan tab aktif adalah 'rekap' agar form payment terlihat
  switchPayTab('rekap');
  // Update title form sesuai mode
  document.getElementById('form-payment-title').textContent = b ? '✏️ Edit Payment' : '💰 Record Payment';
  // Reset flag: edit = sudah ada nilai (anggap manual), baru = belum ada
  _paymentAmountManuallyEdited = !!b;
  document.getElementById('b-id').value=b?.id||'';
  document.getElementById('b-periode').value=b?.periode||'';
  document.getElementById('b-tanggal').value=b?.tanggal||new Date().toISOString().slice(0,10);
  document.getElementById('b-jumlah').value=b?.jumlah||'';
  document.getElementById('b-tagihan').value=b?.tagihan||'';
  document.getElementById('b-status').value=b?.status||'Lunas';
  document.getElementById('b-catatan').value=b?.catatan||'';
  
  // ✨ Format number inputs + track manual edit
  formatNumberInput('b-jumlah');
  formatNumberInput('b-tagihan');
  // Set flag saat user mengetik langsung di field nominal
  ['b-jumlah','b-tagihan'].forEach(fid=>{
    const el=document.getElementById(fid);
    if(!el) return;
    if(el._manualEditHandler) el.removeEventListener('input',el._manualEditHandler);
    el._manualEditHandler = ()=>{ _paymentAmountManuallyEdited = true; };
    el.addEventListener('input', el._manualEditHandler);
  });
  
  const siswaEl = document.getElementById('b-siswa');
  if(b){
    // Edit mode — kunci dropdown siswa agar tidak bisa diganti
    // (mengganti siswa akan memindahkan sesiIds ke siswa lain → data rusak)
    const opts=siswaList.map(s=>`<option value="${s.id}"${s.id===b.siswaId?' selected':''}>${s.nama}</option>`).join('');
    siswaEl.innerHTML='<option value="">-- Select --</option>'+opts;
    siswaEl.disabled = true;
    siswaEl.style.opacity = '0.65';
    siswaEl.style.cursor = 'not-allowed';
    onPaymentStudentChange();
    setTimeout(()=>renderSesiChecksForEdit(b.sesiIds||[]),50);
  } else {
    // New payment — unlock dan reset siswa
    siswaEl.disabled = false;
    siswaEl.style.opacity = '';
    siswaEl.style.cursor = '';
    document.getElementById('b-tagihan').value='';
    document.getElementById('b-jumlah').value='';
    siswaEl.value='';
    onPaymentStudentChange();
  }
  openModal('modal-payment');
}
function closePaymentForm(){ closeModal('modal-payment'); document.getElementById('form-payment-title').textContent='💰 Record Payment'; }
function openEditBayar(id){ openPaymentForm(id) }
function savePayment(){
  const siswaId=document.getElementById('b-siswa').value;
  if(!siswaId){ showToast('Select a student!','warn'); return; }
  const s=siswaList.find(x=>x.id===siswaId);
  const id=document.getElementById('b-id').value;
  const isMonthly = (s?.billingType||'per_session')==='monthly';
  const tanggal = document.getElementById('b-tanggal').value;
  const jumlah  = getNumberValue('b-jumlah');
  const tagihan = getNumberValue('b-tagihan');
  const periode = document.getElementById('b-periode').value.trim();

  // ── Validasi wajib ──
  if(!tanggal){ showToast('Payment date is required!','warn'); return; }
  if(jumlah <= 0){ showToast('Amount paid (Jumlah) cannot be zero!','warn'); return; }
  if(tagihan <= 0){ showToast('Invoice amount (Tagihan) cannot be zero!','warn'); return; }

  let sesiIds;
  if(isMonthly){
    if(!periode){
      showToast('Period is required for monthly billing! (e.g. July 2026)','warn'); return;
    }
    sesiIds = getMonthlySessionIds(siswaId, periode);
    if(sesiIds === null){
      // Periode tidak bisa di-parse — tolak simpan agar tidak terjadi link salah bulan
      showToast('Period format not recognized. Use format: "July 2026" or "Juli 2026"','warn'); return;
    }
    if(sesiIds.length === 0){
      // Parse OK tapi tidak ada sesi hadir di bulan itu — izinkan simpan dengan warning
      showToast('No attendance (Hadir) found for this period. Payment saved without session links.','warn');
    }
  } else {
    sesiIds = getSelectedSesiIds();
  }

  const data={
    siswaId, namaSiswa:s?.nama||'-',
    periode,
    tanggal,
    jumlah,
    tagihan,
    status:document.getElementById('b-status').value,
    catatan:document.getElementById('b-catatan').value.trim(),
    sesiIds,
    billingType: isMonthly ? 'monthly' : 'per_session',
  };
  if(id){ const i=bayarList.findIndex(b=>b.id===id); if(i>-1) bayarList[i]={...bayarList[i],...data}; }
  else bayarList.push({id:uid(),...data});
  DB.set('bayar',bayarList);
  closePaymentForm(); renderPayment(); updateUnpaidBadge(); updateMbnBadge();
  // Refresh hutang tab jika sedang aktif
  if(document.getElementById('ptab-hutang')?.classList.contains('active')) renderHutangSesi();
  if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
  showToast('✅ Payment saved!','success');
}

// ── Monthly billing helpers ──
function getMonthlySessionIds(siswaId, periodeText){
  // Parse "June 2026" / "Juni 2025" / "2026-06" → year+month range
  // TIDAK ada fallback ke semua sesi — jika periode tidak bisa di-parse, return array kosong
  // agar savePayment() bisa mendeteksi dan memblokir penyimpanan
  const parsed = parsePeriodeToYearMonth(periodeText);
  if(!parsed) return null;  // ← null = sinyal periode tidak valid (bukan array kosong)
  const {y,m}=parsed;
  return absensiList.filter(a=>{
    if(a.siswaId!==siswaId || a.status!=='Hadir') return false;
    const d=new Date(a.tanggal);
    return d.getFullYear()===y && (d.getMonth()+1)===m;
  }).map(a=>a.id);
}

function parsePeriodeToYearMonth(text){
  if(!text) return null;
  // try "YYYY-MM" format
  const m1=text.match(/(\d{4})[.\-\/](\d{1,2})/);
  if(m1) return {y:+m1[1],m:+m1[2]};
  // try "June 2026" or "Juni 2025"
  const months={jan:1,feb:2,mar:3,apr:4,may:5,mei:5,jun:6,jul:7,aug:8,agu:8,sep:9,okt:10,oct:10,nov:11,des:12,dec:12};
  const m2=text.toLowerCase().match(/([a-z]+)[.\s\-\/]+(\d{4})/);
  if(m2){const key=m2[1].slice(0,3); const mo=months[key]; if(mo) return {y:+m2[2],m:mo};}
  const m3=text.toLowerCase().match(/(\d{4})[.\s\-\/]+([a-z]+)/);
  if(m3){const key=m3[2].slice(0,3); const mo=months[key]; if(mo) return {y:+m3[1],m:mo};}
  return null;
}

function onPaymentStudentChange(){
  // Ganti siswa = reset flag manual edit agar auto-kalkulasi aktif kembali
  // (kecuali sedang mode edit payment yang sudah ada)
  const isEditMode = !!document.getElementById('b-id').value;
  if(!isEditMode) _paymentAmountManuallyEdited = false;
  const siswaId=document.getElementById('b-siswa').value;
  const s=siswaId?siswaList.find(x=>x.id===siswaId):null;
  const isMonthly=(s?.billingType||'per_session')==='monthly';

  // ✅ FIX: Clear sesi-picker and reset nominal when student changes (not edit mode)
  // Prevents stale checkboxes from previous student causing wrong total
  if(!isEditMode){
    const wrap = document.getElementById('sesi-picker-wrap');
    if(wrap) wrap.innerHTML='';
    const countEl = document.getElementById('sesi-selected-count');
    if(countEl) countEl.textContent='';
    if(!_paymentAmountManuallyEdited){
      document.getElementById('b-tagihan').value='';
      document.getElementById('b-jumlah').value='';
    }
  }

  // show/hide panels
  document.getElementById('monthly-pay-panel').style.display=isMonthly?'block':'none';
  document.getElementById('sesi-picker-group').style.display=isMonthly?'none':'block';
  if(isMonthly){
    refreshMonthlyPanel();
  } else {
    loadSesiForPayment();
  }
}

function refreshMonthlyPanel(){
  const siswaId=document.getElementById('b-siswa').value;
  const s=siswaId?siswaList.find(x=>x.id===siswaId):null;
  if(!s || s.billingType!=='monthly') return;
  const periodeText=document.getElementById('b-periode').value.trim();
  const feeMonthly=s.feeMonthly||0;
  const body=document.getElementById('monthly-pay-body');
  // Count sessions in that month
  const parsed=parsePeriodeToYearMonth(periodeText);
  let sesiCount=0, sesiInfo='';
  if(parsed){
    const {y,m}=parsed;
    const sesiInMonth=absensiList.filter(a=>{
      if(a.siswaId!==siswaId||a.status!=='Hadir') return false;
      const d=new Date(a.tanggal); return d.getFullYear()===y&&(d.getMonth()+1)===m;
    });
    sesiCount=sesiInMonth.length;
    sesiInfo=sesiCount>0
      ? `<span style="color:var(--green)">✅ ${sesiCount} sessions present this month</span>`
      : `<span style="color:var(--muted)">⚠️ No attendance records this month</span>`;
  } else {
    sesiInfo=periodeText?`<span style="color:var(--yellow)">⚠️ Unrecognized period format (try: "June 2026")</span>`:`<span style="color:var(--muted)">— Enter a period first (e.g. June 2026)</span>`;
  }
  body.innerHTML=`
    <div>👤 <strong>${s.nama}</strong></div>
    <div>💰 Monthly Fee: <strong style="color:var(--green)">${fmt(feeMonthly)}</strong></div>
    <div>📅 Periode: <strong>${periodeText||'-'}</strong></div>
    <div>${sesiInfo}</div>
    <div style="font-size:0.78rem;color:var(--muted);margin-top:4px">All sessions this month will be automatically linked when saved.</div>
  `;
}

function applyMonthlyBilling(){
  const siswaId=document.getElementById('b-siswa').value;
  const s=siswaId?siswaList.find(x=>x.id===siswaId):null;
  if(!s||!s.feeMonthly){ showToast('Set Monthly Fee in student profile first!','warn'); return; }
  const formatted = 'Rp ' + Number(s.feeMonthly).toLocaleString('id-ID');
  document.getElementById('b-tagihan').value = formatted;
  document.getElementById('b-jumlah').value  = formatted;
  document.getElementById('b-status').value  = 'Lunas';
  // Auto-fill periode dengan bulan berjalan jika masih kosong
  if(!document.getElementById('b-periode').value.trim()){
    const now=new Date();
    document.getElementById('b-periode').value=now.toLocaleString('en',{month:'long'})+' '+now.getFullYear();
    refreshMonthlyPanel();
  }
  showToast(`✅ Invoice & Amount auto-filled: ${fmt(s.feeMonthly)}. Review then click Save.`,'success');
}
function deletePayment(id){
  const payment = bayarList.find(b => b.id === id);
  if(!payment) return;
  
  dangerModal(
    '🗑️ Delete Payment?',
    `Are you sure you want to delete this payment?<br><br>` +
    `<strong>Student:</strong> ${payment.namaSiswa}<br>` +
    `<strong>Amount:</strong> ${fmt(payment.jumlah)}<br>` +
    `<strong>Status:</strong> ${payment.status}<br><br>` +
    `This action cannot be undone.`,
    () => {
      bayarList = bayarList.filter(b => b.id !== id);
      DB.set('bayar', bayarList);
      renderPayment();
      updateUnpaidBadge(); updateMbnBadge();
      if(document.getElementById('ptab-hutang')?.classList.contains('active')) renderHutangSesi();
      if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
      showToast('✅ Payment deleted', 'success');
    },
    { okText: 'Delete', cancelText: 'Cancel' }
  );
}
function deleteBayar(id){ deletePayment(id) }
function setCurrentMonthFilter(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const firstDay = `${y}-${m}-01`;
  const lastDay  = `${y}-${m}-${new Date(y,now.getMonth()+1,0).getDate().toString().padStart(2,'0')}`;
  document.getElementById('f-dari').value   = firstDay;
  document.getElementById('f-sampai').value = lastDay;
  document.getElementById('f-nama').value   = '';
  const fs = document.getElementById('f-sessions'); if(fs) fs.value='';
  const fst = document.getElementById('f-status'); if(fst) fst.value='';
  renderPayment();
}

function clearPaymentFilter(){
  ['f-nama','f-dari','f-sampai'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=''; });
  const fs=document.getElementById('f-sessions'); if(fs) fs.value='';
  const fst=document.getElementById('f-status'); if(fst) fst.value='';
  renderPayment();
}
function renderPayment(){
  // ── Render stats ──
  const statsEl = document.getElementById('payment-stats');
  if(statsEl){
    // Build global paid sesiIds set
    const paidSesiIds = new Set();
    bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });

    // Sesi count hanya untuk siswa per-session (monthly punya kartu outstanding sendiri)
    const perSesiSiswaIds   = new Set(siswaList.filter(s=>s.billingType!=='monthly').map(s=>s.id));
    const totalSesiHadir    = absensiList.filter(a=>perSesiSiswaIds.has(a.siswaId)&&a.status==='Hadir').length;
    const totalSesiTerbayar = Array.from(paidSesiIds).filter(id=>{
      const att = absensiList.find(a=>a.id===id);
      return att && perSesiSiswaIds.has(att.siswaId);
    }).length;
    const sesiHutang        = totalSesiHadir - totalSesiTerbayar;
    // Revenue: hanya payment yang sudah dibayar (Lunas/Cicil), exclude Belum Bayar
    const totalRevenue      = bayarList.filter(b=>b.status!=='Belum Bayar').reduce((s,b)=>s+b.jumlah, 0);

    // Outstanding = unpaid amount per student, aware of billing type
    let outstanding = 0;
    siswaList.forEach(s => {
      if(s.billingType==='monthly'){
        // Monthly: outstanding = months with sessions but no paid record
        // Find distinct year-months that have sessions but no bayar record linked
        const sessionMonths = new Set();
        absensiList.filter(a=>a.siswaId===s.id&&a.status==='Hadir').forEach(a=>{
          const d=new Date(a.tanggal);
          sessionMonths.add(d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0'));
        });
        const paidMonths = new Set();
        bayarList.filter(b=>b.siswaId===s.id&&b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{
          const parsed=parsePeriodeToYearMonth(b.periode||'');
          if(parsed) paidMonths.add(parsed.y+'-'+parsed.m.toString().padStart(2,'0'));
        });
        sessionMonths.forEach(ym=>{ if(!paidMonths.has(ym)) outstanding+=(s.feeMonthly||0); });
      } else {
        const fee = s.feePerSesi || 0;
        if(!fee) return;
        // ✅ IMPROVED: Exclude attendance yang sudah dibayar (dalam paidSesiIds) meskipun statusnya bukan Hadir
        const unpaidCount = absensiList.filter(a =>
          a.siswaId === s.id && a.status === 'Hadir' && !paidSesiIds.has(a.id)
        ).length;
        outstanding += unpaidCount * fee;
      }
    });

    statsEl.innerHTML = `
      <div class="stat-card s-green"><div class="ico">💰</div><div class="val" style="font-size:${totalRevenue>9999999?'1rem':'1.3rem'}">${fmt(totalRevenue)}</div><div class="lbl">Total Revenue</div></div>
      <div class="stat-card s-blue"><div class="ico">📅</div><div class="val">${totalSesiTerbayar}<span style="font-size:1rem;color:var(--muted)">/${totalSesiHadir}</span></div><div class="lbl">Sessions Paid</div></div>
      <div class="stat-card ${sesiHutang>0?'s-yellow':'s-green'}"><div class="ico">⚠️</div><div class="val">${sesiHutang}</div><div class="lbl">Unpaid Sessions</div><div class="trend ${sesiHutang>0?'trend-dn':'trend-up'}">${sesiHutang>0?'Needs attention':'All clear!'}</div></div>
      <div class="stat-card ${outstanding>0?'s-red':'s-green'}"><div class="ico">🧾</div><div class="val" style="font-size:${outstanding>9999999?'1rem':'1.3rem'}">${outstanding>0?fmt(outstanding):'✅'}</div><div class="lbl">Outstanding Balance</div>${outstanding===0&&sesiHutang>0?'<div class="trend trend-neu" style="font-size:0.68rem">Set fee/session in student profile</div>':''}</div>
    `;
  }

  const tbody=document.getElementById('tbody-payment');
  const empty=document.getElementById('empty-payment');
  const totalBar=document.getElementById('payment-total-bar');
  tbody.innerHTML='';
  const fNama    = (document.getElementById('f-nama')?.value||'').trim().toLowerCase();
  const fDari    = document.getElementById('f-dari')?.value||'';
  const fSampai  = document.getElementById('f-sampai')?.value||'';
  const fSessions= document.getElementById('f-sessions')?.value||'';
  const fStatus  = document.getElementById('f-status')?.value||'';
  let list=[...bayarList].sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(fNama)    list=list.filter(b=>b.namaSiswa.toLowerCase().includes(fNama));
  if(fDari)    list=list.filter(b=>b.tanggal>=fDari);
  if(fSampai)  list=list.filter(b=>b.tanggal<=fSampai);
  if(fSessions==='has')  list=list.filter(b=>b.sesiIds && b.sesiIds.length>0);
  if(fSessions==='none') list=list.filter(b=>!b.sesiIds || b.sesiIds.length===0);
  if(fStatus)  list=list.filter(b=>b.status===fStatus);
  const isF=fNama||fDari||fSampai||fSessions||fStatus;
  if(!bayarList.length){ empty.style.display='block'; if(totalBar) totalBar.style.display='none'; return; }
  empty.style.display=list.length?'none':'block';
  if(totalBar) totalBar.style.display='flex';
  const total=list.reduce((s,b)=>s+b.jumlah,0);
  document.getElementById('payment-total-val').textContent=fmt(total);
  document.getElementById('payment-filter-tag').textContent=isF?'(filtered)':'';
  list.forEach(b=>{
    const sc=b.status==='Lunas'?'chip-green':b.status==='Cicil'?'chip-yellow':'chip-red';
    const sl=b.status==='Lunas'?'Paid':b.status==='Cicil'?'Partial':'Unpaid';
    // Build session chips — filtered by selected date range
    let sesiHtml = '-';
    if(b.sesiIds && b.sesiIds.length){
      const filteredSids = b.sesiIds.filter(sid=>{
        const a = absensiList.find(x=>x.id===sid);
        if(!a) return false;
        if(fDari   && a.tanggal < fDari)   return false;
        if(fSampai && a.tanggal > fSampai) return false;
        return true;
      });
      const allCount = b.sesiIds.length;
      const chips = filteredSids.map(sid=>{
        const a = absensiList.find(x=>x.id===sid);
        return a ? `<span class="session-chip paid" title="${tglFmt(a.tanggal)}">${tglFmt(a.tanggal)}</span>` : '';
      }).filter(Boolean).join('');
      if(filteredSids.length > 0){
        sesiHtml = chips;
        // Show note if some sessions are outside filter range
        if(filteredSids.length < allCount){
          sesiHtml += `<span style="color:var(--muted);font-size:0.72rem;display:block;margin-top:3px">+${allCount-filteredSids.length} more outside range</span>`;
        }
      } else {
        // All sessions are outside filter range — still show count dimmed
        sesiHtml = `<span style="color:var(--muted);font-size:0.78rem">${allCount} session(s) — outside filter range</span>`;
      }
    }
    tbody.innerHTML+=`<tr>
      <td style="color:var(--muted);font-size:0.83rem">${tglFmt(b.tanggal)}</td>
      <td><strong>${b.namaSiswa}</strong></td>
      <td style="color:var(--muted);font-size:0.83rem">${b.periode||'-'}</td>
      <td style="max-width:200px">${sesiHtml}</td>
      <td class="r" style="font-weight:800;color:var(--green);font-size:0.87rem;white-space:nowrap">${fmt(b.tagihan)}</td>
      <td class="r" style="font-weight:800;color:var(--green);font-size:0.87rem;white-space:nowrap">${fmt(b.jumlah)}</td>
      <td>${chip(sl,sc)}</td>
      <td style="font-size:0.82rem;color:var(--muted)">${b.catatan||'-'}</td>
      <td class="nowrap">
        <button class="btn sm" onclick="openPaymentForm('${b.id}')" style="margin-right:4px">✏️</button>
        <button class="btn sm" onclick="showReceipt('${b.id}')" style="margin-right:4px">🧾</button>
        <button class="btn danger sm icon-only" onclick="deletePayment('${b.id}')">🗑️</button>
      </td>
    </tr>`;
  });
}
function updateUnpaidBadge(){
  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });
  let n = 0;
  siswaList.forEach(s=>{
    if(s.billingType==='monthly'){
      const sessionMonths = new Set();
      absensiList.filter(a=>a.siswaId===s.id&&a.status==='Hadir').forEach(a=>{
        const d=new Date(a.tanggal);
        sessionMonths.add(d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0'));
      });
      const paidMonths = new Set();
      bayarList.filter(b=>b.siswaId===s.id&&b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{
        const p=parsePeriodeToYearMonth(b.periode||'');
        if(p) paidMonths.add(p.y+'-'+p.m.toString().padStart(2,'0'));
      });
      if([...sessionMonths].some(ym=>!paidMonths.has(ym))) n++;
    } else {
      if(absensiList.some(a=>a.siswaId===s.id&&a.status==='Hadir'&&!paidSesiIds.has(a.id))) n++;
    }
  });
  const el=document.getElementById('unpaid-badge');
  if(el){ el.style.display=n>0?'inline':'none'; if(n>0) el.textContent=n; }
}

// ════════════════════════════════════════════════
//  HUTANG SESI (Unpaid sessions tracker)
// ════════════════════════════════════════════════
function renderHutangSesi(){
  const listEl  = document.getElementById('hutang-sesi-list');
  const emptyEl = document.getElementById('empty-hutang');
  const fNama   = (document.getElementById('hutang-f-nama')?.value||'').trim().toLowerCase();
  listEl.innerHTML = '';

  // Collect all paid sesi IDs globally
  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });

  let anyUnpaid = false;
  siswaList
    .filter(s => !fNama || s.nama.toLowerCase().includes(fNama) || (s.nick||'').toLowerCase().includes(fNama))
    .forEach(siswa => {
      const isMonthly = siswa.billingType==='monthly';

      if(isMonthly){
        // ── Monthly mode: show unpaid months ──
        const sessionMonths = {};
        absensiList.filter(a=>a.siswaId===siswa.id&&a.status==='Hadir').forEach(a=>{
          const d=new Date(a.tanggal);
          const ym=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
          if(!sessionMonths[ym]) sessionMonths[ym]=[];
          sessionMonths[ym].push(a);
        });
        const paidMonths = new Set();
        bayarList.filter(b=>b.siswaId===siswa.id&&b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{
          const parsed=parsePeriodeToYearMonth(b.periode||'');
          if(parsed) paidMonths.add(parsed.y+'-'+parsed.m.toString().padStart(2,'0'));
        });
        const unpaidMonths = Object.keys(sessionMonths).filter(ym=>!paidMonths.has(ym)).sort();
        if(!unpaidMonths.length) return;
        anyUnpaid=true;
        const feeMonthly=siswa.feeMonthly||0;
        const totalHutang=unpaidMonths.length*feeMonthly;
        const pctPaid=Object.keys(sessionMonths).length ? Math.round((paidMonths.size/Object.keys(sessionMonths).length)*100) : 0;
        const monthChips=unpaidMonths.map(ym=>{
          const [y,m]=ym.split('-');
          const label=new Date(+y,+m-1).toLocaleString('en',{month:'short',year:'numeric'});
          const sesiCount=sessionMonths[ym].length;
          return `<span class="session-chip unpaid" title="${sesiCount} sesi">📅 ${label} (${sesiCount}x)</span>`;
        }).join('');
        listEl.innerHTML += `
          <div class="sesi-tracker-card">
            <div class="st-header">
              <div>
                <div class="st-name">👤 ${siswa.nama}${siswa.nick?` <span style="color:var(--muted);font-weight:500;font-size:0.8rem">(${siswa.nick})</span>`:''} <span class="chip chip-purple" style="font-size:0.7rem;vertical-align:middle">📅 Monthly</span></div>
                <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">${unpaidMonths.length} unpaid month(s) · ${pctPaid}% months paid</div>
                <div style="margin-top:4px;font-size:0.8rem">${feeMonthly?`<span style="color:var(--red);font-weight:700">Total: ${fmt(totalHutang)}</span>`:`<span style="color:var(--muted);font-size:0.75rem">⚠️ Set Monthly Fee di profil siswa</span>`}</div>
              </div>
              <button class="btn sm primary" onclick="openPaymentFormForStudent('${siswa.id}')">💰 Pay Monthly</button>
            </div>
            <div class="pbar-wrap" style="margin-bottom:10px"><div class="pbar-fill" style="width:${pctPaid}%"></div></div>
            <div class="st-sessions">${monthChips}</div>
          </div>`;
      } else {
        // ── Per-session mode: existing logic ──
        const sesiHadir = absensiList
          .filter(a => a.siswaId === siswa.id && a.status === 'Hadir')
          .sort((a,b) => a.tanggal.localeCompare(b.tanggal));
        const unpaidSesi = sesiHadir.filter(a => !paidSesiIds.has(a.id));
        if(!unpaidSesi.length) return;
        anyUnpaid = true;
        const pctPaid = sesiHadir.length ? Math.round(((sesiHadir.length - unpaidSesi.length)/sesiHadir.length)*100) : 0;
        const fee = siswa.feePerSesi || 0;
        const totalHutang = fee ? unpaidSesi.length * fee : null;
        const feeInfo = fee
          ? `<span style="color:var(--red);font-weight:700">Total: ${fmt(totalHutang)}</span>`
          : `<span style="color:var(--muted);font-size:0.75rem">⚠️ Set fee/session in student profile</span>`;
        listEl.innerHTML += `
          <div class="sesi-tracker-card">
            <div class="st-header">
              <div>
                <div class="st-name">👤 ${siswa.nama}${siswa.nick ? ` <span style="color:var(--muted);font-weight:500;font-size:0.8rem">(${siswa.nick})</span>` : ''}</div>
                <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">${unpaidSesi.length} unpaid session(s) · ${sesiHadir.length} total present · ${pctPaid}% paid</div>
                <div style="margin-top:4px;font-size:0.8rem">${feeInfo}</div>
              </div>
              <button class="btn sm primary" onclick="openPaymentFormForStudent('${siswa.id}')">💰 Record Payment</button>
            </div>
            <div class="pbar-wrap" style="margin-bottom:10px"><div class="pbar-fill" style="width:${pctPaid}%"></div></div>
            <div class="st-sessions">
              ${unpaidSesi.map(a=>`<span class="session-chip unpaid" title="${a.tanggal}">📅 ${tglFmt(a.tanggal)}</span>`).join('')}
            </div>
          </div>`;
      }
    });
  emptyEl.style.display = anyUnpaid ? 'none' : 'block';
}

function openPaymentFormForStudent(siswaId){
  document.getElementById('form-payment-title').textContent = '💰 Record Payment';
  _paymentAmountManuallyEdited = false;
  document.getElementById('b-id').value='';
  document.getElementById('b-periode').value='';
  document.getElementById('b-tanggal').value=new Date().toISOString().slice(0,10);
  document.getElementById('b-jumlah').value='';
  document.getElementById('b-tagihan').value='';
  document.getElementById('b-status').value='Lunas';
  document.getElementById('b-catatan').value='';
  const opts = siswaList.map(s=>`<option value="${s.id}"${s.id===siswaId?' selected':''}>${s.nama}</option>`).join('');
  const siswaEl = document.getElementById('b-siswa');
  siswaEl.innerHTML='<option value="">-- Select --</option>'+opts;
  siswaEl.disabled=false; siswaEl.style.opacity=''; siswaEl.style.cursor='';
  openModal('modal-payment');
  onPaymentStudentChange();
}

// ════════════════════════════════════════════════
//  RECEIPT
// ════════════════════════════════════════════════
// ── Estimate how many times/week from Class Days text ──
function _estimateWeeklyFreq(hariText){
  if(!hariText) return 0;
  const t = hariText.toLowerCase();
  // Count keyword matches for day names (en + id)
  const dayWords = ['mon','tue','wed','thu','fri','sat','sun',
                    'sen','sel','rab','kam','jum','sab','ming'];
  let count = 0;
  dayWords.forEach(d=>{ if(t.includes(d)) count++; });
  // If no day names found, try counting separators (&, ,, +, dan, and)
  if(count === 0){
    const seps = (t.match(/[&,+]|\bdan\b|\band\b/g)||[]).length;
    count = seps + (seps > 0 ? 1 : 0);
  }
  return Math.max(count, 1);
}

// ── Estimate sessions in a month from period string + weekly freq ──
function _estimateMonthSessions(periodeStr, freq){
  if(!periodeStr || freq <= 0) return freq * 4;
  // Parse "June 2026", "Juni 2026", "2026-06" etc
  const d = new Date(periodeStr);
  let weeks = 4.33; // default average
  if(!isNaN(d)){
    const y = d.getFullYear(), m = d.getMonth();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    weeks = daysInMonth / 7;
  }
  return Math.round(freq * weeks);
}

function _buildReceiptBodyHTML(b,siswa){
  const rno='BREC-'+b.id.slice(-6).toUpperCase();
  const stc=b.status==='Lunas'?'#00d68f':b.status==='Cicil'?'#ffb347':'#ff4f6d';
  const stl=b.status==='Lunas'?'✅ PAID IN FULL':b.status==='Cicil'?'⚠️ PARTIAL':'❌ UNPAID';
  const isMonthly = b.billingType==='monthly';
  const rows=[
    ['Payment Date', tglFmt(b.tanggal)],
    siswa?.namaOrtu  ? ['Parent', siswa.namaOrtu] : null,
    ['Total Invoice', fmt(b.tagihan)],
  ].filter(Boolean);

  if(isMonthly){
    rows.push(['Coverage', 'All sessions in period']);
  } else {
    if(b.sesiIds && b.sesiIds.length){
      const sesiLabels = b.sesiIds.map(id=>{
        const a = absensiList.find(x=>x.id===id);
        return a ? tglFmt(a.tanggal) : id;
      }).join(', ');
      rows.push(['Sessions ('+b.sesiIds.length+'×)', sesiLabels]);
    }
  }
  const paidPct = b.tagihan>0 ? Math.round((b.jumlah/b.tagihan)*100) : 0;
  return {rno,stc,stl,rows,isMonthly,paidPct};
}
function showReceipt(id){
  const b=bayarList.find(x=>x.id===id); if(!b) return;
  const siswa=siswaList.find(s=>s.id===b.siswaId);
  const {rno,stc,stl,rows,isMonthly,paidPct}=_buildReceiptBodyHTML(b,siswa);
  const initials=(b.namaSiswa||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const billingLabel=isMonthly?'Monthly':'Per Session';
  const stBg=b.status==='Lunas'?'#e0fdf4':b.status==='Cicil'?'#fff7ed':'#fef2f2';
  const stBorder=b.status==='Lunas'?'#5eead4':b.status==='Cicil'?'#fed7aa':'#fca5a5';
  const stText=b.status==='Lunas'?'#0f4c4c':b.status==='Cicil'?'#7c2d12':'#7f1d1d';
  const gridItems=rows.map(([k,v])=>
    `<div style="background:#fff;border:1px solid #f9a8d4;border-radius:8px;padding:8px 10px">
      <div style="font-size:0.6rem;color:#ec4899;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">${k}</div>
      <div style="font-size:0.78rem;font-weight:700;color:#4a1942;margin-top:3px;word-break:break-word">${v}</div>
    </div>`
  ).join('');
  const html=
    `<div style="background:linear-gradient(135deg,#fdf2f8,#f0fdfa);padding:14px 16px;display:flex;align-items:center;gap:10px">` +
      `<div style="width:44px;height:44px;border-radius:12px;overflow:hidden;flex-shrink:0;border:2px solid #f9a8d4">` +
        `<img src="https://raw.githubusercontent.com/reyhanlabs/bunrey-course/refs/heads/main/favicon.ico" crossorigin="anonymous" style="width:44px;height:44px;object-fit:cover">` +
      `</div>` +
      `<div style="flex:1;min-width:0">` +
        `<div style="font-size:0.85rem;font-weight:800;line-height:1.2"><span style="color:#ec4899">Little</span><span style="color:#0d9488">Lume</span></div>` +
        `<div style="font-size:0.85rem;font-weight:800;line-height:1.2"><span style="color:#ec4899">English</span><span style="color:#0d9488"> Course</span></div>` +
        `<div style="color:#0d9488;font-size:0.58rem;margin-top:2px">Tuition Payment Receipt</div>` +
      `</div>` +
      `<div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);border-radius:20px;padding:3px 9px;font-size:0.58rem;font-weight:800;color:#4a1942;font-family:monospace;white-space:nowrap;flex-shrink:0;border:1px solid #f9a8d4">${rno}</div>` +
    `</div>` +
    `<div style="background:linear-gradient(135deg,#fdf2f8,#f0fdfa);line-height:0">` +
      `<svg viewBox="0 0 300 16" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><path d="M0,0 Q15,16 30,0 Q45,16 60,0 Q75,16 90,0 Q105,16 120,0 Q135,16 150,0 Q165,16 180,0 Q195,16 210,0 Q225,16 240,0 Q255,16 270,0 Q285,16 300,0 L300,16 L0,16 Z" fill="#fef9ff"/></svg>` +
    `</div>` +
    `<div style="background:#fef9ff;padding:12px 14px">` +
      `<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;background:linear-gradient(135deg,#fce7f3,#d1fae5);border-radius:10px;margin-bottom:10px;border:1px solid #f9a8d4">` +
        `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#0d9488);display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:800;color:#fff;flex-shrink:0">${initials}</div>` +
        `<div style="min-width:0">` +
          `<div style="font-size:0.85rem;font-weight:800;color:#4a1942">${b.namaSiswa||'-'}</div>` +
          `<div style="font-size:0.68rem;color:#0d9488;margin-top:1px">${billingLabel}${b.periode?' · '+b.periode:''}</div>` +
        `</div>` +
      `</div>` +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">` +
        gridItems +
        `<div style="background:linear-gradient(135deg,#db2777,#0d9488);border-radius:8px;padding:8px 10px">` +
          `<div style="font-size:0.6rem;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Amount Paid</div>` +
          `<div style="font-size:0.85rem;font-weight:800;color:#fff;margin-top:3px">${fmt(b.jumlah)}</div>` +
        `</div>` +
      `</div>` +
      (b.status==='Cicil'?
        `<div style="background:#fce7f3;border-radius:6px;height:7px;margin-bottom:5px"><div style="background:linear-gradient(90deg,#ec4899,#0d9488);border-radius:6px;height:7px;width:${paidPct}%"></div></div>` +
        `<div style="font-size:0.65rem;color:#db2777;text-align:right;margin-bottom:10px;font-weight:600">${paidPct}% paid — ${fmt(b.tagihan-b.jumlah)} remaining</div>`
      :'') +
      `<div style="text-align:center;padding:9px;background:${stBg};border-radius:8px;border:1px solid ${stBorder}">` +
        `<span style="font-size:0.72rem;font-weight:800;color:${stText}">${stl}</span>` +
      `</div>` +
      (b.catatan?`<div style="font-size:0.72rem;color:#0d9488;text-align:center;margin-top:8px;font-style:italic">Note: ${b.catatan}</div>`:'') +
    `</div>` +
    `<div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);line-height:0">` +
      `<svg viewBox="0 0 300 16" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><path d="M0,16 Q15,0 30,16 Q45,0 60,16 Q75,0 90,16 Q105,0 120,16 Q135,0 150,16 Q165,0 180,16 Q195,0 210,16 Q225,0 240,16 Q255,0 270,16 Q285,0 300,16 L300,0 L0,0 Z" fill="#fef9ff"/></svg>` +
    `</div>` +
    `<div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);padding:10px 16px;text-align:center">` +
      `<div style="font-size:0.62rem;font-weight:700"><span style="color:#ec4899">Little</span><span style="color:#0d9488">Lume</span> <span style="color:#ec4899">English</span><span style="color:#0d9488"> Course</span></div>` +
    `</div>`;
  document.getElementById('receipt-content').innerHTML=html;
  document.getElementById('modal-receipt').dataset.receiptId=id;
  document.getElementById('modal-receipt').dataset.receiptText=
    `LITTLELUME ENGLISH COURSE\nPayment Receipt — ${rno}\n\n${rows.map(([k,v])=>k.padEnd(16)+': '+v).join('\n')}\n\nAmount Paid     : ${fmt(b.jumlah)}\nStatus          : ${b.status}\n${b.catatan?'Note            : '+b.catatan+'\n':''}\nThank you for your trust!`;
  document.getElementById('wa-status').style.display='none';
  openModal('modal-receipt');
}
function _buildReceiptPrintHTML(b,siswa){
  const {rno,stc,stl,rows,isMonthly,paidPct}=_buildReceiptBodyHTML(b,siswa);
  const initials=(b.namaSiswa||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const billingLabel=isMonthly?'Monthly':'Per Session';
  const stBg=b.status==='Lunas'?'#e0fdf4':b.status==='Cicil'?'#fff7ed':'#fef2f2';
  const stBorder=b.status==='Lunas'?'#5eead4':b.status==='Cicil'?'#fed7aa':'#fca5a5';
  const stText=b.status==='Lunas'?'#0f4c4c':b.status==='Cicil'?'#7c2d12':'#7f1d1d';
  const scTop=`<svg viewBox="0 0 380 18" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><path d="M0,0 Q19,18 38,0 Q57,18 76,0 Q95,18 114,0 Q133,18 152,0 Q171,18 190,0 Q209,18 228,0 Q247,18 266,0 Q285,18 304,0 Q323,18 342,0 Q361,18 380,0 L380,18 L0,18 Z" fill="#fef9ff"/></svg>`;
  const scBot=`<svg viewBox="0 0 380 18" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><path d="M0,18 Q19,0 38,18 Q57,0 76,18 Q95,0 114,18 Q133,0 152,18 Q171,0 190,18 Q209,0 228,18 Q247,0 266,18 Q285,0 304,18 Q323,0 342,18 Q361,0 380,18 L380,0 L0,0 Z" fill="#fef9ff"/></svg>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt ${rno}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;max-width:380px;margin:auto;background:#fef9ff;color:#4a1942}
    @page{size:A5 portrait;margin:8mm}
    .hdr{background:linear-gradient(135deg,#fdf2f8,#f0fdfa);padding:18px 16px;display:flex;align-items:center;gap:12px}
    .logo-img{width:44px;height:44px;border-radius:12px;border:2px solid #f9a8d4;overflow:hidden;flex-shrink:0}
    .logo-img img{width:100%;height:100%;object-fit:cover}
    .brand1{font-size:0.92rem;font-weight:800;line-height:1.15}.brand2{font-size:0.92rem;font-weight:800;line-height:1.15}
    .sub{color:#0d9488;font-size:0.62rem;margin-top:2px}
    .rno{margin-left:auto;background:linear-gradient(135deg,#fce7f3,#d1fae5);border-radius:20px;padding:3px 10px;font-size:0.6rem;font-weight:800;color:#4a1942;font-family:monospace;white-space:nowrap;border:1px solid #f9a8d4}
    .body{background:#fef9ff;padding:12px 16px}
    .student{display:flex;align-items:center;gap:10px;padding:10px;background:linear-gradient(135deg,#fce7f3,#d1fae5);border-radius:10px;margin-bottom:10px;border:1px solid #f9a8d4}
    .avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#0d9488);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0}
    .sname{font-size:0.85rem;font-weight:800;color:#4a1942}
    .smeta{font-size:0.68rem;color:#0d9488;margin-top:1px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}
    .cell{background:#fff;border:1px solid #f9a8d4;border-radius:8px;padding:8px 10px}
    .clabel{font-size:0.6rem;color:#ec4899;text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
    .cval{font-size:0.78rem;font-weight:700;color:#4a1942;margin-top:3px}
    .cell-amt{background:linear-gradient(135deg,#db2777,#0d9488);border-radius:8px;padding:8px 10px}
    .amt-label{font-size:0.6rem;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
    .amt-val{font-size:0.85rem;font-weight:800;color:#fff;margin-top:3px}
    .status{text-align:center;padding:9px;border-radius:8px;font-size:0.75rem;font-weight:800}
    .note{font-size:0.72rem;color:#0d9488;text-align:center;margin-top:8px;font-style:italic}
    .footer{background:linear-gradient(135deg,#fce7f3,#d1fae5);padding:10px 16px;text-align:center}
    .fbrand{font-size:0.65rem;font-weight:700}
    .prog-track{background:#fce7f3;border-radius:6px;height:7px;margin-bottom:5px}
    .prog-fill{background:linear-gradient(90deg,#ec4899,#0d9488);border-radius:6px;height:7px}
    .prog-text{font-size:0.65rem;color:#db2777;text-align:right;margin-bottom:10px;font-weight:600}
  </style></head><body>
  <div class="hdr">
    <div class="logo-img"><img src="https://raw.githubusercontent.com/reyhanlabs/bunrey-course/refs/heads/main/favicon.ico"></div>
    <div>
      <div class="brand1"><span style="color:#ec4899">Little</span><span style="color:#0d9488">Lume</span></div>
      <div class="brand2"><span style="color:#ec4899">English</span><span style="color:#0d9488"> Course</span></div>
      <div class="sub">Tuition Payment Receipt</div>
    </div>
    <div class="rno">${rno}</div>
  </div>
  <div style="background:linear-gradient(135deg,#fdf2f8,#f0fdfa);line-height:0">${scTop}</div>
  <div class="body">
    <div class="student">
      <div class="avatar">${initials}</div>
      <div><div class="sname" style="word-spacing:2px;letter-spacing:0.2px">${b.namaSiswa||'-'}</div><div class="smeta">${billingLabel}${b.periode ? ' · ' + b.periode : ''}</div></div>
    </div>
    <div class="grid">
      ${rows.map(([k,v])=>`<div class="cell"><div class="clabel">${k}</div><div class="cval">${v}</div></div>`).join('')}
      <div class="cell-amt"><div class="amt-label">Amount Paid</div><div class="amt-val">${fmt(b.jumlah)}</div></div>
    </div>
    ${b.status==='Cicil'?`<div class="prog-track"><div class="prog-fill" style="width:${paidPct}%"></div></div><div class="prog-text">${paidPct}% paid — ${fmt(b.tagihan-b.jumlah)} remaining</div>`:''}
    <div class="status" style="background:${stBg};border:1px solid ${stBorder};color:${stText}">${stl}</div>
    ${b.catatan?`<div class="note">Note: ${b.catatan}</div>`:''}
  </div>
  <div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);line-height:0">${scBot}</div>
  <div class="footer">
    <div class="fbrand"><span style="color:#ec4899">Little</span><span style="color:#0d9488">Lume</span> <span style="color:#ec4899">English</span> <span style="color:#0d9488">Course</span></div>
    <div style="font-size:0.6rem;color:#0d9488;margin-top:2px">Thank you for your trust!</div>
  </div>
  </body></html>`;
}
function _buildReceiptRenderHTML(b,siswa){
  const {rno,stc,stl,rows,isMonthly,paidPct}=_buildReceiptBodyHTML(b,siswa);
  const initials=(b.namaSiswa||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const billingLabel=isMonthly?'Monthly':'Per Session';
  const stBg=b.status==='Lunas'?'#e0fdf4':b.status==='Cicil'?'#fff7ed':'#fef2f2';
  const stBorder=b.status==='Lunas'?'#5eead4':b.status==='Cicil'?'#fed7aa':'#fca5a5';
  const stText=b.status==='Lunas'?'#0f4c4c':b.status==='Cicil'?'#7c2d12':'#7f1d1d';
  const scTop=`<svg viewBox="0 0 380 18" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><path d="M0,0 Q19,18 38,0 Q57,18 76,0 Q95,18 114,0 Q133,18 152,0 Q171,18 190,0 Q209,18 228,0 Q247,18 266,0 Q285,18 304,0 Q323,18 342,0 Q361,18 380,0 L380,18 L0,18 Z" fill="#fef9ff"/></svg>`;
  const scBot=`<svg viewBox="0 0 380 18" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><path d="M0,18 Q19,0 38,18 Q57,0 76,18 Q95,0 114,18 Q133,0 152,18 Q171,0 190,18 Q209,0 228,18 Q247,0 266,18 Q285,0 304,18 Q323,0 342,18 Q361,0 380,18 L380,0 L0,0 Z" fill="#fef9ff"/></svg>`;
  return `<div style="background:linear-gradient(135deg,#fdf2f8,#f0fdfa);padding:16px;display:flex;align-items:center;gap:12px">
    <div style="width:44px;height:44px;border-radius:12px;overflow:hidden;flex-shrink:0;border:2px solid #f9a8d4">
      <img src="https://raw.githubusercontent.com/reyhanlabs/bunrey-course/refs/heads/main/favicon.ico" crossorigin="anonymous" style="width:44px;height:44px;object-fit:cover">
    </div>
    <div style="flex:1">
      <div style="font-size:0.95rem;font-weight:800;line-height:1.2">
        <span style="color:#ec4899">Little</span><span style="color:#0d9488">Lume</span></div>
      <div style="font-size:0.88rem;font-weight:800;line-height:1.2"><span style="color:#ec4899">English</span><span style="color:#0d9488"> Course</span></div>
      <div style="color:#0d9488;font-size:0.6rem;margin-top:3px">Tuition Payment Receipt</div>
    </div>
    <div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);border-radius:20px;padding:3px 10px;font-size:0.6rem;font-weight:800;color:#4a1942;font-family:monospace;border:1px solid #f9a8d4">${rno}</div>
  </div>
  <div style="background:linear-gradient(135deg,#fdf2f8,#f0fdfa);line-height:0">${scTop}</div>
  <div style="background:#fef9ff;padding:12px 16px">
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:linear-gradient(135deg,#fce7f3,#d1fae5);border-radius:10px;margin-bottom:10px;border:1px solid #f9a8d4">
      <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#0d9488);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0">${initials}</div>
      <div>
        <div style="font-size:0.85rem;font-weight:800;color:#4a1942;word-spacing:2px;letter-spacing:0.2px">${b.namaSiswa||'-'}</div>
        <div style="font-size:0.68rem;color:#0d9488;margin-top:1px">${billingLabel}${b.periode ? ' · ' + b.periode : ''}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">
      ${rows.map(([k,v])=>`<div style="background:#fff;border:1px solid #f9a8d4;border-radius:8px;padding:8px 10px"><div style="font-size:0.6rem;color:#ec4899;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">${k}</div><div style="font-size:0.78rem;font-weight:700;color:#4a1942;margin-top:3px">${v}</div></div>`).join('')}
      <div style="background:linear-gradient(135deg,#db2777,#0d9488);border-radius:8px;padding:8px 10px">
        <div style="font-size:0.6rem;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Amount Paid</div>
        <div style="font-size:0.85rem;font-weight:800;color:#fff;margin-top:3px">${fmt(b.jumlah)}</div>
      </div>
    </div>
    ${b.status==='Cicil'?`<div style="background:#fce7f3;border-radius:6px;height:7px;margin-bottom:5px"><div style="background:linear-gradient(90deg,#ec4899,#0d9488);border-radius:6px;height:7px;width:${paidPct}%"></div></div><div style="font-size:0.65rem;color:#db2777;text-align:right;margin-bottom:10px;font-weight:600">${paidPct}% paid — ${fmt(b.tagihan-b.jumlah)} remaining</div>`:''}
    <div style="text-align:center;padding:9px;background:${stBg};border-radius:8px;border:1px solid ${stBorder}">
      <span style="font-size:0.72rem;font-weight:800;color:${stText}">${stl}</span>
    </div>
    ${b.catatan?`<div style="font-size:0.72rem;color:#0d9488;text-align:center;margin-top:8px;font-style:italic">Note: ${b.catatan}</div>`:''}
  </div>
  <div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);line-height:0">${scBot}</div>
  <div style="background:linear-gradient(135deg,#fce7f3,#d1fae5);padding:10px 16px;text-align:center">
    <div style="font-size:0.65rem;font-weight:700">
      <span style="color:#ec4899">Little</span><span style="color:#0d9488">Lume</span>
      <span style="color:#ec4899"> English</span><span style="color:#0d9488"> Course</span>
    </div>
    <div style="font-size:0.6rem;color:#0d9488;margin-top:2px">Thank you for your trust!</div>
  </div>`;
}
async function _renderToCanvas(b,siswa){
  const panel=document.getElementById('receipt-render-panel');
  panel.innerHTML=_buildReceiptRenderHTML(b,siswa);
  // Tunggu semua <img> dalam panel selesai load sebelum capture
  await Promise.all(
    [...panel.querySelectorAll('img')].map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 5000); })
    )
  );
  // Beri sedikit jeda agar browser selesai layout
  await new Promise(r => setTimeout(r, 80));
  const canvas = await html2canvas(panel, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#fdf2f8',
    width: 380,
    windowWidth: 380,
    imageTimeout: 8000,
    logging: false
  });
  panel.innerHTML = '';
  return canvas;
}
function printReceipt(){
  const id=document.getElementById('modal-receipt').dataset.receiptId;
  const b=bayarList.find(x=>x.id===id); if(!b) return;
  const siswa=siswaList.find(s=>s.id===b.siswaId);
  const w=window.open('','_blank','width=500,height=720');
  w.document.write(_buildReceiptPrintHTML(b,siswa)+`<script>window.onload=function(){window.print();}<\/script>`);
  w.document.close();
}
function downloadPDF(){
  const id=document.getElementById('modal-receipt').dataset.receiptId;
  const b=bayarList.find(x=>x.id===id); if(!b) return;
  const siswa=siswaList.find(s=>s.id===b.siswaId);
  const w=window.open('','_blank','width=500,height=720');
  w.document.write(_buildReceiptPrintHTML(b,siswa)+`<script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script>`);
  w.document.close();
}
async function downloadPNG(){
  const id=document.getElementById('modal-receipt').dataset.receiptId;
  const b=bayarList.find(x=>x.id===id); if(!b) return;
  const siswa=siswaList.find(s=>s.id===b.siswaId);
  const ws=document.getElementById('wa-status');
  ws.style.display='block'; ws.textContent='⏳ Generating image…';
  try{
    const canvas=await _renderToCanvas(b,siswa);
    const _safeName1=(b.namaSiswa||'Student').replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/ +/g,'_');
    const _safeDate1=(b.tanggal||'').slice(0,10);
    const a=document.createElement('a');
    a.download='Receipt-'+_safeName1+'-'+_safeDate1+'.png';
    a.href=canvas.toDataURL('image/png'); a.click();
    ws.textContent='✅ Saved to Downloads.';
    setTimeout(()=>ws.style.display='none',4000);
  }catch(e){ ws.textContent='❌ Failed. Try Print instead.' }
}
function waText(){
  const text=document.getElementById('modal-receipt').dataset.receiptText||'';
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
}
async function waImage(){
  const id=document.getElementById('modal-receipt').dataset.receiptId;
  const b=bayarList.find(x=>x.id===id); if(!b) return;
  const siswa=siswaList.find(s=>s.id===b.siswaId);
  const ws=document.getElementById('wa-status');
  const btn=document.getElementById('btn-wa-img');
  ws.style.display='block'; ws.textContent='⏳ Generating image…'; btn.disabled=true;
  try{
    const canvas=await _renderToCanvas(b,siswa);
    const _safeName2=(b.namaSiswa||'Student').replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/ +/g,'_');
    const _safeDate2=(b.tanggal||'').slice(0,10);
    const a=document.createElement('a');
    a.download='Receipt-'+_safeName2+'-'+_safeDate2+'.png';
    a.href=canvas.toDataURL('image/png'); a.click();
    await new Promise(r=>setTimeout(r,600));
    const hp=(siswa?.hp||'').replace(/\D/g,'');
    const waUrl=hp?`https://wa.me/62${hp.replace(/^0/,'')}?text=${encodeURIComponent('Receipt for '+b.namaSiswa)}`:`https://wa.me/?text=${encodeURIComponent('Receipt for '+b.namaSiswa)}`;
    window.open(waUrl,'_blank');
    ws.innerHTML='✅ Image saved → WhatsApp opened → tap 📎 → Gallery to attach.';
    setTimeout(()=>ws.style.display='none',7000);
  }catch(e){ ws.textContent='❌ Failed. Try Save PNG.' }
  btn.disabled=false;
}
function copyReceipt(){
  const text=document.getElementById('modal-receipt').dataset.receiptText||'';
  navigator.clipboard.writeText(text).then(()=>showToast('✅ Copied to clipboard!','success'));
}

// ════════════════════════════════════════════════
