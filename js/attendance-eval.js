//  ATTENDANCE
// ════════════════════════════════════════════════
function loadAbsensi(){
  const d=document.getElementById('absen-date').value; if(!d) return;
  const dt=new Date(d), day=dt.getDay();
  const mon=new Date(dt); mon.setDate(dt.getDate()-(day===0?6:day-1));
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  document.getElementById('week-label').textContent=
    `Week: ${mon.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – ${sun.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}`;

  // Schedule hint
  const dayName = dt.toLocaleDateString('en-US',{weekday:'long'});
  const scheduledToday = getStudentsForDay(dayName);
  const hintEl = document.getElementById('sched-hint');
  const hintTxt = document.getElementById('sched-hint-text');
  if(hintEl && scheduledToday.length){
    hintEl.style.display='block';
    hintTxt.textContent = `${scheduledToday.length} student${scheduledToday.length>1?'s':''} (${scheduledToday.map(s=>s.nick||s.nama.split(' ')[0]).join(', ')})`;
  } else if(hintEl){
    hintEl.style.display='none';
  }

  // Jika mode Single aktif, sync tanggal ke form single lalu stop
  if(_attMode === 'single'){
    const singleTgl = document.getElementById('single-att-tanggal');
    if(singleTgl && !singleTgl.value) singleTgl.value = d;
    return;
  }

  const grid=document.getElementById('absen-grid');
  if(!siswaList.length){ grid.innerHTML='<div class="empty"><div class="ei">📋</div><p>Add students first.</p></div>'; return; }
  const existing={};
  absensiList.filter(a=>a.tanggal===d).forEach(a=>existing[a.siswaId]=a);

  // Sort: scheduled students for this day first
  const scheduledIds = new Set(scheduledToday.map(s=>s.id));
  const sorted = [...siswaList].sort((a,b)=>{
    const aS = scheduledIds.has(a.id)?0:1;
    const bS = scheduledIds.has(b.id)?0:1;
    return aS-bS || a.nama.localeCompare(b.nama);
  });

  grid.innerHTML=sorted.map(s=>{
    const isScheduled = scheduledIds.has(s.id);
    const sc = scheduleList.find(x=>x.siswaId===s.id && x.days.includes(dayName));
    return `
    <div class="absen-card" ${isScheduled?'':'style="opacity:0.65"'}>
      <div class="a-name">👤 ${s.nama}${isScheduled?` <span style="font-size:0.65rem;background:rgba(108,99,255,0.15);color:var(--accent);border-radius:4px;padding:1px 5px;font-weight:700">📅 ${sc?.jam||'Scheduled'}</span>`:''}</div>
      ${s.nick?`<div class="a-nick">${s.nick}</div>`:''}
      <select id="att-${s.id}">
        <option value="Hadir" ${existing[s.id]?.status==='Hadir'?'selected':''}>✅ Present</option>
        <option value="Izin"  ${existing[s.id]?.status==='Izin'?'selected':''}>📝 Excused</option>
        <option value="Alpha" ${existing[s.id]?.status==='Alpha'?'selected':''}>❌ Absent</option>
      </select>
      <input type="text" placeholder="Note (optional)" id="att-ket-${s.id}" value="${existing[s.id]?.keterangan||''}">
    </div>`;
  }).join('');
}
function saveAbsensi(){
  const d=document.getElementById('absen-date').value;
  if(!d){ showToast('Select a date first!','warn'); return; }
  if(!siswaList.length){ showToast('No students found!','warn'); return; }
  // ── Simpan snapshot record lama sebelum dihapus ──
  // ID lama HARUS dipertahankan agar sesiIds di payment tidak putus
  const oldRecords={};
  absensiList.filter(a=>a.tanggal===d).forEach(a=>{ oldRecords[a.siswaId]=a; });
  absensiList=absensiList.filter(a=>a.tanggal!==d);
  siswaList.forEach(s=>{
    const old=oldRecords[s.id];
    absensiList.push({
      id: old ? old.id : uid(),   // ← PAKAI ID LAMA jika sudah pernah ada
      tanggal:d,siswaId:s.id,namaSiswa:s.nama,
      status:document.getElementById(`att-${s.id}`)?.value||'Hadir',
      keterangan:document.getElementById(`att-ket-${s.id}`)?.value||'',
    });
  });
  DB.set('absensi',absensiList); renderAttendance(); showToast('✅ Attendance saved!','success');
}
// ════════════════════════════════════════════════
//  SINGLE STUDENT ATTENDANCE
// ════════════════════════════════════════════════
let _attMode = 'all';

