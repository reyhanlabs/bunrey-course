//  DASHBOARD
// ════════════════════════════════════════════════
let chartRevInst;
function setCurrentMonthDashFilter(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const lastDay = new Date(y, now.getMonth()+1, 0).getDate().toString().padStart(2,'0');
  const dari = document.getElementById('dash-dari');
  const sampai = document.getElementById('dash-sampai');
  const periode = document.getElementById('dash-periode');
  if(dari)   dari.value   = `${y}-${m}-01`;
  if(sampai) sampai.value = `${y}-${m}-${lastDay}`;
  if(periode) periode.value = '';
  renderDashboard();
}

function clearDashFilter(){
  ['dash-dari','dash-sampai','dash-periode'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  renderDashboard();
}

function renderDashboard(){
  const today = new Date().toISOString().slice(0,10);
  const todayDay = new Date().toLocaleDateString('en-US',{weekday:'short'});

  // Read filters
  const fDari    = document.getElementById('dash-dari')?.value    || '';
  const fSampai  = document.getElementById('dash-sampai')?.value  || '';
  const fPeriode = (document.getElementById('dash-periode')?.value || '').trim().toLowerCase();
  const isFiltered = fDari || fSampai || fPeriode;

  // Filter payment list
  let filteredPay = [...bayarList];
  if(fDari)    filteredPay = filteredPay.filter(b=>b.tanggal>=fDari);
  if(fSampai)  filteredPay = filteredPay.filter(b=>b.tanggal<=fSampai);
  if(fPeriode) filteredPay = filteredPay.filter(b=>(b.periode||'').toLowerCase().includes(fPeriode));

  const totalStudents = siswaList.length;
  // Revenue: hanya Lunas dan Cicil — exclude Belum Bayar (dicatat tapi belum dibayar)
  const totalRevenue  = filteredPay.filter(b=>b.status!=='Belum Bayar').reduce((s,b)=>s+b.jumlah,0);

  // FIX: Unpaid Bills = accurate outstanding count per student (same logic as Payment page)
  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });

  // Count students with unpaid sessions (per_session) or unpaid months (monthly)
  let unpaid = 0;
  siswaList.forEach(s => {
    if(s.billingType==='monthly'){
      const sessionMonths = new Set();
      absensiList.filter(a=>a.siswaId===s.id&&a.status==='Hadir').forEach(a=>{
        const d=new Date(a.tanggal);
        const ym=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
        // If filtered by date range, only count months within range
        if(fDari && a.tanggal<fDari) return;
        if(fSampai && a.tanggal>fSampai) return;
        sessionMonths.add(ym);
      });
      const paidMonths = new Set();
      bayarList.filter(b=>b.siswaId===s.id&&b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{
        const parsed=parsePeriodeToYearMonth(b.periode||'');
        if(parsed) paidMonths.add(parsed.y+'-'+parsed.m.toString().padStart(2,'0'));
      });
      sessionMonths.forEach(ym=>{ if(!paidMonths.has(ym)) unpaid++; });
    } else {
      const unpaidSessions = absensiList.filter(a => {
        if(a.siswaId!==s.id || a.status!=='Hadir') return false;
        if(fDari && a.tanggal<fDari) return false;
        if(fSampai && a.tanggal>fSampai) return false;
        return !paidSesiIds.has(a.id);
      }).length;
      if(unpaidSessions>0) unpaid++;
    }
  });

  // Attendance filtered
  let filteredAtt = [...absensiList];
  if(fDari)   filteredAtt = filteredAtt.filter(a=>a.tanggal>=fDari);
  if(fSampai) filteredAtt = filteredAtt.filter(a=>a.tanggal<=fSampai);
  const todayAtt      = absensiList.filter(a=>a.tanggal===today);
  const presentToday  = todayAtt.filter(a=>a.status==='Hadir').length;
  const presentFiltered = filteredAtt.filter(a=>a.status==='Hadir').length;
  const filterLabel   = isFiltered ? ' <span style="font-size:0.65rem;color:var(--yellow)">(filtered)</span>' : '';

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card s-purple"><div class="ico">👤</div><div class="val">${totalStudents}</div><div class="lbl">Total Students</div></div>
    <div class="stat-card s-green"><div class="ico">💰</div><div class="val" style="font-size:${totalRevenue>9999999?'1rem':'1.3rem'}">${fmt(totalRevenue)}</div><div class="lbl">Revenue${filterLabel}</div></div>
    <div class="stat-card s-red"><div class="ico">⚠️</div><div class="val">${unpaid}</div><div class="lbl">Unpaid Bills${filterLabel}</div><div class="trend ${unpaid>0?'trend-dn':'trend-up'}">${unpaid>0?'Needs attention':'All clear!'}</div></div>
    <div class="stat-card s-blue"><div class="ico">📋</div><div class="val">${isFiltered?presentFiltered+'/'+filteredAtt.length:presentToday+'/'+(todayAtt.length||totalStudents)}</div><div class="lbl">${isFiltered?'Present (filtered)':'Present Today'}</div></div>
  `;

  const alerts=[];
  if(unpaid>0) alerts.push(`<div class="alert-card alert-danger">⚠️ <span>${unpaid} student(s) have unpaid bills${isFiltered?' in selected period':''}.  <a href="#" onclick="navigate('payment');return false" style="color:inherit;text-decoration:underline">View Payment</a></span></div>`);
  const noEvalThisWeek = siswaList.filter(s=>{
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
    return !evaluasiList.find(e=>e.siswaId===s.id && new Date(e.tanggal)>=weekAgo);
  });
  if(noEvalThisWeek.length>0 && siswaList.length>0) alerts.push(`<div class="alert-card alert-warn">📝 ${noEvalThisWeek.length} student(s) have no evaluation this week.</div>`);
  document.getElementById('dash-alerts').innerHTML = alerts.join('');

  // Weekly schedule grid
  renderWeekGrid();

  const recentPay = filteredPay.sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,5);
  const payEl = document.getElementById('dash-payments');
  if(recentPay.length===0){
    payEl.innerHTML=`<div style="color:var(--muted);font-size:0.87rem;text-align:center;padding:20px">No payments${isFiltered?' in selected period':''} recorded.</div>`;
  } else {
    payEl.innerHTML = recentPay.map(b=>`
      <div class="schedule-row">
        <div><div style="font-weight:700;font-size:0.87rem">${b.namaSiswa}</div><div style="font-size:0.75rem;color:var(--muted)">${tglFmt(b.tanggal)} · ${b.periode||'-'}</div></div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-weight:800;font-size:0.9rem;color:var(--green)">${fmt(b.jumlah)}</div>
          ${b.status==='Lunas'?chip('Paid','chip-green'):b.status==='Cicil'?chip('Partial','chip-yellow'):chip('Unpaid','chip-red')}
        </div>
      </div>`).join('');
  }
  renderRevenueChart('chart-revenue', fDari, fSampai, fPeriode);
}

function getMonthlyRevenue(fDari='', fSampai='', fPeriode=''){
  const months={};
  let list = [...bayarList];
  if(fDari)    list=list.filter(b=>b.tanggal>=fDari);
  if(fSampai)  list=list.filter(b=>b.tanggal<=fSampai);
  if(fPeriode) list=list.filter(b=>(b.periode||'').toLowerCase().includes(fPeriode));
  list.forEach(b=>{
    if(!b.tanggal) return;
    const d=new Date(b.tanggal);
    const k=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
    months[k]=(months[k]||0)+b.jumlah;
  });
  const sorted=Object.keys(months).sort().slice(-12);
  return {
    labels:sorted.map(k=>{ const[y,m]=k.split('-'); return new Date(y,m-1).toLocaleString('en',{month:'short',year:'2-digit'}) }),
    data:sorted.map(k=>months[k]||0),
  };
}

function renderRevenueChart(canvasId, fDari='', fSampai='', fPeriode=''){
  const {labels,data}=getMonthlyRevenue(fDari, fSampai, fPeriode);
  const ctx=document.getElementById(canvasId)?.getContext('2d');
  if(!ctx) return;
  if(window['_chart_'+canvasId]) window['_chart_'+canvasId].destroy();
  window['_chart_'+canvasId]=new Chart(ctx,{
    type:'bar',
    data:{ labels, datasets:[{label:'Revenue (Rp)',data,backgroundColor:'rgba(108,99,255,0.7)',borderColor:'rgba(108,99,255,1)',borderWidth:2,borderRadius:6}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fmt(c.raw)}}},
      scales:{y:{ticks:{color:'#7c87a0',callback:v=>fmt(v)},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#7c87a0'},grid:{display:false}}}
    }
  });
}

// ════════════════════════════════════════════════
//  STUDENTS
// ════════════════════════════════════════════════
function openStudentForm(){
  document.getElementById('form-student-title').textContent='Add New Student';
  document.getElementById('s-id').value='';
  ['s-nama','s-nick','s-kelas','s-hp','s-catatan','s-namaOrtu','s-fee','s-feemonthly'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=''; });
  document.getElementById('s-level').value='Beginner';
  const btEl=document.getElementById('s-billingtype');
  btEl.value='per_session'; btEl.disabled=false; btEl.style.opacity=''; btEl.style.cursor='';
  const btHint=document.getElementById('billing-lock-hint');
  if(btHint) btHint.style.display='none';
  onBillingTypeChange();
  renderSchedEntries([], '__new__');
  openPanel('form-student','900px');
}
function closeStudentForm(){ closePanel('form-student') }
function openEditStudent(id){
  const s=siswaList.find(x=>x.id===id); if(!s) return;
  document.getElementById('form-student-title').textContent='Edit Student';
  document.getElementById('s-id').value=s.id;
  document.getElementById('s-nama').value=s.nama||'';
  document.getElementById('s-nick').value=s.nick||'';
  document.getElementById('s-kelas').value=s.kelas||'';
  document.getElementById('s-level').value=s.level||'Beginner';
  document.getElementById('s-hp').value=s.hp||'';
  document.getElementById('s-namaOrtu').value=s.namaOrtu||'';
  document.getElementById('s-catatan').value=s.catatan||'';
  document.getElementById('s-fee').value=s.feePerSesi||'';
  document.getElementById('s-feemonthly').value=s.feeMonthly||'';
  document.getElementById('s-billingtype').value=s.billingType||'per_session';
  onBillingTypeChange();
  // Kunci billing type jika sudah ada payment — tidak boleh diubah
  const hasPayment = bayarList.some(b=>b.siswaId===id);
  const btEl = document.getElementById('s-billingtype');
  const btHint = document.getElementById('billing-lock-hint');
  if(hasPayment){
    btEl.disabled = true;
    btEl.style.opacity = '0.55';
    btEl.style.cursor = 'not-allowed';
    if(btHint) btHint.style.display = 'block';
  } else {
    btEl.disabled = false;
    btEl.style.opacity = '';
    btEl.style.cursor = '';
    if(btHint) btHint.style.display = 'none';
  }
  // Load existing schedules for this student, keyed to their actual id
  const existing = scheduleList.filter(sc=>sc.siswaId===id);
  renderSchedEntries(existing, id);
  openPanel('form-student','900px');
  document.getElementById('form-student').scrollIntoView({behavior:'smooth'});
}
function saveStudent(){
  const nama=document.getElementById('s-nama').value.trim();
  if(!nama){ infoModal('Required Field', 'Full name is required!'); return; }
  const id=document.getElementById('s-id').value;
  const billingType=document.getElementById('s-billingtype').value||'per_session';

  // Derive hari string from pending entries for backward compat
  const dayAbbr={Monday:'Mon',Tuesday:'Tue',Wednesday:'Wed',Thursday:'Thu',Friday:'Fri',Saturday:'Sat'};
  const hariUniq=[...new Set(_pendingSchedEntries.flatMap(sc=>sc.days))].map(d=>dayAbbr[d]||d).join(' & ');

  const data={
    nama, nick:document.getElementById('s-nick').value.trim(),
    kelas:document.getElementById('s-kelas').value.trim(),
    level:document.getElementById('s-level').value,
    hp:document.getElementById('s-hp').value.trim(),
    hari: hariUniq,
    namaOrtu:document.getElementById('s-namaOrtu').value.trim(),
    catatan:document.getElementById('s-catatan').value.trim(),
    feePerSesi:Number(document.getElementById('s-fee').value)||0,
    billingType,
    feeMonthly:billingType==='monthly'?Number(document.getElementById('s-feemonthly').value)||0:0,
  };

  // Tentukan finalId dulu
  const finalId = id || uid();

  if(id){
    // Cek perubahan billing type
    const existing = siswaList.find(s=>s.id===id);
    const oldBillingType = existing?.billingType || 'per_session';
    if(existing && oldBillingType !== billingType){
      const affectedPayments = bayarList.filter(b => b.siswaId === id);
      if(affectedPayments.length > 0){
        // BLOKIR: ada payment → tidak boleh ganti billing type
        const oldLabel = oldBillingType === 'monthly' ? 'Monthly' : 'Per Session';
        const newLabel = billingType === 'monthly' ? 'Monthly' : 'Per Session';
        infoModal(
          '🚫 Cannot Change Billing Type',
          `<strong>${nama}</strong> still has <strong style="color:var(--red)">${affectedPayments.length} payment record(s)</strong> with billing type <em>${oldLabel}</em>.<br><br>` +
          `To switch to <em>${newLabel}</em>:<br>` +
          `<ol style="margin:10px 0 0 18px;line-height:2">` +
          `<li>Go to <strong>Payment</strong> page</li>` +
          `<li>Delete all payment records for this student</li>` +
          `<li>Come back here and change the billing type</li>` +
          `<li>Re-enter the payments with the new billing type</li>` +
          `</ol>`
        );
        // Reset dropdown ke nilai lama agar tidak misleading
        document.getElementById('s-billingtype').value = oldBillingType;
        onBillingTypeChange();
        return;
      }
    }
  }

  _finishSaveStudent(id, finalId, data);
}

function _finishSaveStudent(id, finalId, data){
  // Update atau tambah student ke list
  if(id){
    const i=siswaList.findIndex(s=>s.id===id);
    if(i>-1) siswaList[i]={...siswaList[i],...data};
    // Sync namaSiswa di absensi, evaluasi, bayar — update variabel lokal langsung
    // (tidak pakai DB.set per koleksi agar tidak trigger 3x saveToFirestore)
    if(data.nama){
      absensiList.forEach(a=>{ if(a.siswaId===id) a.namaSiswa=data.nama; });
      evaluasiList.forEach(e=>{ if(e.siswaId===id) e.namaSiswa=data.nama; });
      bayarList.forEach(b=>{ if(b.siswaId===id) b.namaSiswa=data.nama; });
    }
  } else {
    siswaList.push({id:finalId,...data});
  }
  // Commit pending schedules ke scheduleList
  _commitSchedules(finalId);
  // Satu kali saveToFirestore() untuk semua perubahan sekaligus
  saveToFirestore();
  closeStudentForm(); renderStudents(); updateSelects(); updateUnpaidBadge(); updateMbnBadge();
  if(document.getElementById('page-payment').classList.contains('active')) renderPayment();
  if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
  showToast(`✅ Student ${id?'updated':'added'} successfully.`,'success');
}
function deleteStudent(id){
  const s = siswaList.find(x=>x.id===id);
  if(!s) return;

  // ── Hitung data terkait ──
  const attCount  = absensiList.filter(a=>a.siswaId===id).length;
  const payCount  = bayarList.filter(b=>b.siswaId===id).length;
  const evalCount = evaluasiList.filter(e=>e.siswaId===id).length;

  // ── BLOKIR jika ada payment ──
  if(payCount > 0){
    infoModal(
      '🚫 Cannot Delete Student',
      `<strong>${s.nama}</strong> has <strong style="color:var(--red)">${payCount} payment record(s)</strong> on file.<br><br>` +
      `Please delete all payment records for this student first, then try again.`
    );
    return;
  }

  // ── BLOKIR jika ada absensi ──
  if(attCount > 0){
    infoModal(
      '🚫 Cannot Delete Student',
      `<strong>${s.nama}</strong> has <strong style="color:var(--yellow)">${attCount} attendance record(s)</strong> on file.<br><br>` +
      `Please delete all attendance records for this student first, then try again.`
    );
    return;
  }

  // ── Boleh hapus: hanya ada evaluasi dan/atau jadwal (tidak ada jejak finansial/kehadiran) ──
  const extraInfo = evalCount ? `and ${evalCount} evaluation record(s) ` : '';
  dangerModal(
    '🗑️ Delete Student',
    `Are you sure you want to delete <strong>${s.nama}</strong>? ` +
    (extraInfo ? `Their evaluation records ${extraInfo}will also be removed.` : '') +
    `<br><br>This action cannot be undone.`,
    ()=>{
      siswaList    = siswaList.filter(x=>x.id!==id);
      evaluasiList = evaluasiList.filter(e=>e.siswaId!==id);
      scheduleList = scheduleList.filter(sc=>sc.siswaId!==id);
      saveToFirestore();
      renderStudents(); updateSelects(); updateUnpaidBadge(); updateMbnBadge();
      if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
      showToast(`✅ ${s.nama} deleted.`, 'success');
    },
    { okText:'Delete', cancelText:'Cancel' }
  );
}

// ── Schedule slot management ──
let _pendingSchedEntries = [];
let _pendingSchedSiswaId = null;  // tracks which student the form is for

function renderSchedEntries(entries, siswaId){
  _pendingSchedSiswaId = siswaId || '__new__';
  // Deep-clone and normalize all entries to current siswaId
  _pendingSchedEntries = entries.map(e=>({...e, siswaId: _pendingSchedSiswaId}));
  const el = document.getElementById('sched-entries');
  if(!el) return;
  if(!_pendingSchedEntries.length){
    el.innerHTML='<div style="font-size:0.75rem;color:var(--muted);padding:4px 0 8px">No schedule slots yet.</div>';
    return;
  }
  const dayAbbr = {Monday:'Mon',Tuesday:'Tue',Wednesday:'Wed',Thursday:'Thu',Friday:'Fri',Saturday:'Sat'};
  el.innerHTML = _pendingSchedEntries.map((sc,i)=>`
    <div class="sched-entry">
      <div class="sched-entry-info">
        <div class="sched-entry-days">${sc.days.map(d=>dayAbbr[d]||d).join(' & ')}</div>
        <div class="sched-entry-time">${sc.jam||'—'} · ${sc.durasi||60} min</div>
      </div>
      <button class="btn sm" style="color:var(--red);border-color:var(--red)" onclick="removeSchedEntry(${i})">✕</button>
    </div>`).join('');
}

function toggleDay(el){
  el.classList.toggle('selected');
}

function addScheduleSlot(){
  const selectedDays = [...document.querySelectorAll('#sched-day-picker .day-btn.selected')].map(b=>b.dataset.day);
  if(!selectedDays.length){ showToast('Select at least one day','warning'); return; }
  const jam = document.getElementById('sched-jam').value;
  const durasi = parseInt(document.getElementById('sched-durasi').value)||60;

  // Check for duplicate day conflict within pending entries
  const existingDays = _pendingSchedEntries.flatMap(e=>e.days);
  const conflicts = selectedDays.filter(d=>existingDays.includes(d));
  if(conflicts.length){
    showToast(`${conflicts.map(d=>d.slice(0,3)).join(', ')} already assigned to another slot`,'warning');
    return;
  }

  // Always use _pendingSchedSiswaId — never read from DOM here
  const newSlot = { id:uid(), siswaId: _pendingSchedSiswaId, days:selectedDays, jam, durasi };
  _pendingSchedEntries.push(newSlot);

  // Reset day picker
  document.querySelectorAll('#sched-day-picker .day-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('sched-jam').value='';
  renderSchedEntries(_pendingSchedEntries, _pendingSchedSiswaId);
  showToast('Schedule slot added','success');
}

function removeSchedEntry(idx){
  _pendingSchedEntries.splice(idx,1);
  renderSchedEntries(_pendingSchedEntries, _pendingSchedSiswaId);
}

function _commitSchedules(finalSiswaId){
  // Remove all existing schedules for this student, replace with pending entries
  scheduleList = scheduleList.filter(sc=>sc.siswaId !== finalSiswaId && sc.siswaId !== '__new__');
  const committed = _pendingSchedEntries.map(sc=>({...sc, siswaId: finalSiswaId}));
  scheduleList.push(...committed);
  _pendingSchedEntries = [];
  _pendingSchedSiswaId = null;
}

// ── Get students scheduled for a given day name ──
function getStudentsForDay(dayName){
  const slots = scheduleList.filter(sc=>sc.days.includes(dayName));
  return slots.map(sc=>{
    const s = siswaList.find(x=>x.id===sc.siswaId);
    return s ? { ...s, schedJam:sc.jam, schedDurasi:sc.durasi } : null;
  }).filter(Boolean);
}

// ── Render weekly schedule grid on dashboard ──
function renderWeekGrid(){
  const grid = document.getElementById('dash-week-grid');
  const label = document.getElementById('week-range-label');
  if(!grid) return;

  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now); monday.setDate(now.getDate()-(dow===0?6:dow-1));
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const dayShort = ['Mon','Tue','Wed','Thu','Fri'];

  // Week range label
  const fri = new Date(monday); fri.setDate(monday.getDate()+4);
  if(label) label.textContent = `${monday.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – ${fri.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}`;

  // Today's day name
  const todayName = now.toLocaleDateString('en-US',{weekday:'long'});

  // Check if any student has Sat schedule → show 6 cols
  const hasSat = scheduleList.some(sc=>sc.days.includes('Saturday'));
  if(hasSat){ days.push('Saturday'); dayShort.push('Sat'); grid.style.gridTemplateColumns='repeat(6,1fr)'; }
  else grid.style.gridTemplateColumns='repeat(5,1fr)';

  grid.innerHTML = days.map((day,i)=>{
    const isToday = day===todayName;
    const students = getStudentsForDay(day);
    const slots = students.length
      ? students.map(s=>`
          <div class="week-slot" onclick="openStudentProfile('${s.id}')" title="${s.nama}${s.schedJam?' · '+s.schedJam:''}">
            <div class="week-slot-name">${s.nick||s.nama.split(' ')[0]}</div>
            ${s.schedJam?`<div class="week-slot-time">${s.schedJam}</div>`:''}
          </div>`).join('')
      : `<div class="week-empty">—</div>`;
    return `
      <div class="week-col">
        <div class="week-col-hd${isToday?' today-col':''}">${dayShort[i]}${isToday?' ★':''}</div>
        ${slots}
      </div>`;
  }).join('');
}

// ── Billing type UI toggle ──
function onBillingTypeChange(){
  const bt=document.getElementById('s-billingtype')?.value||'per_session';
  const grpM=document.getElementById('grp-monthly-fee');
  const lbl=document.getElementById('lbl-s-fee');
  if(bt==='monthly'){
    if(grpM) grpM.style.display='block';
    if(lbl) lbl.textContent='Fee / Session (Rp) — optional';
  } else {
    if(grpM) grpM.style.display='none';
    if(lbl) lbl.textContent='Fee / Session (Rp)';
  }
}
function renderStudents(){
  const tbody=document.getElementById('tbody-students');
  const empty=document.getElementById('empty-students');
  const stats=document.getElementById('student-stats');
  tbody.innerHTML='';
  if(!siswaList.length){ empty.style.display='block'; stats.innerHTML=''; return; }
  empty.style.display='none';
  const levels={};
  siswaList.forEach(s=>levels[s.level]=(levels[s.level]||0)+1);
  stats.innerHTML=`
    <div class="stat-card s-purple"><div class="ico">👤</div><div class="val">${siswaList.length}</div><div class="lbl">Total Students</div></div>
    ${Object.entries(levels).map(([l,n])=>`<div class="stat-card s-blue"><div class="val">${n}</div><div class="lbl">${l}</div></div>`).join('')}
  `;
  siswaList.forEach((s,i)=>{
    const isMonthly = s.billingType==='monthly';
    const feeDisplay = isMonthly
      ? `<span class="chip chip-purple" style="font-size:0.75rem">📅 ${fmt(s.feeMonthly||0)}<span style="font-weight:400">/bln</span></span>`
      : (s.feePerSesi ? `<span style="font-size:0.83rem">${fmt(s.feePerSesi)}<span style="color:var(--muted)">/session</span></span>` : '<span style="color:var(--muted);font-size:0.8rem">-</span>');
    const billingChip = isMonthly
      ? `<span class="chip chip-purple" style="font-size:0.72rem">📅 Monthly</span>`
      : `<span class="chip chip-muted" style="font-size:0.72rem">💳 Per Session</span>`;
    tbody.innerHTML+=`<tr>
      <td style="color:var(--muted)">${i+1}</td>
      <td><strong>${s.nama}</strong></td>
      <td>${s.nick?`<span class="chip chip-yellow">${s.nick}</span>`:'-'}</td>
      <td style="color:var(--muted);font-size:0.83rem">${s.kelas||'-'}</td>
      <td>${levelChip(s.level)}</td>
      <td style="font-size:0.83rem;color:var(--muted)">${
        (()=>{
          const dayAbbr={Monday:'Mon',Tuesday:'Tue',Wednesday:'Wed',Thursday:'Thu',Friday:'Fri',Saturday:'Sat'};
          const slots=scheduleList.filter(sc=>sc.siswaId===s.id);
          if(!slots.length) return s.hari||'—';
          return slots.map(sc=>sc.days.map(d=>dayAbbr[d]||d).join('&')+' '+(sc.jam||'')).join(', ');
        })()
      }</td>
      <td>${billingChip}</td>
      <td>${feeDisplay}</td>
      <td style="font-size:0.83rem">${s.namaOrtu||'-'}</td>
      <td style="font-size:0.83rem;color:var(--muted)">${s.hp||'-'}</td>
      <td class="nowrap">
        <button class="btn sm" onclick="openEditStudent('${s.id}')" style="margin-right:4px">✏️</button>
        <button class="btn danger sm" onclick="deleteStudent('${s.id}')">🗑️</button>
      </td>
    </tr>`;
  });
}

// ════════════════════════════════════════════════
