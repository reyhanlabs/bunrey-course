//  GLOBAL SEARCH
// ════════════════════════════════════════════════
function globalSearch(q){
  const res = document.getElementById('search-results');
  if(!q || q.length < 2){ res.classList.remove('open'); return; }
  if(!siswaList.length){
    res.innerHTML=`<div style="padding:12px 14px;font-size:0.82rem;color:var(--muted);text-align:center">No students loaded yet.</div>`;
    res.classList.add('open'); return;
  }
  const ql = q.toLowerCase();
  const matches = siswaList
    .filter(s=>(s.nama||'').toLowerCase().includes(ql)||(s.nick||'').toLowerCase().includes(ql)||(s.kelas||'').toLowerCase().includes(ql))
    .slice(0,6);
  if(!matches.length){
    res.innerHTML=`<div style="padding:12px 14px;font-size:0.82rem;color:var(--muted);text-align:center">No student found for "<strong>${q}</strong>"</div>`;
    res.classList.add('open'); return;
  }
  res.innerHTML = matches.map(s=>`
    <div class="search-result-item" onmousedown="goToStudent('${s.id}')">
      <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.8rem;font-weight:800;flex-shrink:0">${(s.nick||s.nama).charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-weight:700">${s.nama}${s.nick?` <span style="color:var(--muted);font-weight:500">(${s.nick})</span>`:''}</div>
        <div style="font-size:0.72rem;color:var(--muted)">${s.level||''}${s.kelas?' · '+s.kelas:''}</div>
      </div>
    </div>`).join('');
  res.classList.add('open');
}

function closeSearch(){
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('global-search').value='';
}

function goToStudent(id){
  closeSearch();
  openStudentProfile(id);
}

