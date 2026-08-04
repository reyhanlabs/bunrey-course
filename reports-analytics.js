//  REPORTS
// ════════════════════════════════════════════════
const _reportTexts={};
function renderReports(){
  const fS=document.getElementById('r-siswa').value;
  const fP=(document.getElementById('r-periode').value||'').trim().toLowerCase();
  const cont=document.getElementById('report-list');
  const empty=document.getElementById('empty-reports');
  const targets=fS?siswaList.filter(s=>s.id===fS):siswaList;
  let html='', any=false;
  targets.forEach(siswa=>{
    let evals=evaluasiList.filter(e=>e.siswaId===siswa.id);
    let att=absensiList.filter(a=>a.siswaId===siswa.id);
    let pays=bayarList.filter(b=>b.siswaId===siswa.id);
    if(fP) pays=pays.filter(b=>(b.periode||'').toLowerCase().includes(fP));
    if(!evals.length&&!att.length) return;
    any=true;
    const latEval=evals.sort((a,b)=>b.tanggal.localeCompare(a.tanggal))[0];
    const avgScore=evals.length?Math.round(evals.reduce((s,e)=>s+Number(e.nilai||0),0)/evals.length):null;
    const present=att.filter(a=>a.status==='Hadir').length;
    const attPct=att.length?Math.round((present/att.length)*100):null;
    const latPay=pays.sort((a,b)=>b.tanggal.localeCompare(a.tanggal))[0];
    const sc=avgScore>=80?'var(--green)':avgScore>=60?'var(--yellow)':'var(--red)';
    const key='rpt_'+siswa.id;
    const now=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    let txt=`🎓 *LITTLELUME ENGLISH COURSE*\n📋 *Student Progress Report*\n📅 ${now}\n${'━'.repeat(28)}\n\n`;
    txt+=`👤 *Student:* ${siswa.nama}${siswa.nick?' ('+siswa.nick+')':''}\n`;
    if(siswa.kelas) txt+=`🏫 *School:* ${siswa.kelas}\n`;
    txt+=`📊 *Level:* ${siswa.level}\n\n`;
    if(avgScore!==null) txt+=`✏️ *Average Score:* ${avgScore}/100\n`;
    if(attPct!==null) txt+=`📋 *Attendance:* ${attPct}% (${present}/${att.length})\n`;
    if(latEval){ txt+=`\n⭐ *Latest Eval (${tglFmt(latEval.tanggal)})*\nScore: ${latEval.nilai}/100  Participation: ${stars(latEval.rating)}\n`; if(latEval.progress) txt+=`Progress: ${latEval.progress}\n`; if(latEval.catatan) txt+=`Notes: ${latEval.catatan}\n`; }
    if(latPay){ txt+=`\n💰 *Payment — ${latPay.periode||'-'}*\nInvoice: ${fmt(latPay.tagihan)}\nPaid: ${fmt(latPay.jumlah)}\nStatus: ${latPay.status}\n`; }
    txt+=`\n${'━'.repeat(28)}\nThank you for your trust & support! 🌟\n— LittleLume English Course 🎓`;
    _reportTexts[key]=txt;
    html+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,var(--accent),var(--accent2));padding:20px 24px">
        <div style="font-family:'Fredoka One',sans-serif;font-size:1.3rem;font-weight:800;color:#fff">👤 ${siswa.nama}${siswa.nick?` <span style="opacity:0.75;font-size:1rem">(${siswa.nick})</span>`:''}</div>
        <div style="font-size:0.82rem;color:rgba(255,255,255,0.8);margin-top:3px">${siswa.kelas||''} · ${siswa.level} · ${siswa.hari||''}</div>
      </div>
      <div style="padding:20px 24px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:18px">
          ${avgScore!==null?`<div class="stat-card"><div class="val" style="color:${sc}">${avgScore}</div><div class="lbl">Avg Score</div></div>`:''}
          ${attPct!==null?`<div class="stat-card"><div class="val" style="color:var(--blue)">${attPct}%</div><div class="lbl">Attendance</div></div>`:''}
          ${evals.length?`<div class="stat-card"><div class="val" style="color:var(--purple)">${evals.length}</div><div class="lbl">Evaluations</div></div>`:''}
          ${latEval?`<div class="stat-card"><div class="val" style="font-size:1.1rem">${stars(latEval.rating)}</div><div class="lbl">Participation</div></div>`:''}
        </div>
        ${attPct!==null?`<div style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Attendance Rate</div><div class="pbar-wrap" style="margin-bottom:16px"><div class="pbar-fill" style="width:${attPct}%"></div></div>`:''}
        ${latEval?`<div style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px">⭐ Latest Evaluation (${tglFmt(latEval.tanggal)})</div><div style="background:var(--bg3);border-radius:10px;padding:14px;font-size:0.87rem;margin-bottom:16px">${latEval.progress?`<div><strong>Progress:</strong> ${latEval.progress}</div>`:''} ${latEval.catatan?`<div style="margin-top:5px"><strong>Notes:</strong> ${latEval.catatan}</div>`:`<span style="color:var(--muted)">No details.</span>`}</div>`:''}
        ${latPay?`<div style="background:var(--bg3);border-radius:10px;padding:14px;font-size:0.87rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px"><span>Invoice: <strong>${fmt(latPay.tagihan)}</strong></span><span>Paid: <strong style="color:var(--green)">${fmt(latPay.jumlah)}</strong></span>${latPay.status==='Lunas'?chip('Paid','chip-green'):latPay.status==='Cicil'?chip('Partial','chip-yellow'):chip('Unpaid','chip-red')}</div>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn wa" onclick="window.open('https://wa.me/?text='+encodeURIComponent(_reportTexts['${key}']),'_blank')">💬 Share via WhatsApp</button>
          <button class="btn" onclick="showReportPrint('${siswa.id}')">🖨️ Print Report</button>
          <button class="btn" onclick="navigator.clipboard.writeText(_reportTexts['${key}']).then(()=>showToast('✅ Copied!','success'))">📋 Copy</button>
        </div>
      </div>
    </div>`;
  });
  if(!any){ cont.innerHTML=''; empty.style.display='block'; }
  else { cont.innerHTML=html; empty.style.display='none'; }
}