function setAttMode(mode){
  _attMode = mode;
  const isAll = mode === 'all';
  document.getElementById('att-mode-all').classList.toggle('primary', isAll);
  document.getElementById('att-mode-single').classList.toggle('primary', !isAll);
  document.getElementById('single-att-panel').style.display = isAll ? 'none' : 'block';
  document.getElementById('all-att-grid-card').style.display = isAll ? 'block' : 'none';
  // Sembunyikan tombol Save Attendance (All) saat mode Single aktif
  const saveBtn = document.querySelector('#page-attendance .sec-hd .btn.primary');
  if(saveBtn) saveBtn.style.display = isAll ? '' : 'none';

  if(!isAll){
    // Isi dropdown siswa
    const sel = document.getElementById('single-att-siswa');
    const opts = siswaList.map(s=>`<option value="${s.id}">${s.nama}${s.nick?' ('+s.nick+')':''}</option>`).join('');
    sel.innerHTML = '<option value="">-- Pilih Siswa --</option>' + opts;
    // Default tanggal = hari ini
    if(!document.getElementById('single-att-tanggal').value){
      document.getElementById('single-att-tanggal').value = new Date().toISOString().slice(0,10);
    }
    onSingleAttSiswaChange();
  }
}

function onSingleAttSiswaChange(){
  const siswaId = document.getElementById('single-att-siswa').value;
  const tanggal = document.getElementById('single-att-tanggal').value;
  const infoEl  = document.getElementById('single-att-info');
  if(!siswaId || !tanggal){ infoEl.textContent=''; return; }

  const existing = absensiList.find(a=>a.siswaId===siswaId && a.tanggal===tanggal);
  if(existing){
    infoEl.innerHTML = `<span style="color:var(--yellow)">⚠️ Sudah ada record untuk tanggal ini: <strong>${existing.status}</strong>${existing.keterangan?' · '+existing.keterangan:''}. Akan ditimpa jika disimpan.</span>`;
    document.getElementById('single-att-status').value = existing.status;
    document.getElementById('single-att-ket').value    = existing.keterangan||'';
  } else {
    const isFuture = tanggal > new Date().toISOString().slice(0,10);
    infoEl.innerHTML = isFuture
      ? `<span style="color:var(--teal)">📅 Tanggal mendatang — cocok untuk catat sesi yang sudah dibayar di muka.</span>`
      : '';
  }
}

function saveSingleAtt(){
  const siswaId = document.getElementById('single-att-siswa').value;
  const tanggal = document.getElementById('single-att-tanggal').value;
  const status  = document.getElementById('single-att-status').value;
  const ket     = document.getElementById('single-att-ket').value.trim();

  if(!siswaId){ showToast('Pilih siswa terlebih dahulu!','warn'); return; }
  if(!tanggal){ showToast('Pilih tanggal!','warn'); return; }

  const siswa = siswaList.find(s=>s.id===siswaId);

  // Cek apakah sudah ada record untuk siswa+tanggal ini
  const existingIdx = absensiList.findIndex(a=>a.siswaId===siswaId && a.tanggal===tanggal);

  // Cek apakah record lama ini sudah terhubung ke payment
  if(existingIdx > -1 && status !== absensiList[existingIdx].status){
    const existingId = absensiList[existingIdx].id;
    const linkedPayment = bayarList.find(b=>b.sesiIds && b.sesiIds.includes(existingId));
    if(linkedPayment && absensiList[existingIdx].status === 'Hadir'){
      showToast(`⚠️ Status tidak bisa diubah — sesi ini sudah terhubung ke payment (${linkedPayment.namaSiswa}).`,'warn');
      return;
    }
  }

  if(existingIdx > -1){
    // Update record yang sudah ada, pertahankan ID
    absensiList[existingIdx] = {
      ...absensiList[existingIdx],
      status, keterangan: ket, namaSiswa: siswa?.nama||'-',
    };
  } else {
    absensiList.push({
      id: uid(),
      tanggal, siswaId, namaSiswa: siswa?.nama||'-',
      status, keterangan: ket,
    });
  }

  DB.set('absensi', absensiList);
  renderAttendance();
  updateUnpaidBadge(); updateMbnBadge();
  if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();

  const isFuture = tanggal > new Date().toISOString().slice(0,10);
  showToast(
    `✅ Attendance ${existingIdx>-1?'updated':'saved'} — ${siswa?.nama}, ${tglFmt(tanggal)}, ${status}` +
    (isFuture ? ' 📅 (future date)' : ''),
    'success'
  );

  // Reset form untuk input berikutnya
  document.getElementById('single-att-siswa').value  = '';
  document.getElementById('single-att-ket').value    = '';
  document.getElementById('single-att-status').value = 'Hadir';
  document.getElementById('single-att-tanggal').value = new Date().toISOString().slice(0,10);
  document.getElementById('single-att-info').textContent = '';
}