function openStudentProfile(id){
  const s = siswaList.find(x=>x.id===id);
  if(!s) return;

  // ── Attendance stats ──
  const attAll   = absensiList.filter(a=>a.siswaId===id);
  const attHadir = attAll.filter(a=>a.status==='Hadir');
  const attIzin  = attAll.filter(a=>a.status==='Izin');
  const attAlpha = attAll.filter(a=>a.status==='Alpha');
  const attRate  = attAll.length ? Math.round(attHadir.length/attAll.length*100) : 0;
  const attColor = attRate>=80?'var(--green)':attRate>=60?'var(--yellow)':'var(--red)';

  // ── Payment stats ──
  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });
  const payStudent = [...bayarList].filter(b=>b.siswaId===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  let outstanding = 0;
  if(s.billingType==='monthly'){
    const sessionMonths=new Set();
    attHadir.forEach(a=>{ const d=new Date(a.tanggal); sessionMonths.add(d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')); });
    const paidMonths=new Set();
    payStudent.filter(b=>b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{ const p=parsePeriodeToYearMonth(b.periode||''); if(p) paidMonths.add(p.y+'-'+p.m.toString().padStart(2,'0')); });
    sessionMonths.forEach(ym=>{ if(!paidMonths.has(ym)) outstanding+=(s.feeMonthly||0); });
  } else {
    const unpaidCount=attHadir.filter(a=>!paidSesiIds.has(a.id)).length;
    outstanding=unpaidCount*(s.feePerSesi||0);
  }
  const totalPaid=payStudent.reduce((sum,b)=>sum+b.jumlah,0);

  // ── Evaluation stats ──
  const evalStudent=[...evaluasiList].filter(e=>e.siswaId===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const avgScore=evalStudent.length?Math.round(evalStudent.reduce((s,e)=>s+Number(e.nilai||0),0)/evalStudent.length):null;
  const scoreColor=avgScore===null?'var(--muted)':avgScore>=80?'var(--green)':avgScore>=60?'var(--yellow)':'var(--red)';
  const lastEval=evalStudent[0];

  // ── Lessons ──
  const lessonStudent=materiList.filter(m=>m.targetSiswa===id||m.targetSiswa==='Semua'||!m.targetSiswa).sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,4);

  // ── Attendance bar (last 20 sessions) ──
  const recentAtt=[...attAll].sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,20).reverse();
  const attBar=recentAtt.map(a=>{
    const c=a.status==='Hadir'?'var(--green)':a.status==='Izin'?'var(--yellow)':'var(--red)';
    return `<div class="sp-att-dot" style="background:${c}" title="${tglFmt(a.tanggal)} · ${a.status}"></div>`;
  }).join('');

  document.getElementById('sp-content').innerHTML = `
    <!-- Header -->
    <div class="sp-header">
      <div class="sp-avatar">${(s.nick||s.nama).charAt(0).toUpperCase()}</div>
      <div>
        <div class="sp-name">${s.nama}${s.nick?` <span style="font-size:0.8rem;opacity:0.8">(${s.nick})</span>`:''}</div>
        <div class="sp-meta">${s.kelas||'—'} · ${s.level||'—'}${s.hari?' · '+s.hari:''}</div>
        <div class="sp-meta" style="margin-top:4px">${s.namaOrtu?'👨‍👩‍👦 '+s.namaOrtu:''} ${s.hp?'· 📱 '+s.hp:''}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-family:'Fredoka One',sans-serif;font-size:1.8rem;font-weight:800;color:#fff;line-height:1">${attRate}%</div>
        <div style="font-size:0.7rem;color:rgba(255,255,255,0.7)">Attendance</div>
      </div>
    </div>

    <!-- Attendance -->
    <div class="sp-section">
      <div class="sp-section-title">📋 Attendance</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
        <div style="background:rgba(0,214,143,0.1);border:1px solid rgba(0,214,143,0.25);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Fredoka One',sans-serif;font-size:1.4rem;font-weight:800;color:var(--green)">${attHadir.length}</div>
          <div style="font-size:0.7rem;color:var(--muted);font-weight:700">Present</div>
        </div>
        <div style="background:rgba(255,179,71,0.1);border:1px solid rgba(255,179,71,0.25);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Fredoka One',sans-serif;font-size:1.4rem;font-weight:800;color:var(--yellow)">${attIzin.length}</div>
          <div style="font-size:0.7rem;color:var(--muted);font-weight:700">Excused</div>
        </div>
        <div style="background:rgba(255,79,109,0.1);border:1px solid rgba(255,79,109,0.25);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Fredoka One',sans-serif;font-size:1.4rem;font-weight:800;color:var(--red)">${attAlpha.length}</div>
          <div style="font-size:0.7rem;color:var(--muted);font-weight:700">Absent</div>
        </div>
      </div>
      ${recentAtt.length?`<div style="font-size:0.7rem;color:var(--muted);margin-bottom:4px;font-weight:600">Last ${recentAtt.length} sessions</div><div class="sp-att-bar">${attBar}</div>`:''}
    </div>

    <!-- Payment -->
    <div class="sp-section">
      <div class="sp-section-title">💰 Payment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div style="background:rgba(0,214,143,0.08);border:1px solid rgba(0,214,143,0.2);border-radius:10px;padding:10px">
          <div style="font-size:0.7rem;color:var(--muted);font-weight:700;margin-bottom:3px">TOTAL PAID</div>
          <div style="font-family:'Fredoka One',sans-serif;font-size:1rem;font-weight:800;color:var(--green)">${fmt(totalPaid)}</div>
        </div>
        <div style="background:${outstanding>0?'rgba(255,79,109,0.08)':'rgba(0,214,143,0.08)'};border:1px solid ${outstanding>0?'rgba(255,79,109,0.2)':'rgba(0,214,143,0.2)'};border-radius:10px;padding:10px">
          <div style="font-size:0.7rem;color:var(--muted);font-weight:700;margin-bottom:3px">OUTSTANDING</div>
          <div style="font-family:'Fredoka One',sans-serif;font-size:1rem;font-weight:800;color:${outstanding>0?'var(--red)':'var(--green)'}">${outstanding>0?fmt(outstanding):'✅ Clear'}</div>
        </div>
      </div>
      ${payStudent.slice(0,3).map(b=>`
        <div class="sp-pay-item">
          <div>
            <div style="font-weight:700">${b.periode||tglFmt(b.tanggal)}</div>
            <div style="font-size:0.72rem;color:var(--muted)">${tglFmt(b.tanggal)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:var(--green)">${fmt(b.jumlah)}</div>
            ${b.status==='Lunas'?chip('Paid','chip-green'):b.status==='Cicil'?chip('Partial','chip-yellow'):chip('Unpaid','chip-red')}
          </div>
        </div>`).join('')}
      ${payStudent.length===0?`<div style="color:var(--muted);font-size:0.83rem;padding:8px 0">No payment records.</div>`:''}
    </div>

    <!-- Evaluation -->
    <div class="sp-section">
      <div class="sp-section-title">⭐ Evaluation</div>
      ${avgScore!==null?`
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:10px">
        <div style="text-align:center">
          <div style="font-family:'Fredoka One',sans-serif;font-size:2rem;font-weight:800;color:${scoreColor};line-height:1">${avgScore}</div>
          <div style="font-size:0.68rem;color:var(--muted);font-weight:700">AVG SCORE</div>
        </div>
        <div style="flex:1">
          <div class="pbar-wrap"><div class="pbar-fill" style="width:${avgScore}%;background:${scoreColor}"></div></div>
          <div style="font-size:0.72rem;color:var(--muted);margin-top:4px">${evalStudent.length} evaluation(s) · Latest: ${lastEval?tglFmt(lastEval.tanggal):'-'}</div>
        </div>
      </div>`:''}
      ${evalStudent.slice(0,3).map(e=>`
        <div class="sp-eval-item">
          <div>
            <div style="font-weight:700;font-size:0.82rem">${tglFmt(e.tanggal)}</div>
            <div style="font-size:0.72rem;color:var(--muted)">${e.progress||e.catatan||'—'}</div>
          </div>
          <div style="text-align:right;display:flex;align-items:center;gap:8px">
            <span>${stars(e.rating)}</span>
            <span class="sp-score" style="color:${Number(e.nilai)>=80?'var(--green)':Number(e.nilai)>=60?'var(--yellow)':'var(--red)'}">${e.nilai||'-'}</span>
          </div>
        </div>`).join('')}
      ${evalStudent.length===0?`<div style="color:var(--muted);font-size:0.83rem;padding:8px 0">No evaluations yet.</div>`:''}
    </div>

    <!-- Lessons -->
    <div class="sp-section" style="margin-bottom:4px">
      <div class="sp-section-title">📚 Recent Lessons</div>
      ${lessonStudent.length?lessonStudent.map(m=>`
        <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border)">
          <div class="lesson-dot ${m.status==='Selesai'?'done':'planned'}" style="margin-top:6px;flex-shrink:0"></div>
          <div>
            <div style="font-weight:700;font-size:0.85rem">${m.topik}</div>
            <div style="font-size:0.72rem;color:var(--muted)">${tglFmt(m.tanggal)} · ${m.status==='Selesai'?'Completed':'Planned'}</div>
          </div>
        </div>`).join('')
      :`<div style="color:var(--muted);font-size:0.83rem;padding:8px 0">No lessons recorded.</div>`}
    </div>
  `;

  document.getElementById('modal-student-profile').dataset.spId = id;
  openModal('modal-student-profile');
}

// ── Build print-ready HTML for Student Profile ──
function buildSPRenderHTML(id){
  const s = siswaList.find(x=>x.id===id);
  if(!s) return '';

  const attAll   = absensiList.filter(a=>a.siswaId===id);
  const attHadir = attAll.filter(a=>a.status==='Hadir');
  const attIzin  = attAll.filter(a=>a.status==='Izin');
  const attAlpha = attAll.filter(a=>a.status==='Alpha');
  const attRate  = attAll.length ? Math.round(attHadir.length/attAll.length*100) : 0;

  const paidSesiIds = new Set();
  bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(sid=>paidSesiIds.add(sid)); });
  const payStudent = [...bayarList].filter(b=>b.siswaId===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  let outstanding = 0;
  if(s.billingType==='monthly'){
    const sessionMonths=new Set();
    attHadir.forEach(a=>{ const d=new Date(a.tanggal); sessionMonths.add(d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')); });
    const paidMonths=new Set();
    payStudent.filter(b=>b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{ const p=parsePeriodeToYearMonth(b.periode||''); if(p) paidMonths.add(p.y+'-'+p.m.toString().padStart(2,'0')); });
    sessionMonths.forEach(ym=>{ if(!paidMonths.has(ym)) outstanding+=(s.feeMonthly||0); });
  } else {
    outstanding = attHadir.filter(a=>!paidSesiIds.has(a.id)).length * (s.feePerSesi||0);
  }
  const totalPaid = payStudent.reduce((sum,b)=>sum+b.jumlah,0);

  const evalStudent = [...evaluasiList].filter(e=>e.siswaId===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const avgScore = evalStudent.length ? Math.round(evalStudent.reduce((acc,e)=>acc+Number(e.nilai||0),0)/evalStudent.length) : null;
  const scoreColor = avgScore===null?'#999':avgScore>=80?'#00b371':avgScore>=60?'#f59e0b':'#e11d48';

  const lessonStudent = materiList.filter(m=>m.targetSiswa===id||m.targetSiswa==='Semua'||!m.targetSiswa).sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,5);
  const recentAtt = [...attAll].sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,20).reverse();

  // Attendance bar — use table cells for reliable html2canvas rendering
  const barCellW = Math.floor(460/Math.max(recentAtt.length,1));
  const attBarHtml = recentAtt.map(a=>{
    const c=a.status==='Hadir'?'#00b371':a.status==='Izin'?'#f59e0b':'#e11d48';
    return `<td style="padding:0 1px"><div style="width:${barCellW-2}px;height:8px;border-radius:3px;background:${c}"></div></td>`;
  }).join('');

  const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const W = 560; // panel width
  const P = 28;  // padding
  const IW = W - P*2; // inner width

  // Helper: two-col table row
  const row2=(left,right)=>`<tr>
    <td style="width:50%;padding:0 4px 8px 0;vertical-align:top">${left}</td>
    <td style="width:50%;padding:0 0 8px 4px;vertical-align:top">${right}</td>
  </tr>`;

  const statBox=(bg,border,numColor,num,label)=>
    `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:26px;font-weight:800;color:${numColor};line-height:1.1">${num}</div>
      <div style="font-size:11px;color:#888;font-weight:700;margin-top:2px">${label}</div>
    </div>`;

  const sectionTitle=(icon,label)=>
    `<div style="font-size:11px;font-weight:800;color:#666;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e0e0e0;padding-bottom:8px;margin-bottom:14px;margin-top:6px">${icon} ${label}</div>`;

  const payRow=(b)=>
    `<div style="margin-bottom:6px;padding:8px 10px;background:#f7f8ff;border-radius:8px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="vertical-align:top;padding:0">
          <div style="font-size:13px;font-weight:700;color:#1a1f36">${b.periode||tglFmt(b.tanggal)}</div>
          <div style="font-size:11px;color:#999;margin-top:1px">${tglFmt(b.tanggal)}</div>
        </td>
        <td style="text-align:right;vertical-align:top;padding:0;white-space:nowrap">
          <div style="font-size:13px;font-weight:800;color:#00b371">${fmt(b.jumlah)}</div>
          <div style="font-size:11px;font-weight:700;color:${b.status==='Lunas'?'#00b371':b.status==='Cicil'?'#f59e0b':'#e11d48'}">${b.status==='Lunas'?'Paid':b.status==='Cicil'?'Partial':'Unpaid'}</div>
        </td>
      </tr></table>
    </div>`;

  const evalRow=(e)=>{
    const nVal=Number(e.nilai)||0;
    const nColor=nVal>=80?'#00b371':nVal>=60?'#f59e0b':'#e11d48';
    const ratingBar=Array.from({length:5},(_,i)=>
      `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:2px;background:${i<(Number(e.rating)||0)?'#f59e0b':'#e0e0e0'}"></span>`
    ).join('');
    return `<div style="margin-bottom:6px;padding:8px 10px;background:#f7f8ff;border-radius:8px">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="vertical-align:top;padding:0">
          <div style="font-size:13px;font-weight:700;color:#1a1f36">${tglFmt(e.tanggal)}</div>
          <div style="font-size:11px;color:#999;margin-top:1px;max-width:280px">${(e.progress||e.catatan||'—').slice(0,80)}</div>
        </td>
        <td style="text-align:right;vertical-align:middle;padding:0;white-space:nowrap;padding-left:8px">
          <div>${ratingBar}</div>
          <div style="font-size:20px;font-weight:800;color:${nColor};margin-top:2px">${e.nilai||'-'}</div>
        </td>
      </tr></table>
    </div>`;
  };

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1f36;background:#fff;width:${W}px;padding:${P}px;box-sizing:border-box">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#6c63ff 0%,#a78bfa 100%);border-radius:14px;padding:20px;margin-bottom:20px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="width:60px;vertical-align:middle;padding:0 14px 0 0">
          <div style="width:54px;height:54px;border-radius:12px;background:rgba(255,255,255,0.22);border:2px solid rgba(255,255,255,0.4);text-align:center;line-height:54px;font-size:24px;font-weight:800;color:#fff">${(s.nick||s.nama).charAt(0).toUpperCase()}</div>
        </td>
        <td style="vertical-align:middle;padding:0">
          <div style="font-size:17px;font-weight:800;color:#fff;white-space:normal;word-break:normal;word-spacing:normal">${s.nama.replace(/ /g,'\u00a0')}${s.nick?' <span style="font-size:13px;opacity:0.85">('+s.nick+')</span>':''}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.82);margin-top:3px">${s.kelas||'—'} &nbsp;&middot;&nbsp; ${s.level||'—'}${s.hari?' &nbsp;&middot;&nbsp; '+s.hari:''}</div>
          ${s.namaOrtu?`<div style="font-size:11px;color:rgba(255,255,255,0.72);margin-top:3px">${s.namaOrtu}${s.hp?' &nbsp;&middot;&nbsp; '+s.hp:''}</div>`:''}
        </td>
        <td style="text-align:right;vertical-align:middle;padding:0;white-space:nowrap;padding-left:12px">
          <div style="font-size:36px;font-weight:800;color:#fff;line-height:1">${attRate}%</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px">Attendance</div>
        </td>
      </tr></table>
    </div>

    <!-- ATTENDANCE -->
    <div style="margin-bottom:24px">
      ${sectionTitle('[ A ]','Attendance')}
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>
        <td style="width:33%;padding:0 4px 0 0">${statBox('#f0fdf4','#bbf7d0','#00b371',attHadir.length,'Present')}</td>
        <td style="width:33%;padding:0 2px">${statBox('#fffbeb','#fde68a','#f59e0b',attIzin.length,'Excused')}</td>
        <td style="width:33%;padding:0 0 0 4px">${statBox('#fff1f2','#fecdd3','#e11d48',attAlpha.length,'Absent')}</td>
      </tr></table>
      ${recentAtt.length?`
        <div style="font-size:11px;color:#999;font-weight:600;margin-bottom:4px">Last ${recentAtt.length} sessions</div>
        <table style="width:100%;border-collapse:collapse"><tr>${attBarHtml}</tr></table>`:''}
    </div>

    <!-- PAYMENT -->
    <div style="margin-bottom:24px">
      ${sectionTitle('[ $ ]','Payment')}
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>
        <td style="width:50%;padding:0 4px 0 0">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px">
            <div style="font-size:10px;color:#888;font-weight:700;margin-bottom:3px">TOTAL PAID</div>
            <div style="font-size:15px;font-weight:800;color:#00b371">${fmt(totalPaid)}</div>
          </div>
        </td>
        <td style="width:50%;padding:0 0 0 4px">
          <div style="background:${outstanding>0?'#fff1f2':'#f0fdf4'};border:1px solid ${outstanding>0?'#fecdd3':'#bbf7d0'};border-radius:10px;padding:10px">
            <div style="font-size:10px;color:#888;font-weight:700;margin-bottom:3px">OUTSTANDING</div>
            <div style="font-size:15px;font-weight:800;color:${outstanding>0?'#e11d48':'#00b371'}">${outstanding>0?fmt(outstanding):'Clear'}</div>
          </div>
        </td>
      </tr></table>
      ${payStudent.slice(0,3).map(b=>payRow(b)).join('')}
      ${payStudent.length===0?`<div style="color:#999;font-size:12px;padding:4px 0">No payment records.</div>`:''}
    </div>

    <!-- EVALUATION -->
    <div style="margin-bottom:24px">
      ${sectionTitle('[ * ]','Evaluation')}
      ${avgScore!==null?`
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>
        <td style="width:64px;text-align:center;padding:0 12px 0 0;vertical-align:middle">
          <div style="font-size:36px;font-weight:800;color:${scoreColor};line-height:1">${avgScore}</div>
          <div style="font-size:10px;color:#888;font-weight:700;margin-top:2px">AVG SCORE</div>
        </td>
        <td style="vertical-align:middle;padding:0">
          <div style="background:#ebebeb;border-radius:20px;height:10px;overflow:hidden;width:100%">
            <div style="width:${avgScore}%;height:10px;background:${scoreColor};border-radius:20px"></div>
          </div>
          <div style="font-size:11px;color:#999;margin-top:5px">${evalStudent.length} evaluation(s)</div>
        </td>
      </tr></table>`:''}
      ${evalStudent.slice(0,3).map(e=>evalRow(e)).join('')}
      ${evalStudent.length===0?`<div style="color:#999;font-size:12px;padding:4px 0">No evaluations yet.</div>`:''}
    </div>

    <!-- LESSONS -->
    <div style="margin-bottom:24px">
      ${sectionTitle('[ L ]','Recent Lessons')}
      ${lessonStudent.length ? lessonStudent.map(m=>`
        <table style="width:100%;border-collapse:collapse;margin-bottom:0"><tr>
          <td style="width:14px;vertical-align:top;padding:8px 10px 8px 0;border-bottom:1px solid #f0f0f0">
            <div style="width:10px;height:10px;border-radius:50%;background:${m.status==='Selesai'?'#00b371':'#a78bfa'};margin-top:3px"></div>
          </td>
          <td style="vertical-align:top;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <div style="font-size:13px;font-weight:700;color:#1a1f36">${m.topik}</div>
            <div style="font-size:11px;color:#999;margin-top:2px">${tglFmt(m.tanggal)} &nbsp;&middot;&nbsp; ${m.status==='Selesai'?'Completed':'Planned'}</div>
          </td>
        </tr></table>`).join('')
      : `<div style="color:#999;font-size:12px;padding:4px 0">No lessons recorded.</div>`}
    </div>

    <!-- FOOTER -->
    <div style="text-align:center;padding-top:16px;border-top:2px dashed #d8d8d8;margin-top:8px;font-size:11px;color:#bbb;line-height:1.8">
      Generated on ${now} &nbsp;&middot;&nbsp; <span style="color:#6c63ff;font-weight:700">LittleLume English Course</span>
    </div>

  </div>`;
}

// ── Render profile to canvas ──
async function _renderSPCanvas(id){
  const panel = document.getElementById('sp-render-panel');
  panel.innerHTML = buildSPRenderHTML(id);
  await new Promise(r=>setTimeout(r,300));
  const canvas = await html2canvas(panel, {
    scale:2,
    useCORS:true,
    backgroundColor:'#ffffff',
    width:560,
    windowWidth:560,
    logging:false
  });
  panel.innerHTML='';
  return canvas;
}

// ── Export dispatcher ──
async function exportSP(type){
  const id = document.getElementById('modal-student-profile').dataset.spId;
  const s  = siswaList.find(x=>x.id===id);
  if(!s) return;
  const safeName = s.nama.replace(/\s+/g,'-');

  if(type==='png'){
    showToast('Generating PNG…','info',2500);
    const canvas = await _renderSPCanvas(id);
    const a = document.createElement('a');
    a.download = `profile-${safeName}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('PNG downloaded!','success');

  } else if(type==='pdf'){
    showToast('Generating PDF…','info',2500);
    const canvas = await _renderSPCanvas(id);
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pxW = canvas.width / 2;   // scale:2 → divide by 2 to get CSS px
    const pxH = canvas.height / 2;
    const pdf = new jsPDF({ orientation:'portrait', unit:'px', format:[pxW, pxH], hotfixes:['px_scaling'] });
    pdf.addImage(imgData,'PNG',0,0,pxW,pxH);
    pdf.save(`profile-${safeName}.pdf`);
    showToast('PDF downloaded!','success');

  } else if(type==='wa'){
    // Build plain-text summary for WA
    const attAll   = absensiList.filter(a=>a.siswaId===id);
    const attHadir = attAll.filter(a=>a.status==='Hadir');
    const attIzin  = attAll.filter(a=>a.status==='Izin');
    const attAlpha = attAll.filter(a=>a.status==='Alpha');
    const attRate  = attAll.length ? Math.round(attHadir.length/attAll.length*100) : 0;
    const paidSesiIds=new Set(); bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });
    const payStudent=[...bayarList].filter(b=>b.siswaId===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
    const totalPaid=payStudent.reduce((sum,b)=>sum+b.jumlah,0);
    let outstanding=0;
    if(s.billingType==='monthly'){
      const sessionMonths=new Set(); attHadir.forEach(a=>{ const d=new Date(a.tanggal); sessionMonths.add(d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')); });
      const paidMonths=new Set(); payStudent.filter(b=>b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{ const p=parsePeriodeToYearMonth(b.periode||''); if(p) paidMonths.add(p.y+'-'+p.m.toString().padStart(2,'0')); });
      sessionMonths.forEach(ym=>{ if(!paidMonths.has(ym)) outstanding+=(s.feeMonthly||0); });
    } else {
      outstanding=attHadir.filter(a=>!paidSesiIds.has(a.id)).length*(s.feePerSesi||0);
    }
    const evalStudent=[...evaluasiList].filter(e=>e.siswaId===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
    const avgScore=evalStudent.length?Math.round(evalStudent.reduce((s,e)=>s+Number(e.nilai||0),0)/evalStudent.length):null;
    const lastEval=evalStudent[0];

    const hp=(s.hp||'').replace(/\D/g,'');
    const now=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const text=
`📋 *Student Report — LittleLume English Course*
📅 ${now}

👤 *${s.nama}*${s.nick?' ('+s.nick+')':''}
🏫 ${s.kelas||'—'} · ${s.level||'—'}
📆 Schedule: ${s.hari||'—'}

━━━━━━━━━━━━━━━━━
📋 *ATTENDANCE*
✅ Present : ${attHadir.length} sessions
📝 Excused : ${attIzin.length} sessions
❌ Absent  : ${attAlpha.length} sessions
📊 Rate    : ${attRate}%

━━━━━━━━━━━━━━━━━
💰 *PAYMENT*
Total Paid  : ${fmt(totalPaid)}
Outstanding : ${outstanding>0?fmt(outstanding):'✅ Clear'}

━━━━━━━━━━━━━━━━━
⭐ *EVALUATION*
Avg Score : ${avgScore!==null?avgScore+'/100':'—'}
${lastEval?'Latest   : '+tglFmt(lastEval.tanggal)+' · '+lastEval.nilai+'/100':'No evaluations yet'}

━━━━━━━━━━━━━━━━━
_LittleLume English Course_`;

    const url = hp
      ? `https://wa.me/62${hp.replace(/^0/,'')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url,'_blank');
  }
}

// ════════════════════════════════════════════════
//  MOBILE BOTTOM NAV
// ════════════════════════════════════════════════
function mbnNav(page){
  // Gunakan navigate() langsung agar lastPage tersimpan & konsisten
  navigate(page);
  // Sync mobile bottom nav active state
  document.querySelectorAll('.mbn-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.page===page);
  });
}

// Mobile bottom nav sync sudah dihandle di dalam navigate()

// ════════════════════════════════════════════════
//  ANALYTICS — KPIs & PROGRESS TRACKER
// ════════════════════════════════════════════════

function renderAnalyticsKPIs(){
  const el = document.getElementById('analytics-kpis');
  if(!el) return;
  const totalRev = bayarList.reduce((s,b)=>s+b.jumlah,0);
  const avgScore = evaluasiList.length ? Math.round(evaluasiList.reduce((s,e)=>s+Number(e.nilai||0),0)/evaluasiList.length) : 0;
  const present = absensiList.filter(a=>a.status==='Hadir').length;
  const total   = absensiList.length;
  const attRate = total ? Math.round((present/total)*100) : 0;
  const unpaidCount = siswaList.filter(s=>{
    const paidSesiIds = new Set(); bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });
    return absensiList.some(a=>a.siswaId===s.id && a.status==='Hadir' && !paidSesiIds.has(a.id));
  }).length;

  const fmtCompact = n => {
    if(n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + ' Jt';
    if(n >= 1000)    return (n/1000).toFixed(0) + ' Rb';
    return String(n);
  };

  el.innerHTML = `
    <div class="kpi-card" style="background:linear-gradient(135deg,#00d68f,#00b371);box-shadow:0 6px 20px rgba(0,214,143,0.35)"><div class="kpi-val" title="${fmt(totalRev)}">Rp ${fmtCompact(totalRev)}</div><div class="kpi-lbl">Total Revenue</div></div>
    <div class="kpi-card" style="background:linear-gradient(135deg,#a78bfa,#8b5cf6);box-shadow:0 6px 20px rgba(167,139,250,0.35)"><div class="kpi-val">${avgScore}<span style="font-size:1rem;opacity:0.75">/100</span></div><div class="kpi-lbl">Avg Score</div></div>
    <div class="kpi-card" style="background:linear-gradient(135deg,#38bdf8,#0284c7);box-shadow:0 6px 20px rgba(56,189,248,0.35)"><div class="kpi-val">${attRate}%</div><div class="kpi-lbl">Attendance Rate</div></div>
    <div class="kpi-card" style="background:${unpaidCount?'linear-gradient(135deg,#ff4f6d,#e11d48);box-shadow:0 6px 20px rgba(255,79,109,0.35)':'linear-gradient(135deg,#00d68f,#00b371);box-shadow:0 6px 20px rgba(0,214,143,0.35)'}"><div class="kpi-val">${unpaidCount}</div><div class="kpi-lbl">Students w/ Unpaid</div></div>
    <div class="kpi-card" style="background:linear-gradient(135deg,#6c63ff,#9c8fff);box-shadow:0 6px 20px rgba(108,99,255,0.35)"><div class="kpi-val">${siswaList.length}</div><div class="kpi-lbl">Total Students</div></div>
    <div class="kpi-card" style="background:linear-gradient(135deg,#ffb347,#f59e0b);box-shadow:0 6px 20px rgba(255,179,71,0.35)"><div class="kpi-val">${evaluasiList.length}</div><div class="kpi-lbl">Evaluations</div></div>
  `;
}

function renderProgressTracker(){
  const grid = document.getElementById('progress-tracker-grid');
  const empty = document.getElementById('empty-progress-tracker');
  if(!grid) return;
  grid.innerHTML = '';

  if(!siswaList.length){ empty.style.display='block'; return; }
  empty.style.display='none';

  siswaList.forEach(siswa=>{
    const evals = evaluasiList.filter(e=>e.siswaId===siswa.id).sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
    const att   = absensiList.filter(a=>a.siswaId===siswa.id);
    const present = att.filter(a=>a.status==='Hadir').length;
    const attRate = att.length ? Math.round((present/att.length)*100) : 0;
    const avgScore = evals.length ? Math.round(evals.reduce((s,e)=>s+Number(e.nilai||0),0)/evals.length) : null;

    // Trend: compare last 3 vs first 3
    let trend = 'neu';
    if(evals.length >= 4){
      const mid = Math.floor(evals.length/2);
      const earlyAvg = evals.slice(0,mid).reduce((s,e)=>s+Number(e.nilai||0),0)/mid;
      const lateAvg  = evals.slice(-mid).reduce((s,e)=>s+Number(e.nilai||0),0)/mid;
      trend = lateAvg > earlyAvg+3 ? 'up' : lateAvg < earlyAvg-3 ? 'dn' : 'neu';
    }

    const latEval = evals[evals.length-1];
    const scoreClass = avgScore>=80 ? 's-good' : avgScore>=60 ? 's-ok' : avgScore!==null ? 's-bad' : 's-ok';

    // Mini score chart sparkline data
    const sparkData = evals.slice(-8).map(e=>Number(e.nilai||0));

    const card = document.createElement('div');
    card.className = 'progress-card';
    card.style.marginBottom = '14px';

    card.innerHTML = `
      <div class="progress-card-header">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="student-avatar-big">${(siswa.nick||siswa.nama).charAt(0).toUpperCase()}</div>
          <div style="flex:1">
            <div style="font-weight:800;font-size:1rem">${siswa.nama}${siswa.nick?` <span style="font-size:0.8rem;color:var(--muted)">(${siswa.nick})</span>`:''}</div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">${siswa.level} · ${siswa.kelas||'—'}</div>
          </div>
          ${avgScore!==null ? `<div class="score-badge ${scoreClass}" style="font-size:1.1rem">${avgScore}</div>` : ''}
          <div class="trend-mini ${trend==='up'?'trend-up trend-arrow-up':trend==='dn'?'trend-dn trend-arrow-dn':'trend-neu'}">${trend==='up'?'Improving':trend==='dn'?'Declining':'Stable'}</div>
        </div>
      </div>
      <div class="progress-card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px">
          <div>
            <div class="skill-bar">
              <div class="skill-bar-label"><span>📋 Attendance</span><span>${attRate}% (${present}/${att.length})</span></div>
              <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${attRate}%;background:${attRate>=80?'var(--green)':attRate>=60?'var(--yellow)':'var(--red)'}"></div></div>
            </div>
            <div class="skill-bar">
              <div class="skill-bar-label"><span>⭐ Avg Score</span><span>${avgScore!==null?avgScore+'/100':'—'}</span></div>
              <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${avgScore||0}%;background:${(avgScore||0)>=80?'var(--green)':(avgScore||0)>=60?'var(--yellow)':'var(--red)'}"></div></div>
            </div>
            <div class="skill-bar">
              <div class="skill-bar-label"><span>📝 Evaluations</span><span>${evals.length} total</span></div>
              <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${Math.min(100,evals.length*10)}%;background:var(--purple)"></div></div>
            </div>
          </div>
          <div>
            ${latEval ? `<div style="background:var(--bg3);border-radius:10px;padding:10px;font-size:0.82rem">
              <div style="font-size:0.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:5px">Latest Eval — ${tglFmt(latEval.tanggal)}</div>
              <div style="font-weight:700">Score: <span style="color:${Number(latEval.nilai)>=80?'var(--green)':Number(latEval.nilai)>=60?'var(--yellow)':'var(--red)'}">${latEval.nilai}/100</span></div>
              ${latEval.progress ? `<div style="color:var(--muted);margin-top:5px;font-size:0.78rem">${latEval.progress.slice(0,80)}${latEval.progress.length>80?'…':''}</div>` : ''}
            </div>` : '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:16px">No evaluations yet</div>'}
          </div>
        </div>
        ${sparkData.length > 1 ? `<div style="height:40px;position:relative"><canvas id="spark-${siswa.id}" height="40"></canvas></div>` : ''}
      </div>
    `;

    grid.appendChild(card);

    // Draw sparkline
    if(sparkData.length > 1){
      requestAnimationFrame(()=>{
        const c = document.getElementById('spark-'+siswa.id);
        if(!c) return;
        c.width = c.parentElement.offsetWidth;
        c.height = 40;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height;
        const min = Math.min(...sparkData) - 5;
        const max = Math.max(...sparkData) + 5;
        const xStep = (w-20) / (sparkData.length-1);
        ctx.strokeStyle = trend==='up'?'#00d68f':trend==='dn'?'#ff4f6d':'#7c87a0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        sparkData.forEach((v,i)=>{
          const x = 10 + i*xStep;
          const y = h - ((v-min)/(max-min||1))*(h-6)-3;
          i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        });
        ctx.stroke();
        // Dots
        ctx.fillStyle = ctx.strokeStyle;
        sparkData.forEach((v,i)=>{
          const x = 10 + i*xStep;
          const y = h - ((v-min)/(max-min||1))*(h-6)-3;
          ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
        });
      });
    }
  });
}

// ════════════════════════════════════════════════
//  AI REPORT GENERATOR (calls Anthropic API)
// ════════════════════════════════════════════════
let _currentAiStudentId = null;

function getStudentContext(siswaId){
  const siswa = siswaList.find(s=>s.id===siswaId);
  if(!siswa) return null;
  const evals = evaluasiList.filter(e=>e.siswaId===siswaId).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const att   = absensiList.filter(a=>a.siswaId===siswaId);
  const pays  = bayarList.filter(b=>b.siswaId===siswaId);
  const present = att.filter(a=>a.status==='Hadir').length;
  const attRate = att.length ? Math.round((present/att.length)*100) : null;
  const avgScore = evals.length ? Math.round(evals.reduce((s,e)=>s+Number(e.nilai||0),0)/evals.length) : null;
  const latEval = evals[0];
  const latPay = pays.sort((a,b)=>b.tanggal.localeCompare(a.tanggal))[0];

  let unpaidSessions = 0;
  let unpaidMonths = 0;
  if(siswa.billingType==='monthly'){
    // Monthly: hitung bulan yang belum Lunas
    const sessionMonths = new Set();
    att.filter(a=>a.status==='Hadir').forEach(a=>{
      const d=new Date(a.tanggal);
      sessionMonths.add(d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0'));
    });
    const paidMonths = new Set();
    pays.filter(b=>b.billingType==='monthly'&&b.status==='Lunas').forEach(b=>{
      const p=parsePeriodeToYearMonth(b.periode||''); if(p) paidMonths.add(p.y+'-'+p.m.toString().padStart(2,'0'));
    });
    unpaidMonths = [...sessionMonths].filter(ym=>!paidMonths.has(ym)).length;
    unpaidSessions = unpaidMonths; // alias agar template WA tetap bisa pakai ctx.unpaidSessions
  } else {
    const paidSesiIds = new Set(); bayarList.forEach(b=>{ if(b.sesiIds) b.sesiIds.forEach(id=>paidSesiIds.add(id)); });
    unpaidSessions = att.filter(a=>a.status==='Hadir' && !paidSesiIds.has(a.id)).length;
  }

  return { siswa, evals, att, avgScore, attRate, latEval, latPay, present, unpaidSessions, unpaidMonths };
}

async function callClaudeAPI(prompt){
  const resp = await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'claude-sonnet-4-20250514',
      max_tokens:1000,
      messages:[{role:'user',content:prompt}]
    })
  });
  const data = await resp.json();
  if(data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

function setAiLoading(isLoading){
  const out = document.getElementById('ai-output');
  const actions = document.getElementById('ai-output-actions');
  const btns = document.querySelectorAll('.ai-btn');
  btns.forEach(b=>b.disabled=isLoading);
  if(isLoading){
    out.className='ai-output visible';
    out.innerHTML=`<div class="ai-loading"><div class="spin-sm"></div> Generating with AI…</div>`;
    if(actions) actions.style.display='none';
  }
}

async function aiGenerateReport(){
  const sid = document.getElementById('ai-student-select').value;
  if(!sid){ showToast('Please select a student first','warn'); return; }
  const tone = document.getElementById('ai-tone').value;
  const ctx = getStudentContext(sid);
  if(!ctx){ return; }
  setAiLoading(true);

  const toneDesc = {friendly:'friendly and warm',formal:'professional and formal',encouraging:'very encouraging and motivating'};
  const prompt = `You are a helpful English course teacher assistant writing a student progress report for parents.

Student Info:
- Name: ${ctx.siswa.nama}
- Level: ${ctx.siswa.level}
- School: ${ctx.siswa.kelas||'—'}
- Class schedule: ${ctx.siswa.hari||'—'}

Performance Data:
- Average Score: ${ctx.avgScore!==null?ctx.avgScore+'/100':'No score yet'}
- Attendance Rate: ${ctx.attRate!==null?ctx.attRate+'% ('+ctx.present+'/'+ctx.att.length+' sessions)':'No attendance yet'}
- Total Evaluations: ${ctx.evals.length}
${ctx.latEval ? `- Latest Evaluation (${ctx.latEval.tanggal}): Score ${ctx.latEval.nilai}/100, Rating ${ctx.latEval.rating}/5 stars
  - Progress: ${ctx.latEval.progress||'(not recorded)'}
  - Notes: ${ctx.latEval.catatan||'(none)'}` : '- No recent evaluation'}
${ctx.unpaidSessions > 0 ? `- Note: ${ctx.unpaidSessions} unpaid session(s)` : ''}

Write a ${toneDesc[tone]} progress report for the parent in English. 
Include: greeting, summary of performance, attendance, strengths, areas to improve, recommendation.
Keep it concise (150-200 words). End with a warm closing.
Format it ready to copy and send via WhatsApp (use *bold* for WhatsApp, no markdown headers).`;

  try{
    const result = await callClaudeAPI(prompt);
    const out = document.getElementById('ai-output');
    out.className='ai-output visible';
    out.textContent = result;
    const actions = document.getElementById('ai-output-actions');
    if(actions) actions.style.display='block';
    _currentAiStudentId = sid;
    showToast('✨ AI report generated!','success');
  } catch(e){
    const out = document.getElementById('ai-output');
    out.className='ai-output visible';
    out.textContent = '❌ Failed: '+e.message+'\n\nNote: This feature requires the app to be running in a context where the Anthropic API is accessible.';
    showToast('AI generation failed','error');
  }
}

async function aiGenerateWAMessage(){
  const sid = document.getElementById('ai-student-select').value;
  if(!sid){ showToast('Please select a student first','warn'); return; }
  const ctx = getStudentContext(sid);
  if(!ctx){ return; }
  setAiLoading(true);

  const prompt = `You are a friendly English course teacher writing a short WhatsApp message to a parent.

Student: ${ctx.siswa.nama} (level: ${ctx.siswa.level})
Average score: ${ctx.avgScore||'N/A'}/100
Attendance: ${ctx.attRate||'N/A'}%
Latest note: ${ctx.latEval?.progress||ctx.latEval?.catatan||'Good progress'}
${ctx.unpaidSessions>0?`Unpaid sessions: ${ctx.unpaidSessions}`:''}

Write a friendly, SHORT (max 80 words) WhatsApp message in English to the parent.
Start with "Hello" and use *bold* formatting for important parts.
Be warm and encouraging. Sign off as "LittleLume English Course".`;

  try{
    const result = await callClaudeAPI(prompt);
    const out = document.getElementById('ai-output');
    out.className='ai-output visible';
    out.textContent = result;
    const actions = document.getElementById('ai-output-actions');
    if(actions) actions.style.display='block';
    _currentAiStudentId = sid;
    showToast('✨ WA message generated!','success');
  } catch(e){
    const out = document.getElementById('ai-output');
    out.className='ai-output visible';
    out.textContent = '❌ Failed: '+e.message;
    showToast('AI generation failed','error');
  }
}

async function aiGenerateAllReports(){
  if(!siswaList.length){ showToast('No students to generate reports for','warn'); return; }
  const tone = document.getElementById('ai-tone').value;
  const out = document.getElementById('ai-output');
  out.className='ai-output visible';
  const actions = document.getElementById('ai-output-actions');
  let results = '';
  let count = 0;
  for(const siswa of siswaList.slice(0,5)){
    document.querySelectorAll('.ai-btn').forEach(b=>b.disabled=true);
    out.innerHTML=`<div class="ai-loading"><div class="spin-sm"></div> Generating for ${siswa.nama} (${++count}/${Math.min(siswaList.length,5)})…</div>`;
    const ctx = getStudentContext(siswa.id);
    if(!ctx) continue;
    try{
      const prompt = `Write a 60-word friendly English progress summary for a parent about their child's English class progress.
Student: ${siswa.nama}, Level: ${siswa.level}
Score avg: ${ctx.avgScore||'N/A'}/100, Attendance: ${ctx.attRate||'N/A'}%
Latest note: ${ctx.latEval?.progress||'Good progress'}
Use *bold* for WhatsApp. Sign as LittleLume English Course.`;
      const r = await callClaudeAPI(prompt);
      results += `━━ ${siswa.nama} ━━\n${r}\n\n`;
    } catch(e){ results += `━━ ${siswa.nama} ━━\n[Error: ${e.message}]\n\n`; }
  }
  out.textContent = results || 'No results';
  document.querySelectorAll('.ai-btn').forEach(b=>b.disabled=false);
  if(actions) actions.style.display='block';
  if(siswaList.length > 5) showToast(`Generated for first 5 students (${siswaList.length} total)`,'info');
  else showToast('✨ All reports generated!','success');
}

function aiSendWA(){
  const text = document.getElementById('ai-output').textContent;
  const sid = _currentAiStudentId;
  const siswa = siswaList.find(s=>s.id===sid);
  const hp = (siswa?.hp||'').replace(/\D/g,'');
  const url = hp ? `https://wa.me/62${hp.replace(/^0/,'')}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
}

// Sync ai-student-select with r-siswa
function updateAISelect(){
  const el = document.getElementById('ai-student-select');
  if(!el) return;
  el.innerHTML = '<option value="">-- Choose student --</option>'+siswaList.map(s=>`<option value="${s.id}">${s.nama}${s.nick?' ('+s.nick+')':''}</option>`).join('');
  const watEl = document.getElementById('wat-student');
  if(watEl) watEl.innerHTML = '<option value="">-- Select Student --</option>'+siswaList.map(s=>`<option value="${s.id}">${s.nama}${s.nick?' ('+s.nick+')':''}</option>`).join('');
}

// ════════════════════════════════════════════════
//  WA TEMPLATE BUILDER
// ════════════════════════════════════════════════
let _currentWaTemplate = 'progress';

function setWaTemplate(type){
  _currentWaTemplate = type;
  document.querySelectorAll('.wa-chip').forEach(c=>c.classList.remove('active'));
  const el = document.getElementById('wat-'+type);
  if(el) el.classList.add('active');
  buildWaTemplate();
}

function buildWaTemplate(){
  const sid = document.getElementById('wat-student')?.value;
  const preview = document.getElementById('wa-preview');
  if(!preview) return;
  if(!sid){ preview.textContent = 'Select a student to preview the message…'; return; }
  const siswa = siswaList.find(s=>s.id===sid);
  if(!siswa){ return; }
  const ctx = getStudentContext(sid);
  const now = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  const ortu = siswa.namaOrtu || 'Parent';

  const templates = {
    progress: `Hello, ${ortu} 🙏\n\nHere is an update on *${siswa.nama}*'s learning progress at LittleLume English Course:\n\n📚 Level: *${siswa.level}*\n✏️ Average Score: *${ctx.avgScore||'—'}/100*\n📋 Attendance: *${ctx.attRate||'—'}% (${ctx.present}/${ctx.att.length} sessions)*\n${ctx.latEval?.progress?`\n📈 Progress: ${ctx.latEval.progress}\n`:''}\n${ctx.latEval?.catatan?`📝 Notes: ${ctx.latEval.catatan}\n`:''}\nOverall progress is going well! 🌟\n\n— LittleLume English Course`,
    payment: siswa.billingType==='monthly'
      ? `Hello, ${ortu} 🙏\n\nWe would like to remind you that *${siswa.nama}* has *${ctx.unpaidSessions} unpaid month(s)* of tuition.\n\nPlease make the payment at your earliest convenience. Thank you! 🙏\n\nFeel free to reply to this message if you have any questions.\n\n— LittleLume English Course`
      : `Hello, ${ortu} 🙏\n\nWe would like to remind you that *${siswa.nama}* has *${ctx.unpaidSessions} unpaid session(s)*.\n\nPlease make the payment at your earliest convenience. Thank you! 🙏\n\nFeel free to reply to this message if you have any questions.\n\n— LittleLume English Course`,
    absent: `Hello, ${ortu} 🙏\n\nWe would like to confirm that *${siswa.nama}* was absent from today's lesson session.\n\nCould you let us know the reason for the absence so we can record it properly? Thank you 🙏\n\n— LittleLume English Course`,
    schedule: `Hello, ${ortu} 🙏\n\nA reminder that *${siswa.nama}*'s class schedule is:\n\n📅 *${siswa.hari||'As agreed'}*\n\nPlease ensure your child arrives on time. If there are any changes, please inform us in advance.\n\nThank you 🙏\n\n— LittleLume English Course`,
    congrats: `Hello, ${ortu} 🌟\n\nCongratulations! *${siswa.nama}* has shown outstanding progress! 🎉\n\n✨ Latest Score: *${ctx.latEval?.nilai||'—'}/100*\n📋 Attendance: *${ctx.attRate||'—'}%*\n\nKeep up the great work! We are very proud of the achievement 💪\n\n— LittleLume English Course`
  };

  preview.textContent = templates[_currentWaTemplate] || '';
}

function sendWaTemplate(){
  const sid = document.getElementById('wat-student')?.value;
  const text = document.getElementById('wa-preview')?.textContent;
  if(!text || text.startsWith('Select')){ showToast('Generate a message first','warn'); return; }
  const siswa = siswaList.find(s=>s.id===sid);
  const hp = (siswa?.hp||'').replace(/\D/g,'');
  const url = hp ? `https://wa.me/62${hp.replace(/^0/,'')}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
}

// ════════════════════════════════════════════════
//  PATCH renderDashboard & renderAll (safe - no hoisting issue)
// ════════════════════════════════════════════════
(function(){
  const _origDash = renderDashboard;
  renderDashboard = function(){
    _origDash();
    if(document.getElementById('cal-grid')) renderCalendar();
    if(document.getElementById('dash-reminders')) renderPaymentReminders();
  };

  const _origAll = renderAll;
  renderAll = function(){
    _origAll();
    updateAISelect();
  };
})();

// ════════════════════════════════════════════════
//  PATCH saveStudent to trigger notification
// ════════════════════════════════════════════════
(function(){
  const _orig = saveStudent;
  saveStudent = function(){
    const isNew = !document.getElementById('s-id').value;
    _orig();
    if(isNew && siswaList.length > 0){
      const last = siswaList[siswaList.length-1];
      addNotif('New student added', last.nama+' added to '+currentClassName, '👤');
    }
  };
})();

// ════════════════════════════════════════════════
//  PATCH saveBulkEval to trigger confetti
// ════════════════════════════════════════════════
(function(){
  const _orig = saveBulkEval;
  saveBulkEval = async function(){
    await _orig();
    if(document.getElementById('cal-grid')) renderCalendar();
    const today = new Date().toISOString().slice(0,10);
    const perfect = evaluasiList.filter(e=>e.tanggal===today && Number(e.nilai)===100);
    if(perfect.length > 0) triggerConfetti();
  };
})();

function triggerConfetti(){
  const colors = ['#6c63ff','#ff6584','#00d68f','#ffb347','#38bdf8','#a78bfa'];
  for(let i=0;i<18;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${20+Math.random()*60}%;top:${20+Math.random()*30}%;background:${colors[i%colors.length]};animation-delay:${Math.random()*0.5}s`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1500);
  }
  showToast('🎉 Perfect score! 100/100!','success',4000);
}

// Close search on outside click
document.addEventListener('click', e=>{
  const sw = document.getElementById('global-search-wrap');
  if(sw && !sw.contains(e.target)) closeSearch();
});

// Safe DB.set post-hook — updates UI elements after any data change
// Does NOT touch sync state — Firestore handles that separately
const __origDB_set = DB.set.bind(DB);
DB.set = function(k,v){
  __origDB_set(k,v);
  // Defer UI refresh to avoid interfering with ongoing save
  setTimeout(()=>{
    try {
      if(document.getElementById('cal-grid')) renderCalendar();
      if(document.getElementById('dash-reminders')) renderPaymentReminders();
      updateMbnBadge();
    } catch(e) { /* non-critical */ }
  }, 300);
};

function updateMbnBadge(){
  // Gunakan logika yang sama dengan updateUnpaidBadge agar konsisten (handle monthly + per-session)
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
  const badge = document.getElementById('mbn-badge-payment');
  if(badge){ badge.className='mbn-badge'+(n>0?' show':''); }
}

// ════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS: Payment Integrity Validation & Repair
//  Digunakan untuk debug dan maintenance data payment
// ════════════════════════════════════════════════════════════════════════

function validatePaymentIntegrity(){
  // Check if all sesiIds in payments are valid attendance records
  let issues = [];
  
  bayarList.forEach(payment => {
    if(payment.sesiIds && payment.sesiIds.length){
      payment.sesiIds.forEach(sesiId => {
        const att = absensiList.find(a => a.id === sesiId);
        if(!att){
          issues.push({
            type: 'MISSING_ATTENDANCE',
            paymentId: payment.id,
            paymentStudent: payment.namaSiswa,
            sesiId: sesiId,
            message: `Attendance ${sesiId} not found for payment ${payment.id}`
          });
        }
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issueCount: issues.length,
    issues: issues
  };
}

function repairPaymentSessions(){
  // Remove sesiIds yang attendance-nya tidak 'Hadir' atau tidak ada
  let repaired = 0;
  
  bayarList.forEach(payment => {
    if(payment.sesiIds && payment.sesiIds.length){
      const originalLength = payment.sesiIds.length;
      payment.sesiIds = payment.sesiIds.filter(sesiId => {
        const att = absensiList.find(a => a.id === sesiId);
        return att && att.status === 'Hadir';
      });
      
      if(payment.sesiIds.length < originalLength){
        repaired++;
        console.log(`🔧 Repaired payment ${payment.id}: removed ${originalLength - payment.sesiIds.length} invalid session(s)`);
      }
    }
  });
  
  if(repaired > 0){
    DB.set('bayar', bayarList);
    renderPayment();
    showToast(`✅ Repaired ${repaired} payment record(s)`, 'success');
  } else {
    showToast('ℹ️ No repairs needed', 'info');
  }
}