// ════════════════════════════════════════════════
//  ANALYTICS
// ════════════════════════════════════════════════
function renderAnalytics(){
  // ── Charts ──
  renderRevenueChart('chart-rev2');
  const present=absensiList.filter(a=>a.status==='Hadir').length;
  const excused=absensiList.filter(a=>a.status==='Izin').length;
  const absent =absensiList.filter(a=>a.status==='Alpha').length;
  const ctx2=document.getElementById('chart-attend')?.getContext('2d');
  if(ctx2){
    if(window._chartAttend) window._chartAttend.destroy();
    window._chartAttend=new Chart(ctx2,{type:'doughnut',data:{labels:['Present','Excused','Absent'],datasets:[{data:[present,excused,absent],backgroundColor:['rgba(0,214,143,0.8)','rgba(255,179,71,0.8)','rgba(255,79,109,0.8)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#7c87a0',font:{size:11}}}}}});
  }
  const students=siswaList.map(s=>{ const evals=evaluasiList.filter(e=>e.siswaId===s.id); const avg=evals.length?Math.round(evals.reduce((t,e)=>t+Number(e.nilai||0),0)/evals.length):0; return {name:s.nick||s.nama.split(' ')[0],avg}; }).filter(s=>s.avg>0);
  const ctx3=document.getElementById('chart-scores')?.getContext('2d');
  if(ctx3&&students.length){
    if(window._chartScores) window._chartScores.destroy();
    window._chartScores=new Chart(ctx3,{type:'bar',data:{labels:students.map(s=>s.name),datasets:[{label:'Avg Score',data:students.map(s=>s.avg),backgroundColor:'rgba(167,139,250,0.7)',borderColor:'rgba(167,139,250,1)',borderWidth:2,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,ticks:{color:'#7c87a0'},grid:{color:'rgba(255,255,255,0.05)'}},y:{ticks:{color:'#7c87a0'},grid:{display:false}}}}});
  }
  // ── KPIs ──
  renderAnalyticsKPIs();
  // ── Progress Tracker ──
  renderProgressTracker();
}