function setCurrentMonthAttFilter(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const lastDay = new Date(y, now.getMonth()+1, 0).getDate().toString().padStart(2,'0');
  document.getElementById('att-f-dari').value   = `${y}-${m}-01`;
  document.getElementById('att-f-sampai').value = `${y}-${m}-${lastDay}`;
  document.getElementById('att-f-nama').value   = '';
  const st = document.getElementById('att-f-status'); if(st) st.value='';
  renderAttendance();
}

function clearAttFilter(){
  ['att-f-dari','att-f-sampai','att-f-nama'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const st=document.getElementById('att-f-status'); if(st) st.value='';
  renderAttendance();
}

function renderAttendance(){
  const tbody  = document.getElementById('tbody-attendance');
  const empty  = document.getElementById('empty-attendance');
  const sumEl  = document.getElementById('att-summary');
  tbody.innerHTML='';

  const fDari   = document.getElementById('att-f-dari')?.value   || '';
  const fSampai = document.getElementById('att-f-sampai')?.value || '';
  const fNama   = (document.getElementById('att-f-nama')?.value  || '').trim().toLowerCase();
  const fStatus = document.getElementById('att-f-status')?.value || '';

  let list = [...absensiList].sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(fDari)   list = list.filter(a=>a.tanggal>=fDari);
  if(fSampai) list = list.filter(a=>a.tanggal<=fSampai);
  if(fNama)   list = list.filter(a=>a.namaSiswa.toLowerCase().includes(fNama));
  if(fStatus) list = list.filter(a=>a.status===fStatus);

  // Summary
  if(sumEl){
    const present = list.filter(a=>a.status==='Hadir').length;
    const excused = list.filter(a=>a.status==='Izin').length;
    const absent  = list.filter(a=>a.status==='Alpha').length;
    const total   = list.length;
    sumEl.innerHTML = total ? `
      <span class="chip chip-muted">${total} records</span>
      <span class="chip chip-green">✅ Present: ${present}</span>
      <span class="chip chip-yellow">📝 Excused: ${excused}</span>
      <span class="chip chip-red">❌ Absent: ${absent}</span>
      ${total>0?`<span class="chip chip-blue">📊 Rate: ${Math.round((present/total)*100)}%</span>`:''}
    ` : '';
  }

  if(!absensiList.length){ empty.style.display='block'; return; }
  empty.style.display = list.length ? 'none' : 'block';

  list.forEach(a=>{
    const c=a.status==='Hadir'?'chip-green':a.status==='Izin'?'chip-yellow':'chip-red';
    const l=a.status==='Hadir'?'Present':a.status==='Izin'?'Excused':'Absent';
    tbody.innerHTML+=`<tr>
      <td>${tglFmt(a.tanggal)}</td>
      <td><strong>${a.namaSiswa}</strong></td>
      <td>${chip(l,c)}</td>
      <td style="color:var(--muted);font-size:0.83rem">${a.keterangan||'-'}</td>
      <td class="nowrap">
        <button class="btn sm icon-only" title="Edit" onclick="editAttendance('${a.id}')" style="margin-right:4px">✏️</button>
        <button class="btn danger sm icon-only" title="Delete" onclick="deleteAttendance('${a.id}')">🗑️</button>
      </td>
    </tr>`;
  });
}

function editAttendance(id){
  const a = absensiList.find(x=>x.id===id); if(!a) return;
  document.getElementById('att-edit-id').value       = a.id;
  document.getElementById('att-edit-tanggal').value  = a.tanggal;
  document.getElementById('att-edit-nama').textContent = a.namaSiswa;
  document.getElementById('att-edit-status').value   = a.status;
  document.getElementById('att-edit-note').value     = a.keterangan||'';
  openModal('modal-att-edit');
}

function saveAttEdit(){
  const id = document.getElementById('att-edit-id').value;
  const idx = absensiList.findIndex(a=>a.id===id);
  if(idx===-1) return;
  
  const oldStatus = absensiList[idx].status;
  const newStatus = document.getElementById('att-edit-status').value;
  
  // ✅ VALIDATION: Check if payment exists for this session
  if(oldStatus === 'Hadir' && newStatus !== 'Hadir') {
    const paymentWithThisSesi = bayarList.find(b => 
      b.sesiIds && b.sesiIds.includes(id)
    );
    
    if(paymentWithThisSesi) {
      dangerModal(
        '⚠️ Payment Record Exists',
        `<div style="text-align: left; line-height: 1.8">
          <p>❌ Cannot change status.</p>
          <p>Payment record exists for this session:</p>
          <div style="background: var(--bg3); padding: 12px; border-radius: 8px; margin: 12px 0; border-left: 4px solid var(--yellow)">
            <div>👤 <strong>${paymentWithThisSesi.namaSiswa || 'N/A'}</strong></div>
            <div>📅 ${tglFmt(paymentWithThisSesi.tanggal)}</div>
            <div>💰 ${fmt(paymentWithThisSesi.jumlah)} (${paymentWithThisSesi.status})</div>
          </div>
          <p>💡 Delete the payment first, then try again.</p>
        </div>`,
        null,
        { okText: 'OK', cancelText: null }
      );
      return;  // ← BLOCK
    }
  }
  
  // ✅ SAFE: No payment, can change
  absensiList[idx] = {
    ...absensiList[idx],
    status:     newStatus,
    keterangan: document.getElementById('att-edit-note').value.trim(),
  };
  
  DB.set('absensi', absensiList);
  closeModal('modal-att-edit');
  renderAttendance();
  renderPayment();
  updateUnpaidBadge(); updateMbnBadge();
  if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
  showToast(`✅ Status changed to ${newStatus}`, 'success');
}

function deleteAttendance(id){
  // ✅ VALIDATION: Check apakah attendance ini ada di pembayaran
  const paymentWithThisAttendance = bayarList.find(b => 
    b.sesiIds && b.sesiIds.includes(id)
  );
  
  if(paymentWithThisAttendance){
    // ❌ BLOCK: Ada pembayaran yang reference attendance ini
    dangerModal(
      '❌ Cannot Delete',
      `This attendance has an associated payment:<br><br>` +
      `<strong>Student:</strong> ${paymentWithThisAttendance.namaSiswa}<br>` +
      `<strong>Status:</strong> ${paymentWithThisAttendance.status}<br>` +
      `<strong>Amount:</strong> ${fmt(paymentWithThisAttendance.jumlah)}<br><br>` +
      `Please delete the payment record first, then you can delete this attendance.`,
      null,
      { okText: 'Close', cancelText: null }
    );
    return;
  }
  
  // ✅ ALLOWED: Tidak ada pembayaran, boleh delete
  dangerModal(
    '🗑️ Delete Attendance?',
    'Are you sure you want to delete this attendance record? This action cannot be undone.',
    () => {
      absensiList = absensiList.filter(a=>a.id!==id);
      DB.set('absensi', absensiList);
      renderAttendance();
      updateUnpaidBadge(); updateMbnBadge();
      if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
      showToast('✅ Attendance deleted', 'success');
    },
    { okText: 'Delete', cancelText: 'Cancel' }
  );
}

// ════════════════════════════════════════════════
//  LESSONS
// ════════════════════════════════════════════════
function resetLessonForm(){
  document.getElementById('form-lesson-title').textContent='Add Lesson';
  document.getElementById('m-id').value='';
  document.getElementById('m-tanggal').value=new Date().toISOString().slice(0,10);
  document.getElementById('m-status').value='Rencana';
  ['m-topik','m-deskripsi','m-sumber'].forEach(i=>document.getElementById(i).value='');
}
function openEditLesson(id){
  const m=materiList.find(x=>x.id===id); if(!m) return;
  document.getElementById('form-lesson-title').textContent='Edit Lesson';
  document.getElementById('m-id').value=m.id;
  document.getElementById('m-tanggal').value=m.tanggal||'';
  document.getElementById('m-status').value=m.status||'Rencana';
  document.getElementById('m-topik').value=m.topik||'';
  document.getElementById('m-deskripsi').value=m.deskripsi||'';
  document.getElementById('m-sumber').value=m.sumber||'';
  document.getElementById('m-target').value=m.target||'Semua';
  openPanel('form-lesson','700px');
  document.getElementById('form-lesson').scrollIntoView({behavior:'smooth'});
}
function saveLesson(){
  const topik=document.getElementById('m-topik').value.trim();
  if(!topik){ infoModal('Required Field', 'Topic is required!'); return; }
  const id=document.getElementById('m-id').value;
  const data={
    tanggal:document.getElementById('m-tanggal').value,
    status:document.getElementById('m-status').value, topik,
    deskripsi:document.getElementById('m-deskripsi').value.trim(),
    sumber:document.getElementById('m-sumber').value.trim(),
    target:document.getElementById('m-target').value,
  };
  if(id){ const i=materiList.findIndex(m=>m.id===id); if(i>-1) materiList[i]={...materiList[i],...data}; }
  else materiList.push({id:uid(),...data});
  DB.set('materi',materiList);
  document.getElementById('m-id').value='';
  ['m-topik','m-deskripsi','m-sumber'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('form-lesson-title').textContent='Add Lesson';
  closePanel('form-lesson'); renderLessons();
}
function deleteLesson(id){
  const m = materiList.find(x=>x.id===id);
  dangerModal('🗑️ Delete Lesson', `Delete lesson <strong>${m?.topik||'this lesson'}</strong>?`,
    ()=>{ materiList=materiList.filter(m=>m.id!==id); DB.set('materi',materiList); renderLessons(); },
    { okText:'Delete', cancelText:'Keep' }
  );
}
function renderLessons(){
  const rencana=materiList.filter(m=>m.status==='Rencana').sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
  const selesai=materiList.filter(m=>m.status==='Selesai').sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const makeCard=(m)=>`
    <div class="lesson-card">
      <div class="lesson-dot ${m.status==='Rencana'?'planned':'done'}"></div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:0.92rem">${m.topik}</div>
        <div style="font-size:0.77rem;color:var(--muted);margin-top:3px">${tglFmt(m.tanggal)} · ${m.target==='Semua'?'All Students':m.target||'All'}</div>
        ${m.deskripsi?`<div style="font-size:0.85rem;color:var(--muted);margin-top:8px">${m.deskripsi}</div>`:''}
        ${m.sumber?`<div style="font-size:0.77rem;color:var(--accent);margin-top:5px">📎 ${m.sumber}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn sm icon-only" title="Print" onclick="showLessonPrint('${m.id}')">🖨️</button>
        <button class="btn sm icon-only" title="Edit" onclick="openEditLesson('${m.id}')">✏️</button>
        <button class="btn danger sm icon-only" title="Delete" onclick="deleteLesson('${m.id}')">🗑️</button>
      </div>
    </div>`;
  document.getElementById('lesson-planned').innerHTML=rencana.length?rencana.map(makeCard).join(''):'<div style="color:var(--muted);font-size:0.85rem;padding:10px 0">No planned lessons.</div>';
  document.getElementById('lesson-done').innerHTML=selesai.length?selesai.map(makeCard).join(''):'<div style="color:var(--muted);font-size:0.85rem;padding:10px 0">No completed lessons.</div>';
  document.getElementById('empty-lessons').style.display=materiList.length?'none':'block';
}

// ════════════════════════════════════════════════
//  EVALUATION
// ════════════════════════════════════════════════
function saveEval(){
  const siswaId=document.getElementById('e-siswa').value;
  if(!siswaId){ infoModal('Required Field', 'Please select a student first!'); return; }
  const s=siswaList.find(x=>x.id===siswaId);
  const id=document.getElementById('e-id').value;
  const data={
    tanggal:document.getElementById('e-tanggal').value,
    siswaId, namaSiswa:s?.nama||'-',
    nilai:document.getElementById('e-nilai').value,
    rating:document.getElementById('e-rating').value,
    progress:document.getElementById('e-progress').value.trim(),
    catatan:document.getElementById('e-catatan').value.trim(),
  };
  if(id){ const i=evaluasiList.findIndex(e=>e.id===id); if(i>-1) evaluasiList[i]={...evaluasiList[i],...data}; }
  else evaluasiList.push({id:uid(),...data});
  DB.set('evaluasi',evaluasiList);
  document.getElementById('e-id').value='';
  ['e-nilai','e-progress','e-catatan'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('form-eval-title').textContent='Add Evaluation';
  closeEvalForm(); renderEval();
}
function deleteEval(id){
  dangerModal('🗑️ Delete Evaluation', 'Are you sure you want to delete this evaluation record?',
    ()=>{ evaluasiList=evaluasiList.filter(e=>e.id!==id); DB.set('evaluasi',evaluasiList); renderEval(); },
    { okText:'Delete', cancelText:'Keep' }
  );
}
function closeEvalForm(){
  document.getElementById('eval-form-card').style.display='none';
}
function clearEvalFilter(){
  ['eval-filter-siswa','eval-filter-dari','eval-filter-sampai'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  renderEval();
}
function renderEval(){
  const list   = document.getElementById('eval-list');
  const empty  = document.getElementById('empty-eval');
  const fSiswa = document.getElementById('eval-filter-siswa')?.value||'';
  const fDari  = document.getElementById('eval-filter-dari')?.value||'';
  const fSampai= document.getElementById('eval-filter-sampai')?.value||'';

  let sorted=[...evaluasiList].sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(fSiswa)  sorted=sorted.filter(e=>e.siswaId===fSiswa);
  if(fDari)   sorted=sorted.filter(e=>e.tanggal>=fDari);
  if(fSampai) sorted=sorted.filter(e=>e.tanggal<=fSampai);

  if(!sorted.length){ list.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  const ratingLabel=['','Passive','Below Avg','Average','Good','Excellent'];
  list.innerHTML = sorted.map(e=>{
    const n=Number(e.nilai||0);
    const bg=n>=80?'var(--green)':n>=60?'var(--yellow)':'var(--red)';
    const starRow='⭐'.repeat(Number(e.rating)||0);
    return `
    <div class="eval-card">
      <div class="eval-score-badge" style="background:${bg}">${e.nilai||'—'}</div>
      <div class="eval-meta">
        <div class="eval-student">${e.namaSiswa}</div>
        <div class="eval-date-row">
          <span>${tglFmt(e.tanggal)}</span>
          ${e.rating?`<span style="font-size:0.9rem">${starRow}</span><span style="color:var(--accent);font-weight:700">${ratingLabel[Number(e.rating)]||''}</span>`:''}
        </div>
        ${e.progress?`<div class="eval-text"><strong>Progress:</strong> ${e.progress}</div>`:''}
        ${e.catatan?`<div class="eval-text"><strong>Notes:</strong> ${e.catatan}</div>`:''}
      </div>
      <div class="eval-actions">
        <button class="btn sm" title="Print" onclick="showEvalPrint('${e.id}')">🖨️</button>
        <button class="btn sm" title="Edit" onclick="openEditEval('${e.id}')">✏️</button>
        <button class="btn danger sm" title="Delete" onclick="deleteEval('${e.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function resetEvalForm(){
  document.getElementById('form-eval-title').textContent='Add Evaluation';
  document.getElementById('e-id').value='';
  document.getElementById('e-tanggal').value=new Date().toISOString().split('T')[0];
  document.getElementById('e-siswa').value='';
  document.getElementById('e-nilai').value='';
  document.getElementById('e-rating').value='5';
  document.getElementById('e-progress').value='';
  document.getElementById('e-catatan').value='';
  document.getElementById('eval-form-card').style.display='block';
  document.getElementById('eval-form-card').scrollIntoView({behavior:'smooth',block:'start'});
}

function openEditEval(id){
  const e=evaluasiList.find(x=>x.id===id); if(!e) return;
  switchEvalTab('single');
  document.getElementById('form-eval-title').textContent='Edit Evaluation';
  document.getElementById('e-id').value=e.id;
  document.getElementById('e-tanggal').value=e.tanggal||'';
  document.getElementById('e-siswa').value=e.siswaId||'';
  document.getElementById('e-nilai').value=e.nilai||'';
  document.getElementById('e-rating').value=e.rating||'5';
  document.getElementById('e-progress').value=e.progress||'';
  document.getElementById('e-catatan').value=e.catatan||'';
  document.getElementById('eval-form-card').style.display='block';
  document.getElementById('eval-form-card').scrollIntoView({behavior:'smooth',block:'start'});
}

// ════════════════════════════════════════════════