// ════════════════════════════════════════════════
//  BACKUP & RESTORE
// ════════════════════════════════════════════════
function exportBackup(){
  const data={
    className: currentClassName,
    classId:   currentClassId,
    siswa:siswaList, absensi:absensiList, materi:materiList,
    evaluasi:evaluasiList, bayar:bayarList, schedules:scheduleList,
    exportedAt:new Date().toISOString()
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  const safeName = (currentClassName||'class').replace(/\s+/g,'-');
  a.href=URL.createObjectURL(blob);
  a.download='LittleLume-'+safeName+'-Backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
}
function importBackup(e){
  const file=e.target.files[0]; if(!file) return;
  const statusEl = document.getElementById('restore-status');
  // Reset input agar file yang sama bisa dipilih lagi jika batal
  e.target.value = '';

  // Baca dulu untuk preview info sebelum konfirmasi
  const previewReader = new FileReader();
  previewReader.onload = ev => {
    let data, preview = '';
    try{
      data = JSON.parse(ev.target.result);
      const s   = (data.siswa||[]).length;
      const ab  = (data.absensi||[]).length;
      const pay = (data.bayar||[]).length;
      const ev2 = (data.evaluasi||[]).length;
      const cls = data.className ? `<strong>${data.className}</strong>` : 'unknown class';
      const exp = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'unknown date';
      preview = `
        <div style="background:var(--bg3);border-radius:8px;padding:12px 16px;margin:12px 0;text-align:left;line-height:2">
          <div>📁 File: <strong>${file.name}</strong></div>
          <div>🏫 Class: ${cls}</div>
          <div>📅 Exported: ${exp}</div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
            👤 ${s} students &nbsp;·&nbsp; 📋 ${ab} attendance &nbsp;·&nbsp; 💰 ${pay} payments &nbsp;·&nbsp; ⭐ ${ev2} evaluations
          </div>
        </div>
        <p style="color:var(--red);font-weight:700">⚠️ This will REPLACE all current data in <strong>${currentClassName||'this class'}</strong>.</p>`;
    } catch(err){
      statusEl.innerHTML='<span style="color:var(--red)">❌ Invalid backup file: '+err.message+'</span>';
      return;
    }
    dangerModal(
      '⬆️ Restore Backup',
      `Are you sure you want to restore this backup?${preview}`,
      async ()=>{
        statusEl.innerHTML='<span style="color:var(--yellow)">⏳ Reading file…</span>';
        try{
          if(data.siswa)     { siswaList    = data.siswa.map(n=>({...n})); }
          if(data.absensi)   { absensiList  = data.absensi.map(n=>({...n})); }
          if(data.materi)    { materiList   = data.materi.map(n=>({...n})); }
          if(data.evaluasi)  { evaluasiList = data.evaluasi.map(n=>({...n})); }
          if(data.bayar)     { bayarList    = data.bayar.map(n=>({...n})); }
          if(data.schedules) { scheduleList = data.schedules.map(n=>({...n})); }
          statusEl.innerHTML='<span style="color:var(--yellow)">⏳ Saving to cloud… <strong>do not refresh!</strong></span>';
          await _flushToFirestore();
          statusEl.innerHTML=`<span style="color:var(--green)">✅ <strong>Import complete!</strong> ${siswaList.length} students, ${bayarList.length} payments saved to cloud.<br><span style="font-size:0.8rem;opacity:0.8">You can now refresh safely.</span></span>`;
          renderAll(); renderBackupSummary();
        } catch(err2){
          statusEl.innerHTML='<span style="color:var(--red)">❌ Error: '+err2.message+'</span>';
          console.error('Import error:', err2);
        }
      },
      { okText:'Yes, Restore', cancelText:'Cancel' }
    );
  };
  previewReader.readAsText(file);
}
function exportCSV(key){
  let rows=[],headers=[];
  if(key==='bayar'){ headers=['Date','Student','Period','Invoice','Paid','Status','Notes']; rows=bayarList.map(b=>[tglFmt(b.tanggal),b.namaSiswa,b.periode||'',b.tagihan,b.jumlah,b.status,b.catatan||'']); }
  else if(key==='absensi'){ headers=['Date','Student','Status','Note']; rows=absensiList.map(a=>[tglFmt(a.tanggal),a.namaSiswa,a.status,a.keterangan||'']); }
  else if(key==='evaluasi'){ headers=['Date','Student','Score','Rating','Progress','Notes']; rows=evaluasiList.map(e=>[tglFmt(e.tanggal),e.namaSiswa,e.nilai,e.rating,e.progress||'',e.catatan||'']); }
  const csv=[headers,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='LittleLume-'+key+'-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
}
function clearAllData(){
  dangerModal(
    '⚠️ Clear All Data',
    `<strong style="color:var(--red)">This will permanently delete all students, attendance, evaluations, payments, and lessons in the current class.</strong><br><br>This action <em>cannot be undone</em>. Are you absolutely sure?`,
    ()=>{
      dangerModal(
        '⚠️ Final Confirmation',
        `Last chance! You are about to erase all data in <strong>${currentClassName||'this class'}</strong>. Click Delete to confirm.`,
        ()=>{
          siswaList=[];absensiList=[];materiList=[];evaluasiList=[];bayarList=[];scheduleList=[];
          saveToFirestore();
          renderAll(); renderBackupSummary(); showToast('✅ All data cleared.','success');
        },
        { okText:'Delete Everything', cancelText:'Cancel' }
      );
    },
    { okText:'Yes, Continue', cancelText:'Cancel' }
  );
}
function renderBackupSummary(){
  document.getElementById('backup-summary').innerHTML=`
    <div style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">
      📂 Active class: <strong style="color:var(--accent)">${currentClassName||'—'}</strong>
      &nbsp;·&nbsp; ${classesList.length} total class(es)
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
      <div class="stat-card s-purple"><div class="val">${siswaList.length}</div><div class="lbl">Students</div></div>
      <div class="stat-card s-blue"><div class="val">${absensiList.length}</div><div class="lbl">Attendance Records</div></div>
      <div class="stat-card s-green"><div class="val">${materiList.length}</div><div class="lbl">Lessons</div></div>
      <div class="stat-card s-yellow"><div class="val">${evaluasiList.length}</div><div class="lbl">Evaluations</div></div>
      <div class="stat-card s-red"><div class="val">${bayarList.length}</div><div class="lbl">Payments</div></div>
    </div>`;
}

// ════════════════════════════════════════════════
//  SELECT SYNC
// ════════════════════════════════════════════════
function updateSelects(){
  const opts=siswaList.map(s=>`<option value="${s.id}">${s.nama}${s.nick?' ('+s.nick+')':''}</option>`).join('');
  document.getElementById('e-siswa').innerHTML='<option value="">-- Select --</option>'+opts;
  document.getElementById('b-siswa').innerHTML='<option value="">-- Select --</option>'+opts;
  document.getElementById('m-target').innerHTML='<option value="Semua">All Students</option>'+opts;
  document.getElementById('r-siswa').innerHTML='<option value="">-- All Students --</option>'+opts;
  const filterEl=document.getElementById('eval-filter-siswa');
  if(filterEl) filterEl.innerHTML='<option value="">All Students</option>'+opts;
  // Update single attendance dropdown jika panel sedang terbuka
  const singleSel=document.getElementById('single-att-siswa');
  if(singleSel && singleSel.options.length > 1){
    const currentVal = singleSel.value;
    singleSel.innerHTML='<option value="">-- Pilih Siswa --</option>'+opts;
    singleSel.value = currentVal;
  }
}

// ════════════════════════════════════════════════
//  RENDER ALL
// ════════════════════════════════════════════════
function renderAll(){
  renderStudents(); renderLessons();
  renderEval(); updateSelects(); updateUnpaidBadge();
  // Auto-set current month filters on first load
  const attDari = document.getElementById('att-f-dari');
  if(attDari && !attDari.value) setCurrentMonthAttFilter();
  else renderAttendance();
  const fDari = document.getElementById('f-dari');
  if(fDari && !fDari.value) setCurrentMonthFilter();
  else renderPayment();
}

// ════════════════════════════════════════════════
//  DOCUMENT PRINT / EXPORT (Eval, Lesson, Report)
// ════════════════════════════════════════════════

// ── Storage for current doc being printed ──
const _docStore = { eval:{html:'',text:'',title:''}, lesson:{html:'',text:'',title:''}, report:{html:'',text:'',title:''} };

// ── Shared print HTML wrapper ──
function _docPrintHTML(bodyHTML, title){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;padding:28px;max-width:600px;margin:auto;color:#1a1f36;background:#fff}
    @page{size:A4;margin:14mm}
    h1{font-size:1.3rem;color:#6c63ff;margin-bottom:4px}
    .sub{font-size:0.78rem;color:#888;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #eee}
    .row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;padding:7px 0;font-size:0.87rem;border-bottom:1px solid #f0f0f0;page-break-inside:avoid}
    .row span{color:#888;flex:0 0 auto}.row strong{text-align:right;flex:1 1 auto;min-width:0;word-break:break-word}
    .section{margin:14px 0 6px;font-size:0.72rem;font-weight:800;color:#6c63ff;text-transform:uppercase;letter-spacing:0.8px}
    .block{background:#f7f8fc;border-radius:8px;padding:12px 14px;font-size:0.87rem;margin-bottom:12px;line-height:1.6;white-space:pre-line;word-wrap:break-word;page-break-inside:avoid}
    .score{font-size:1.6rem;font-weight:800;color:#6c63ff}
    .footer{text-align:center;margin-top:20px;padding-top:12px;border-top:2px dashed #ddd;font-size:0.72rem;color:#aaa;page-break-inside:avoid}
    .footer strong{color:#6c63ff}
    .chip{display:inline-block;padding:2px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:#eef0ff;color:#6c63ff}
    .stars{font-size:1.1rem}
  </style></head><body>
  ${bodyHTML}
  <div class="footer">LittleLume English Course 🎓</div>
  </body></html>`;
}

// ── EVALUATION PRINT ──
function showEvalPrint(id){
  const e = evaluasiList.find(x=>x.id===id); if(!e) return;
  const s = siswaList.find(x=>x.id===e.siswaId);
  const n = Number(e.nilai||0);
  const nc = n>=80?'#00d68f':n>=60?'#ffb347':'#ff4f6d';
  const ratingLabels=['','Passive','Below Average','Average','Good','Excellent'];
  const bodyHTML=`
    <h1>⭐ Evaluation Report</h1>
    <div class="sub">LittleLume English Course · ${tglFmt(e.tanggal)}</div>
    <div class="row"><span>Student</span><strong>${e.namaSiswa}</strong></div>
    ${s?.nick?`<div class="row"><span>Nickname</span><strong>${s.nick}</strong></div>`:''}
    ${s?.kelas?`<div class="row"><span>School / Class</span><strong>${s.kelas}</strong></div>`:''}
    ${s?.namaOrtu?`<div class="row"><span>Parent</span><strong>${s.namaOrtu}</strong></div>`:''}
    <div class="row"><span>Date</span><strong>${tglFmt(e.tanggal)}</strong></div>
    <div class="row"><span>Level</span><strong>${s?.level||'-'}</strong></div>
    <div style="text-align:center;margin:16px 0 10px">
      <div class="score" style="color:${nc}">${e.nilai||'-'}</div>
      <div style="font-size:0.75rem;color:#888;margin-top:2px">Score / 100</div>
    </div>
    <div class="row"><span>Participation</span><strong><span class="stars">${stars(e.rating)}</span> ${ratingLabels[e.rating]||''}</strong></div>
    ${e.progress?`<div class="section">Progress / Achievement</div><div class="block">${e.progress}</div>`:''}
    ${e.catatan?`<div class="section">Notes & Recommendations</div><div class="block">${e.catatan}</div>`:''}
  `;
  const txt=`⭐ EVALUATION REPORT — LITTLELUME ENGLISH COURSE\n${'─'.repeat(36)}\nStudent  : ${e.namaSiswa}${s?.nick?' ('+s.nick+')':''}\n${s?.kelas?'School   : '+s.kelas+'\n':''}${s?.namaOrtu?'Parent   : '+s.namaOrtu+'\n':''}Date     : ${tglFmt(e.tanggal)}\nLevel    : ${s?.level||'-'}\nScore    : ${e.nilai||'-'}/100\nRating   : ${stars(e.rating)} ${ratingLabels[e.rating]||''}\n${e.progress?'\n📈 Progress:\n'+e.progress+'\n':''}${e.catatan?'\n📝 Notes:\n'+e.catatan+'\n':''}\n${'─'.repeat(36)}\nLittleLume English Course 🎓`;
  _docStore.eval = { html:bodyHTML, text:txt, title:'Evaluation-'+e.namaSiswa+'-'+e.tanggal };
  document.getElementById('eval-print-content').innerHTML = `<div style="font-size:0.87rem;line-height:1.7;color:var(--text)">${bodyHTML}</div>`;
  document.getElementById('doc-status-eval').style.display='none';
  openModal('modal-eval-print');
}

// ── LESSON PRINT ──
function showLessonPrint(id){
  const m = materiList.find(x=>x.id===id); if(!m) return;
  const statusLabel = m.status==='Selesai'?'✅ Completed':'🗓️ Planned';
  const bodyHTML=`
    <h1>📚 Lesson Plan</h1>
    <div class="sub">LittleLume English Course · ${tglFmt(m.tanggal)}</div>
    <div class="row"><span>Topic</span><strong>${m.topik}</strong></div>
    <div class="row"><span>Date</span><strong>${tglFmt(m.tanggal)}</strong></div>
    <div class="row"><span>Status</span><strong>${statusLabel}</strong></div>
    <div class="row"><span>Target</span><strong>${m.target==='Semua'?'All Students':m.target||'All Students'}</strong></div>
    ${m.sumber?`<div class="row"><span>Reference</span><strong>${m.sumber}</strong></div>`:''}
    ${m.deskripsi?`<div class="section">Description & Activities</div><div class="block">${m.deskripsi}</div>`:''}
  `;
  const txt=`📚 LESSON PLAN — LITTLELUME ENGLISH COURSE\n${'─'.repeat(36)}\nTopic    : ${m.topik}\nDate     : ${tglFmt(m.tanggal)}\nStatus   : ${m.status}\nTarget   : ${m.target==='Semua'?'All Students':m.target||'All Students'}\n${m.sumber?'Ref      : '+m.sumber+'\n':''}${m.deskripsi?'\n📝 Description:\n'+m.deskripsi+'\n':''}\n${'─'.repeat(36)}\nLittleLume English Course 🎓`;
  _docStore.lesson = { html:bodyHTML, text:txt, title:'Lesson-'+m.topik.replace(/\s+/g,'-').slice(0,30) };
  document.getElementById('lesson-print-content').innerHTML = `<div style="font-size:0.87rem;line-height:1.7;color:var(--text)">${bodyHTML}</div>`;
  document.getElementById('doc-status-lesson').style.display='none';
  openModal('modal-lesson-print');
}

// ── REPORT PRINT ──
function showReportPrint(siswaId){
  const siswa = siswaList.find(s=>s.id===siswaId); if(!siswa) return;
  const evals = evaluasiList.filter(e=>e.siswaId===siswaId);
  const att   = absensiList.filter(a=>a.siswaId===siswaId);
  const pays  = bayarList.filter(b=>b.siswaId===siswaId);
  const latEval  = evals.sort((a,b)=>b.tanggal.localeCompare(a.tanggal))[0];
  const latPay   = pays.sort((a,b)=>b.tanggal.localeCompare(a.tanggal))[0];
  const avgScore = evals.length?Math.round(evals.reduce((s,e)=>s+Number(e.nilai||0),0)/evals.length):null;
  const present  = att.filter(a=>a.status==='Hadir').length;
  const attPct   = att.length?Math.round((present/att.length)*100):null;
  const sc = avgScore>=80?'#00d68f':avgScore>=60?'#ffb347':'#ff4f6d';
  const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const ratingLabels=['','Passive','Below Average','Average','Good','Excellent'];

  const bodyHTML=`
    <h1>📤 Student Progress Report</h1>
    <div class="sub">LittleLume English Course · ${now}</div>
    <div class="row"><span>Student</span><strong>${siswa.nama}${siswa.nick?' ('+siswa.nick+')':''}</strong></div>
    ${siswa.kelas?`<div class="row"><span>School / Class</span><strong>${siswa.kelas}</strong></div>`:''}
    ${siswa.namaOrtu?`<div class="row"><span>Parent</span><strong>${siswa.namaOrtu}</strong></div>`:''}
    <div class="row"><span>Level</span><strong><span class="chip">${siswa.level}</span></strong></div>
    ${siswa.hari?`<div class="row"><span>Class Days</span><strong>${siswa.hari}</strong></div>`:''}
    ${avgScore!==null?`<div style="text-align:center;margin:16px 0 10px"><div class="score" style="color:${sc}">${avgScore}</div><div style="font-size:0.75rem;color:#888">Average Score / 100</div></div>`:''}
    ${attPct!==null?`<div class="row"><span>Attendance</span><strong>${attPct}% (${present}/${att.length} sessions)</strong></div>`:''}
    ${evals.length?`<div class="row"><span>Total Evaluations</span><strong>${evals.length}</strong></div>`:''}
    ${latEval?`
    <div class="section">⭐ Latest Evaluation (${tglFmt(latEval.tanggal)})</div>
    <div class="block">
      Score: <strong>${latEval.nilai}/100</strong> &nbsp;|&nbsp; Participation: <span class="stars">${stars(latEval.rating)}</span> ${ratingLabels[latEval.rating]||''}<br>
      ${latEval.progress?'<br><strong>Progress:</strong> '+latEval.progress:''}
      ${latEval.catatan?'<br><strong>Notes:</strong> '+latEval.catatan:''}
    </div>`:''}
    ${latPay?`
    <div class="section">💰 Payment — ${latPay.periode||'-'}</div>
    <div class="block">
      Invoice: <strong>${fmt(latPay.tagihan)}</strong> &nbsp;|&nbsp; Paid: <strong>${fmt(latPay.jumlah)}</strong> &nbsp;|&nbsp; Status: <strong>${latPay.status}</strong>
    </div>`:''}
  `;
  const key='rpt_'+siswa.id;
  const txt = _reportTexts[key] || `📤 PARENT REPORT — ${siswa.nama}\nLittleLume English Course\n${now}`;
  _docStore.report = { html:bodyHTML, text:txt, title:'Report-'+siswa.nama.replace(/\s+/g,'-') };
  document.getElementById('report-print-content').innerHTML = `<div style="font-size:0.87rem;line-height:1.7;color:var(--text)">${bodyHTML}</div>`;
  document.getElementById('doc-status-report').style.display='none';
  openModal('modal-report-print');
}

// ── SHARED PRINT/EXPORT ACTIONS ──
function docPrint(type){
  const d=_docStore[type]; if(!d.html) return;
  const w=window.open('','_blank','width=680,height=900');
  w.document.write(_docPrintHTML(d.html, d.title));
  w.document.write(`<script>window.onload=function(){window.print();}<\/script>`);
  w.document.close();
}

function docDownloadPDF(type){
  const d=_docStore[type]; if(!d.html) return;
  const w=window.open('','_blank','width=680,height=900');
  w.document.write(_docPrintHTML(d.html, d.title));
  w.document.write(`<script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script>`);
  w.document.close();
}

async function docDownloadJPG(type){
  const d=_docStore[type]; if(!d.html) return;
  const statusEl = document.getElementById('doc-status-'+type);
  statusEl.style.display='block'; statusEl.textContent='⏳ Generating image…';
  const panel = document.getElementById('doc-render-panel');
  panel.innerHTML = `<div style="font-family:Arial,sans-serif;color:#1a1f36">${d.html}<div style="text-align:center;margin-top:20px;padding-top:10px;border-top:2px dashed #ddd;font-size:0.72rem;color:#aaa">LittleLume English Course 🎓</div></div>`;
  await new Promise(r=>setTimeout(r,150));
  try{
    const canvas = await html2canvas(panel,{scale:2.5,useCORS:true,backgroundColor:'#ffffff',width:560,windowWidth:560});
    panel.innerHTML='';
    const a=document.createElement('a');
    a.download=d.title+'.jpg';
    a.href=canvas.toDataURL('image/jpeg',0.92); a.click();
    statusEl.textContent='✅ Image saved to Downloads!';
    setTimeout(()=>statusEl.style.display='none',4000);
  }catch(e){
    panel.innerHTML='';
    statusEl.textContent='❌ Failed. Try Print instead.';
  }
}

function docWaText(type){
  const text=_docStore[type]?.text||'';
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
}

async function docWaImage(type){
  const d=_docStore[type]; if(!d.html) return;
  const statusEl = document.getElementById('doc-status-'+type);
  statusEl.style.display='block'; statusEl.textContent='⏳ Generating image…';
  const panel = document.getElementById('doc-render-panel');
  panel.innerHTML = `<div style="font-family:Arial,sans-serif;color:#1a1f36">${d.html}<div style="text-align:center;margin-top:20px;padding-top:10px;border-top:2px dashed #ddd;font-size:0.72rem;color:#aaa">LittleLume English Course 🎓</div></div>`;
  await new Promise(r=>setTimeout(r,150));
  try{
    const canvas = await html2canvas(panel,{scale:2.5,useCORS:true,backgroundColor:'#ffffff',width:560,windowWidth:560});
    panel.innerHTML='';
    const a=document.createElement('a');
    a.download=d.title+'.jpg'; a.href=canvas.toDataURL('image/jpeg',0.92); a.click();
    await new Promise(r=>setTimeout(r,600));
    window.open('https://wa.me/?text='+encodeURIComponent('📎 Please see attached image from LittleLume English Course'),'_blank');
    statusEl.innerHTML='✅ Image saved → WhatsApp opened → tap 📎 → Gallery to attach & send.';
    setTimeout(()=>statusEl.style.display='none',7000);
  }catch(e){
    panel.innerHTML='';
    statusEl.textContent='❌ Failed. Try Save JPG.';
  }
}

function docCopyText(type){
  const text=_docStore[type]?.text||'';
  navigator.clipboard.writeText(text).then(()=>showToast('✅ Copied! Paste into WhatsApp.','success'));
}
// ════════════════════════════════════════════════
//  BULK EVALUATION — Manual + Template + Copy
// ════════════════════════════════════════════════
let _currentEvalTab = 'single';

function switchEvalTab(tab){
  _currentEvalTab = tab;
  const isBulk = tab === 'bulk';
  document.getElementById('eval-single-panel').style.display = isBulk ? 'none' : 'block';
  document.getElementById('eval-bulk-panel').style.display   = isBulk ? 'block' : 'none';
  const btnSingle = document.getElementById('eval-tab-single');
  const btnBulk   = document.getElementById('eval-tab-bulk');
  btnSingle.style.background = isBulk ? 'transparent' : 'var(--accent)';
  btnSingle.style.color      = isBulk ? 'var(--muted)'  : '#fff';
  btnBulk.style.background   = isBulk ? 'var(--accent)' : 'transparent';
  btnBulk.style.color        = isBulk ? '#fff' : 'var(--muted)';
  if(isBulk) renderBulkEvalGrid();
}

// ── Templates stored in memory ──
let _evalTemplates = JSON.parse(localStorage.getItem('evalTemplates')||'[]');
function saveEvalTemplates(){ localStorage.setItem('evalTemplates', JSON.stringify(_evalTemplates)); }

function renderBulkEvalGrid(){
  const grid = document.getElementById('bulk-eval-grid');
  if(!siswaList.length){
    grid.innerHTML='<div class="empty"><div class="ei">👤</div><p>No students. Add students first.</p></div>';
    return;
  }
  document.getElementById('bulk-total-count').textContent = siswaList.length;
  document.getElementById('bulk-progress-wrap').style.display='block';
  renderTemplateList();
  grid.innerHTML = siswaList.map(s=>`
    <div class="bulk-eval-card" id="bulk-card-${s.id}">
      <div class="bulk-eval-header">
        <div class="bulk-eval-avatar">${(s.nick||s.nama).charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div class="bulk-eval-name">${s.nama}${s.nick?` <span style="color:var(--muted);font-size:0.8rem">(${s.nick})</span>`:''}</div>
          <div class="bulk-eval-sub">${s.kelas||''} · ${s.level}</div>
        </div>
        <!-- Copy from another student -->
        <select onchange="copyFromStudent('${s.id}',this.value);this.value=''"
          style="font-size:0.75rem;padding:4px 8px;border-radius:7px;border:1px solid var(--border);background:var(--bg2);color:var(--muted);max-width:130px">
          <option value="">📋 Copy from…</option>
          ${siswaList.filter(x=>x.id!==s.id).map(x=>`<option value="${x.id}">${x.nick||x.nama.split(' ')[0]}</option>`).join('')}
        </select>
        <!-- Skip toggle -->
        <label style="display:flex;align-items:center;gap:5px;font-size:0.75rem;color:var(--muted);cursor:pointer;font-weight:700;text-transform:none;letter-spacing:0;margin-left:6px;white-space:nowrap">
          <input type="checkbox" id="bulk-skip-${s.id}" onchange="toggleBulkSkip('${s.id}')" style="width:auto;margin:0">Skip
        </label>
      </div>
      <div id="bulk-fields-${s.id}">
        <div style="display:grid;grid-template-columns:80px 1fr 1fr;gap:10px;margin-bottom:8px">
          <div class="form-group" style="margin:0">
            <label>Score</label>
            <input type="number" id="bulk-nilai-${s.id}" placeholder="0–100" min="0" max="100"
              oninput="updateBulkProgress()" style="text-align:center;font-weight:800;font-size:1rem">
          </div>
          <div class="form-group" style="margin:0">
            <label>Participation</label>
            <select id="bulk-rating-${s.id}">
              <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
              <option value="4">⭐⭐⭐⭐ Good</option>
              <option value="3" selected>⭐⭐⭐ Average</option>
              <option value="2">⭐⭐ Below Average</option>
              <option value="1">⭐ Passive</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label>Individual Notes</label>
            <input type="text" id="bulk-catatan-${s.id}" placeholder="Optional…">
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label>Progress (leave blank to use Common Topic)</label>
          <input type="text" id="bulk-progress-${s.id}" placeholder="Individual progress… or leave blank">
        </div>
      </div>
    </div>`).join('');
  updateBulkProgress();
}

function toggleBulkSkip(siswaId){
  const card    = document.getElementById('bulk-card-'+siswaId);
  const fields  = document.getElementById('bulk-fields-'+siswaId);
  const skipped = document.getElementById('bulk-skip-'+siswaId).checked;
  card.style.opacity = skipped ? '0.4' : '1';
  fields.style.pointerEvents = skipped ? 'none' : 'auto';
  updateBulkProgress();
}

// Copy nilai/rating/notes from one student to another
function copyFromStudent(targetId, sourceId){
  if(!sourceId) return;
  const n = document.getElementById('bulk-nilai-'+sourceId)?.value;
  const r = document.getElementById('bulk-rating-'+sourceId)?.value;
  const c = document.getElementById('bulk-catatan-'+sourceId)?.value;
  const p = document.getElementById('bulk-progress-'+sourceId)?.value;
  if(n) document.getElementById('bulk-nilai-'+targetId).value    = n;
  if(r) document.getElementById('bulk-rating-'+targetId).value   = r;
  if(c) document.getElementById('bulk-catatan-'+targetId).value  = c;
  if(p) document.getElementById('bulk-progress-'+targetId).value = p;
  updateBulkProgress();
  // Flash highlight
  const card = document.getElementById('bulk-card-'+targetId);
  card.style.borderColor = 'var(--accent)';
  card.style.boxShadow   = '0 0 0 3px rgba(108,99,255,0.2)';
  setTimeout(()=>{ card.style.borderColor=''; card.style.boxShadow=''; }, 1200);
}

// ── Quick fill all ──
function bulkQuickFill(){
  const rating = document.getElementById('bulk-fill-rating').value;
  const score  = document.getElementById('bulk-fill-score').value;
  siswaList.forEach(s=>{
    if(document.getElementById('bulk-skip-'+s.id)?.checked) return;
    if(rating) document.getElementById('bulk-rating-'+s.id).value = rating;
    if(score)  document.getElementById('bulk-nilai-'+s.id).value  = score;
  });
  updateBulkProgress();
}

function bulkReset(){
  showModalDialog('🔄 Reset All Fields', 'This will clear all scores, ratings, and notes filled in. Are you sure?',
    ()=>{
  siswaList.forEach(s=>{
    const skip = document.getElementById('bulk-skip-'+s.id);
    if(skip){ skip.checked=false; toggleBulkSkip(s.id); }
    ['bulk-nilai-','bulk-catatan-','bulk-progress-'].forEach(p=>{
      const el=document.getElementById(p+s.id); if(el) el.value='';
    });
    const r=document.getElementById('bulk-rating-'+s.id); if(r) r.value='3';
  });
  updateBulkProgress();
    }, { okText:'Reset', cancelText:'Cancel', type:'confirm' });
}

function updateBulkProgress(){
  let filled=0, skipped=0;
  siswaList.forEach(s=>{
    if(document.getElementById('bulk-skip-'+s.id)?.checked){ skipped++; return; }
    if(document.getElementById('bulk-nilai-'+s.id)?.value) filled++;
  });
  const active = siswaList.length - skipped;
  const pct = active>0 ? Math.round((filled/active)*100) : 0;
  const fc = document.getElementById('bulk-filled-count'); if(fc) fc.textContent=filled;
  const tc = document.getElementById('bulk-total-count');  if(tc) tc.textContent=siswaList.length;
  const pf = document.getElementById('bulk-progress-fill'); if(pf) pf.style.width=pct+'%';
  const sc = document.getElementById('bulk-skip-count');   if(sc) sc.textContent=skipped>0?skipped+' skipped':'';
}

// ── TEMPLATES ──
function renderTemplateList(){
  const el = document.getElementById('bulk-template-list');
  if(!el) return;
  if(!_evalTemplates.length){
    el.innerHTML='<span style="color:var(--muted);font-size:0.82rem">No templates saved yet.</span>'; return;
  }
  el.innerHTML = _evalTemplates.map((t,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;font-size:0.85rem">
        <strong>${t.name}</strong>
        <span style="color:var(--muted);font-size:0.75rem;margin-left:6px">Score:${t.nilai||'—'} · ${['','⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'][t.rating]||'—'}</span>
      </div>
      <button class="btn sm" onclick="applyTemplate(${i})">Apply All</button>
      <button class="btn danger sm icon-only" onclick="deleteTemplate(${i})">🗑️</button>
    </div>`).join('');
}

function saveAsTemplate(){
  const name = document.getElementById('bulk-tpl-name').value.trim();
  if(!name){ infoModal('Required Field', 'Please enter a template name!'); return; }
  // Grab values from first non-skipped student as template baseline
  const first = siswaList.find(s=>!document.getElementById('bulk-skip-'+s.id)?.checked);
  if(!first){ infoModal('No Active Students', 'There are no active (non-skipped) students to save a template from.'); return; }
  const tpl = {
    name,
    nilai:    document.getElementById('bulk-nilai-'+first.id)?.value||'',
    rating:   document.getElementById('bulk-rating-'+first.id)?.value||'3',
    progress: document.getElementById('bulk-common-progress')?.value||'',
    catatan:  document.getElementById('bulk-catatan-'+first.id)?.value||'',
  };
  _evalTemplates.push(tpl);
  saveEvalTemplates();
  document.getElementById('bulk-tpl-name').value='';
  renderTemplateList();
  showToast('✅ Template "'+name+'" saved!', 'success');
}

function applyTemplate(idx){
  const t = _evalTemplates[idx]; if(!t) return;
  if(t.progress) document.getElementById('bulk-common-progress').value = t.progress;
  siswaList.forEach(s=>{
    if(document.getElementById('bulk-skip-'+s.id)?.checked) return;
    if(t.nilai)   document.getElementById('bulk-nilai-'+s.id).value   = t.nilai;
    if(t.rating)  document.getElementById('bulk-rating-'+s.id).value  = t.rating;
    if(t.catatan) document.getElementById('bulk-catatan-'+s.id).value = t.catatan;
  });
  updateBulkProgress();
}

function deleteTemplate(idx){
  dangerModal('🗑️ Delete Template', 'Are you sure you want to delete this evaluation template?',
    ()=>{ _evalTemplates.splice(idx,1); saveEvalTemplates(); renderTemplateList(); },
    { okText:'Delete', cancelText:'Keep' }
  );
}

// ── SAVE ALL ──
async function saveBulkEval(){
  const tanggal = document.getElementById('bulk-tanggal').value;
  if(!tanggal){ infoModal('Required Field', 'Please select an evaluation date first!'); return; }
  const commonProgress = document.getElementById('bulk-common-progress')?.value.trim()||'';
  const statusEl = document.getElementById('bulk-save-status');
  statusEl.innerHTML='<span style="color:var(--yellow)">⏳ Saving…</span>';
  let saved=0, skipped=0;
  siswaList.forEach(s=>{
    if(document.getElementById('bulk-skip-'+s.id)?.checked){ skipped++; return; }
    const nilai    = document.getElementById('bulk-nilai-'+s.id)?.value||'';
    const rating   = document.getElementById('bulk-rating-'+s.id)?.value||'3';
    const catatan  = document.getElementById('bulk-catatan-'+s.id)?.value.trim()||'';
    const progress = document.getElementById('bulk-progress-'+s.id)?.value.trim()||commonProgress;
    // Update existing or push new
    const existIdx = evaluasiList.findIndex(e=>e.siswaId===s.id && e.tanggal===tanggal);
    const entry = { id:existIdx>-1?evaluasiList[existIdx].id:uid(), tanggal, siswaId:s.id, namaSiswa:s.nama, nilai, rating, progress, catatan };
    if(existIdx>-1) evaluasiList[existIdx]=entry;
    else evaluasiList.push(entry);
    saved++;
  });
  DB.set('evaluasi', evaluasiList);
  renderEval();
  statusEl.innerHTML=`<span style="color:var(--green)">✅ ${saved} evaluations saved!${skipped>0?' ('+skipped+' skipped)':''}</span>`;
  showToast(`✅ ${saved} evaluations saved!${skipped>0?' ('+skipped+' skipped)':''}`, 'success');
  setTimeout(()=>{ statusEl.innerHTML=''; }, 3500);
}

function init(){
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('absen-date').value=today;
  document.getElementById('m-tanggal').value=today;
  document.getElementById('e-tanggal').value=today;
  document.getElementById('b-tanggal').value=today;
  const bt=document.getElementById('bulk-tanggal'); if(bt) bt.value=today;
}
init();

// ════════════════════════════════════════════════
