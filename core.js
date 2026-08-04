// ════════════════════════════════════════════════
//  FIREBASE INIT
// ════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDDYShhgA7hq0mV-Eg99zRPFwl0o9-yIR4",
  authDomain: "bunrey-course.firebaseapp.com",
  projectId: "bunrey-course",
  storageBucket: "bunrey-course.firebasestorage.app",
  messagingSenderId: "848186212308",
  appId: "1:848186212308:web:b2a2ca9c376378dd562041",
  measurementId: "G-VHBE747MSE"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Firestore settings: longer timeout, explicit network ──
db.settings({ merge: true });

// ── Force Firestore to go online (fixes offline-on-load issue) ──
db.enableNetwork().catch(e => console.warn('enableNetwork:', e));

// ── Persist login across refresh & browser close ──
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch(e => console.error('Persistence error:', e));

let currentUser = null;
let userDocRef  = null;

// ════════════════════════════════════════════════
//  CLASS STATE
// ════════════════════════════════════════════════
let currentClassId   = null;   // e.g. 'class_abc123'
let currentClassName = '';
let classesList      = [];     // [{id, name, schedule, color, createdAt}]

// Firestore path for class data
function classDataRef(classId){
  return db.collection('workspace').doc(classId);
}

// ════════════════════════════════════════════════
//  WHITELIST
// ════════════════════════════════════════════════
const ALLOWED_EMAILS = [];
function isEmailAllowed(email){
  if(!email) return false;
  return ALLOWED_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
}

// ════════════════════════════════════════════════
//  SYNC INDICATOR
// ════════════════════════════════════════════════
function setSyncing(){ 
  document.getElementById('sync-dot').className='sync-dot syncing'; 
  document.getElementById('sync-label').textContent='Saving…'; 
}
function setSynced() { 
  document.getElementById('sync-dot').className='sync-dot';         
  document.getElementById('sync-label').textContent='Synced'; 
}
function setSyncErr(errMsg){
  // Only show Offline if user is actually logged in
  if(!currentUser){ 
    document.getElementById('sync-dot').className='sync-dot'; 
    document.getElementById('sync-label').textContent=''; 
    return; 
  }
  document.getElementById('sync-dot').className='sync-dot offline'; 
  const detail = errMsg ? ` (${errMsg})` : '';
  document.getElementById('sync-label').innerHTML=`Offline${detail} <span onclick="retrySync()" style="cursor:pointer;text-decoration:underline;color:var(--yellow)">Retry</span>`;
  console.error('🔴 Sync error:', errMsg);
}
async function retrySync(){
  if(!currentUser) return;
  document.getElementById('sync-label').textContent='Retrying…';
  try {
    await db.enableNetwork();
    await loadClasses();
  } catch(e) {
    setSyncErr(e.code || e.message);
  }
}

// ════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════
function signInGoogle(){
  document.getElementById('login-err').textContent='';
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e=>{
    document.getElementById('login-err').textContent='❌ ' + e.message;
  });
}
function signOutUser(){
  showModalDialog('🚪 Sign Out', 'Are you sure you want to sign out?', ()=>auth.signOut(), {
    okText:'Sign Out', cancelText:'Cancel', type:'danger'
  });
}

auth.onAuthStateChanged(async user => {
  document.getElementById('loading-screen').style.display = 'none';
  if(user){
    const allowed = await checkAccess(user);
    if(!allowed){
      await auth.signOut();
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('login-err').textContent = '⛔ Access denied. Email ' + user.email + ' is not authorized.';
      return;
    }
    currentUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('sync-status').style.display = 'flex';
    document.getElementById('sync-label').textContent = 'Connecting…';
    const chip = document.getElementById('user-chip');
    chip.style.display = 'flex';
    document.getElementById('user-name').textContent = user.displayName?.split(' ')[0] || 'Me';
    const av = document.getElementById('user-avatar');
    if(user.photoURL){ av.src=user.photoURL; av.style.background='none'; }
    else { av.src=''; av.textContent=user.displayName?.[0]||'U'; }
    // Init calendar with correct current date immediately
    _calYear = new Date().getFullYear();
    _calMonth = new Date().getMonth();
    if(document.getElementById('cal-grid')) renderCalendar();
    // Load classes, then load first/last used class
    await loadClasses();
    console.log('✅ Logged in:', user.email);
  } else {
    if(_unsubscribeSnapshot){ _unsubscribeSnapshot(); _unsubscribeSnapshot=null; }
    currentUser = null; userDocRef = null; currentClassId = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('user-chip').style.display = 'none';
    document.getElementById('sync-status').style.display = 'none';
    document.getElementById('class-switcher').style.display = 'none';
  }
});

async function checkAccess(user){
  if(isEmailAllowed(user.email)) return true;
  try{
    const accessDoc = await db.collection('workspace').doc('access').get();
    if(accessDoc.exists){
      const data = accessDoc.data();
      if(data.owner === user.email) return true;
      const allowed = data.allowed_emails || [];
      return allowed.some(e => e.toLowerCase() === user.email.toLowerCase());
    } else {
      await db.collection('workspace').doc('access').set({
        owner: user.email,
        allowed_emails: [user.email],
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    }
  } catch(e){ console.error('Access check error:', e); return true; }
}

// ════════════════════════════════════════════════
//  CLASSES MANAGEMENT
// ════════════════════════════════════════════════
async function loadClasses(retryCount=0){
  try{
    const snap = await db.collection('workspace').doc('classes').get();
    classesList = snap.exists ? (snap.data().list || []) : [];

    // First-time migration: check if old workspace/shared exists → move to first class
    if(classesList.length === 0){
      await migrateOldWorkspace();
    }

    // If still no classes, prompt to create one
    if(classesList.length === 0){
      document.getElementById('class-switcher').style.display = 'flex';
      updateClassSwitcherUI();
      openModal('modal-classes');
      renderClassListUI();
      setSynced();
      return;
    }

    // Restore last used class from localStorage
    const lastId = localStorage.getItem('lastClassId');
    const found  = classesList.find(c=>c.id===lastId);
    await switchClass(found ? found.id : classesList[0].id);
    document.getElementById('class-switcher').style.display = 'flex';
    renderClassListUI();
  } catch(e){
    console.error('Load classes error:', e.code, e.message, e.stack);
    // Pastikan class-switcher tetap visible walau error
    document.getElementById('class-switcher').style.display = 'flex';
    if(retryCount < 2){
      setTimeout(()=> loadClasses(retryCount+1), 1500 * (retryCount+1));
      document.getElementById('sync-label').textContent = 'Reconnecting…';
    } else {
      setSyncErr(e.code || e.message);
    }
  }
}

async function migrateOldWorkspace(){
  try{
    const oldSnap = await db.collection('workspace').doc('shared').get();
    if(!oldSnap.exists) return;
    const oldData = oldSnap.data();
    if(!(oldData.siswa||[]).length && !(oldData.bayar||[]).length) return;
    // Create a default class and move data there
    const classId = 'class_' + uid();
    const newClass = { id:classId, name:'Class A', schedule:'', color:'#6c63ff', createdAt: new Date().toISOString() };
    classesList = [newClass];
    await db.collection('workspace').doc('classes').set({ list: classesList });
    await db.collection('workspace').doc(classId).set({...oldData, migratedAt: firebase.firestore.FieldValue.serverTimestamp()});
    console.log('✅ Migrated old workspace → Class A ('+classId+')');
  } catch(e){ console.error('Migration error:', e); }
}

async function saveClassesList(){
  await db.collection('workspace').doc('classes').set({ list: classesList });
}

function closeAllFormsAndModals(){
  // Tutup semua .form-panel yang sedang open
  document.querySelectorAll('.form-panel.open').forEach(p=>{
    p.classList.add('hidden');
    p.classList.remove('open');
    p.style.maxHeight = '0';
  });
  // Tutup semua .overlay yang sedang open (modal), kecuali modal-classes
  document.querySelectorAll('.overlay.open').forEach(m=>{
    if(m.id !== 'modal-classes') m.classList.remove('open');
  });
}

async function switchClass(classId){
  const cls = classesList.find(c=>c.id===classId);
  if(!cls) return;
  currentClassId   = classId;
  currentClassName = cls.name;
  userDocRef = db.collection('workspace').doc(classId);
  localStorage.setItem('lastClassId', classId);
  try {
    updateClassSwitcherUI(cls);
    renderClassListUI();
    closeAllFormsAndModals();
    siswaList=[];absensiList=[];materiList=[];evaluasiList=[];bayarList=[];scheduleList=[];
    const lastPage = localStorage.getItem('lastPage_' + classId) || 'dashboard';
    _navigateRaw('dashboard');
    renderAll(); setCurrentMonthDashFilter();
    await loadFromFirestore();
    subscribeToClassUpdates();
    closeModal('modal-classes');
    navigate(lastPage);
  } catch(e) {
    console.error('switchClass error:', e.code, e.message, e.stack);
    setSyncErr(e.code || e.message);
  }
}

function updateClassSwitcherUI(cls){
  const dot  = document.getElementById('cs-dot');
  const name = document.getElementById('cs-name');
  if(cls){ dot.style.background=cls.color||'var(--accent)'; name.textContent=cls.name; }
  else    { dot.style.background='var(--muted)'; name.textContent='Select Class'; }
}

function renderClassListUI(){
  const el = document.getElementById('class-list-ui');
  if(!el) return;
  if(!classesList.length){
    el.innerHTML='<div style="color:var(--muted);font-size:0.87rem;text-align:center;padding:12px">No classes yet. Create your first class below.</div>'; return;
  }
  el.innerHTML = classesList.map(c=>`
    <div class="class-item ${c.id===currentClassId?'active-class':''}" onclick="switchClass('${c.id}')">
      <div class="ci-color" style="background:${c.color||'#6c63ff'}"></div>
      <div class="ci-info">
        <div class="ci-name">${c.name} ${c.id===currentClassId?'<span class="chip chip-purple" style="font-size:0.65rem">Active</span>':''}</div>
        <div class="ci-meta">${c.schedule||'No schedule set'}</div>
      </div>
      <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
        <button class="btn sm icon-only" title="Edit" onclick="editClass('${c.id}')">✏️</button>
        <button class="btn danger sm icon-only" title="Delete" onclick="deleteClass('${c.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

async function createClass(){
  const name = document.getElementById('new-class-name').value.trim();
  if(!name){ infoModal('Required Field', 'Class name is required!'); return; }
  const newClass = {
    id: 'class_' + uid(),
    name,
    schedule: document.getElementById('new-class-schedule').value.trim(),
    color:    document.getElementById('new-class-color').value,
    createdAt: new Date().toISOString(),
  };
  classesList.push(newClass);
  await saveClassesList();
  document.getElementById('new-class-name').value    = '';
  document.getElementById('new-class-schedule').value= '';
  renderClassListUI();
  // Auto-switch to new class
  await switchClass(newClass.id);
  document.getElementById('class-switcher').style.display='flex';
}

async function deleteClass(classId){
  if(classesList.length<=1){ infoModal('Cannot Delete', 'You must have at least one class. Create another class first before deleting this one.'); return; }
  const cls = classesList.find(c=>c.id===classId);
  // Hitung data yang ada di kelas ini untuk warning
  const isActive = classId === currentClassId;
  const studentCount = isActive ? siswaList.length : '?';
  const payCount = isActive ? bayarList.length : '?';
  dangerModal(
    `🗑️ Delete Class "${cls?.name}"?`,
    `<strong style="color:var(--red)">All data in this class will be permanently deleted:</strong>
    <div style="background:var(--bg3);border-radius:8px;padding:10px 14px;margin:10px 0;text-align:left;line-height:2">
      ${isActive ? `👤 ${studentCount} student(s) &nbsp;·&nbsp; 💰 ${payCount} payment(s)` : 'All students, attendance, evaluations and payments'}
    </div>
    This action <strong>cannot be undone</strong>.`,
    async ()=>{
      dangerModal(
        '⚠️ Final Confirmation',
        `Type the class name to confirm: you are deleting <strong>"${cls?.name}"</strong> and all its data permanently.`,
        async ()=>{
          try{ await db.collection('workspace').doc(classId).delete(); }catch(e){ console.error(e); }
          classesList = classesList.filter(c=>c.id!==classId);
          await saveClassesList();
          renderClassListUI();
          if(classId === currentClassId){ await switchClass(classesList[0].id); }
          showToast(`✅ Class "${cls?.name}" deleted.`, 'success');
        },
        { okText:'Delete Permanently', cancelText:'Cancel' }
      );
    },
    { okText:'Yes, Delete', cancelText:'Keep It' }
  );
}

function editClass(classId){
  const cls = classesList.find(c=>c.id===classId);
  if(!cls) return;
  document.getElementById('edit-cls-id').value       = cls.id;
  document.getElementById('edit-cls-name').value     = cls.name     || '';
  document.getElementById('edit-cls-schedule').value = cls.schedule || '';
  document.getElementById('edit-cls-color').value    = cls.color    || '#6c63ff';
  openModal('modal-edit-class');
}

async function saveEditClass(){
  const id  = document.getElementById('edit-cls-id').value;
  const idx = classesList.findIndex(c=>c.id===id);
  if(idx===-1) return;
  const name = document.getElementById('edit-cls-name').value.trim();
  if(!name){ infoModal('Required Field', 'Class name is required!'); return; }
  classesList[idx].name     = name;
  classesList[idx].schedule = document.getElementById('edit-cls-schedule').value.trim();
  classesList[idx].color    = document.getElementById('edit-cls-color').value;
  await saveClassesList();
  renderClassListUI();
  if(id === currentClassId){
    currentClassName = name;
    updateClassSwitcherUI(classesList[idx]);
  }
  closeModal('modal-edit-class');
}

// ════════════════════════════════════════════════
//  WHITELIST MANAGEMENT
// ════════════════════════════════════════════════
async function getAccessList(){
  try{ const doc=await db.collection('workspace').doc('access').get(); return doc.exists?doc.data():null; }catch(e){return null;}
}
async function addAllowedEmail(email){
  if(!email||!currentUser) return;
  email=email.trim().toLowerCase();
  const doc=await db.collection('workspace').doc('access').get();
  const data=doc.data()||{};
  if(data.owner!==currentUser.email){ infoModal('Access Denied', 'Only the workspace owner can manage access.'); return; }
  const list=data.allowed_emails||[];
  if(list.includes(email)){ infoModal('Already Added', `<strong>${email}</strong> is already in the access list.`); return; }
  list.push(email);
  await db.collection('workspace').doc('access').update({allowed_emails:list});
  renderAccessPanel(); showToast('✅ '+email+' added!', 'success');
}
async function removeAllowedEmail(email){
  if(!currentUser) return;
  const doc=await db.collection('workspace').doc('access').get();
  const data=doc.data()||{};
  if(data.owner!==currentUser.email){ infoModal('Access Denied', 'Only the workspace owner can manage access.'); return; }
  if(email===data.owner){ infoModal('Cannot Remove Owner', 'The workspace owner cannot be removed from the access list.'); return; }
  const list=(data.allowed_emails||[]).filter(e=>e!==email);
  await db.collection('workspace').doc('access').update({allowed_emails:list});
  renderAccessPanel();
}
async function renderAccessPanel(){
  const panel=document.getElementById('access-panel'); if(!panel) return;
  const data=await getAccessList();
  if(!data){ panel.innerHTML='<span style="color:var(--muted)">Loading…</span>'; return; }
  const isOwner=currentUser?.email===data.owner;
  const emails=data.allowed_emails||[];
  panel.innerHTML=`
    <div style="margin-bottom:12px;font-size:0.82rem;color:var(--muted)">👑 <strong>Owner:</strong> ${data.owner} ${isOwner?'<span class="chip chip-purple" style="margin-left:6px">You</span>':''}</div>
    <div style="margin-bottom:14px">${emails.map(e=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:6px;font-size:0.87rem">
        <span>📧 ${e} ${e===data.owner?'<span class="chip chip-purple">owner</span>':''}</span>
        ${isOwner&&e!==data.owner?`<button class="btn danger sm" onclick="removeAllowedEmail('${e}')">Remove</button>`:''}
      </div>`).join('')}</div>
    ${isOwner?`<div style="display:flex;gap:8px;flex-wrap:wrap">
      <input type="email" id="new-email-input" placeholder="email@gmail.com" style="flex:1;min-width:200px">
      <button class="btn primary" onclick="addAllowedEmail(document.getElementById('new-email-input').value)">＋ Add Email</button>
    </div>`:'<div style="color:var(--muted);font-size:0.85rem">Contact the owner to add/remove users.</div>'}`;
}

// ════════════════════════════════════════════════
//  FIRESTORE DATA LAYER — CLASS-SCOPED
// ════════════════════════════════════════════════
const COLS = ['siswa','absensi','materi','evaluasi','bayar','schedules'];

async function loadFromFirestore(){
  if(!userDocRef){ return; }  // not logged in yet — silent
  try{
    setSyncing();
    const snap = await userDocRef.get();
    if(snap.exists){
      const d = snap.data();
      siswaList    = d.siswa    || [];
      absensiList  = d.absensi  || [];
      materiList   = d.materi   || [];
      evaluasiList = d.evaluasi || [];
      bayarList    = d.bayar    || [];
      scheduleList = d.schedules|| [];
    } else {
      siswaList=[];absensiList=[];materiList=[];evaluasiList=[];bayarList=[];scheduleList=[];
    }
    setSynced();
    renderAll(); setCurrentMonthDashFilter(); loadAbsensi();
  } catch(e){
    setSyncErr(e.code || e.message);
    console.error('Load error', e);
    siswaList=[];absensiList=[];materiList=[];evaluasiList=[];bayarList=[];scheduleList=[];
    renderAll(); setCurrentMonthDashFilter(); loadAbsensi();
  }
}

// ════════════════════════════════════════════════
//  REALTIME CROSS-DEVICE SYNC
// ════════════════════════════════════════════════
let _unsubscribeSnapshot = null;

// Simpan session ID unik untuk device ini.
// Setiap write menyertakan sessionId ini di dokumen Firestore.
// Snapshot yang punya sessionId sama = echo dari kita sendiri → abaikan.
const _sessionId = Math.random().toString(36).slice(2);

function _isEditFormOpen(){
  return !!document.querySelector('.form-panel.open') || !!document.getElementById('modal-payment')?.classList.contains('open');
}

function subscribeToClassUpdates(){
  if(_unsubscribeSnapshot){ _unsubscribeSnapshot(); _unsubscribeSnapshot=null; }
  if(!userDocRef) return;

  // Snapshot pertama dari onSnapshot SELALU berisi current state dokumen —
  // bukan perubahan baru. Kita sudah punya data ini dari loadFromFirestore().
  // Tandai snapshot pertama agar diabaikan.
  let _isFirstSnapshot = true;

  _unsubscribeSnapshot = userDocRef.onSnapshot(snap => {
    // Snapshot pertama: abaikan, hanya set flag ready
    if(_isFirstSnapshot){ _isFirstSnapshot = false; return; }

    // Abaikan selama ada pending write milik kita (local echo)
    if(snap.metadata.hasPendingWrites) return;
    if(!snap.exists) return;
    const d = snap.data();

    // Abaikan jika session ID cocok = kita sendiri yang nulis
    if(d._sid === _sessionId) return;

    // Jika form input sedang terbuka, warning saja tanpa overwrite
    if(_isEditFormOpen()){
      showToast('⚠️ Data diperbarui dari device lain. Selesaikan/tutup form ini lalu refresh halaman.', 'warn', 8000);
      return;
    }

    // Benar-benar dari device/session lain — terapkan
    siswaList    = d.siswa    || [];
    absensiList  = d.absensi  || [];
    materiList   = d.materi   || [];
    evaluasiList = d.evaluasi || [];
    bayarList    = d.bayar    || [];
    scheduleList = d.schedules|| [];
    renderAll(); setCurrentMonthDashFilter(); loadAbsensi();
    showToast('🔄 Data diperbarui dari device lain', 'info', 3500);
  }, err => {
    console.error('[Snapshot listener error]', err);
  });
}

let _saveTimer = null;
function saveToFirestore(){
  if(!userDocRef){ return; }
  clearTimeout(_saveTimer);
  setSyncing();
  _saveTimer = setTimeout(()=>{ _flushToFirestore(); }, 400);
}
async function _flushToFirestore(){
  if(!userDocRef) return;
  clearTimeout(_saveTimer);
  setSyncing();
  try{
    await userDocRef.set({
      siswa:siswaList, absensi:absensiList, materi:materiList,
      evaluasi:evaluasiList, bayar:bayarList, schedules:scheduleList,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      _sid: _sessionId,   // ← tandai write ini milik session kita
    },{merge:true});
    setSynced();
    console.log('✅ Saved → '+currentClassName+' | students:'+siswaList.length);
  } catch(e){
    setSyncErr(e.code || e.message);
    console.error('❌ Save failed:', e.code, e.message);
  }
}

// localStorage helpers (fallback only)
const lsGet = k => { try{ return JSON.parse(localStorage.getItem(k)||'[]') }catch(e){return []} };

// Legacy migrate (runs once if old-style localStorage data exists)
async function migrateLocalStorage(){
  const lsSiswa = lsGet('siswa');
  if(!lsSiswa.length) return;
  if(!userDocRef) return;
  const snap = await userDocRef.get();
  if(snap.exists && (snap.data().siswa||[]).length > 0) return;
  siswaList=lsSiswa; absensiList=lsGet('absensi'); materiList=lsGet('materi');
  evaluasiList=lsGet('evaluasi'); bayarList=lsGet('bayar'); scheduleList=lsGet('schedules');
  await _flushToFirestore();
  COLS.forEach(k => localStorage.removeItem(k));
  renderAll(); setCurrentMonthDashFilter();
  console.log('✅ Migrated localStorage → Firestore class');
}

// ════════════════════════════════════════════════
//  DB wrapper
// ════════════════════════════════════════════════
const DB = {
  set: (k, v) => {
    if(k==='siswa')     siswaList    = v;
    if(k==='absensi')   absensiList  = v;
    if(k==='materi')    materiList   = v;
    if(k==='evaluasi')  evaluasiList = v;
    if(k==='bayar')     bayarList    = v;
    if(k==='schedules') scheduleList = v;
    saveToFirestore();
  }
};

// ════════════════════════════════════════════════
//  LISTS (populated by loadFromFirestore)
// ════════════════════════════════════════════════
let siswaList    = [];
let absensiList  = [];
let materiList   = [];
let evaluasiList = [];
let bayarList    = [];
let scheduleList = [];  // { id, siswaId, days:['Monday','Wednesday'], jam:'15:00', durasi:60 }

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmt  = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');
const stars = n => '⭐'.repeat(Number(n)||0);
const tglFmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '-';
const chip = (txt,cls) => `<span class="chip ${cls}">${txt}</span>`;
const levelChip = l => {
  const map={Beginner:'chip-muted',Elementary:'chip-blue',Intermediate:'chip-green','Upper-Intermediate':'chip-purple',Advanced:'chip-red'};
  return chip(l, map[l]||'chip-muted');
};

// ═══════════════════════════════════════════════════════════
// ✨ NUMBER FORMATTING FOR INPUT FIELDS
// ═══════════════════════════════════════════════════════════

/**
 * Format number input dengan auto-separator (1000000 -> 1.000.000)
 */
function formatNumberInput(inputId){
  const input = document.getElementById(inputId);
  if(!input) return;

  // Hapus listener lama sebelum tambah baru — cegah duplikasi listener setiap form dibuka
  if(input._fmtHandler){
    input.removeEventListener('input', input._fmtHandler);
  }
  input._fmtHandler = function(){
    let value = this.value.replace(/\D/g, '');
    this.value = value ? 'Rp ' + Number(value).toLocaleString('id-ID') : '';
  };
  input.addEventListener('input', input._fmtHandler);

  // Format nilai yang sudah ada saat form dibuka
  if(input.value){
    const rawNum = Number(input.value.replace(/\D/g, ''));
    if(rawNum > 0){
      input.value = 'Rp ' + rawNum.toLocaleString('id-ID');
    }
  }
}

/**
 * Get raw number value from formatted input (removes Rp prefix and separators)
 */
function getNumberValue(inputId){
  const input = document.getElementById(inputId);
  if(!input) return 0;
  return Number(input.value.replace(/\D/g, '')) || 0;
}

function openModal(id){ document.getElementById(id).classList.add('open') }
function closeModal(id){ document.getElementById(id).classList.remove('open') }
// Event delegation — cover semua overlay termasuk yang ada di bawah script tag
document.addEventListener('click', e=>{
  if(e.target.classList.contains('overlay') && e.target.classList.contains('open')){
    if(e.target.id === 'modal-classes') return; // jangan tutup saat pilih kelas
    e.target.classList.remove('open');
  }
});

function openPanel(id, maxH='800px'){
  const p=document.getElementById(id);
  p.classList.remove('hidden'); p.classList.add('open');
  p.style.maxHeight=maxH;
}
function closePanel(id){
  const p=document.getElementById(id);
  p.classList.add('hidden'); p.classList.remove('open');
  p.style.maxHeight='0';
}

// ════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════
const pageNames = {
  dashboard:'Dashboard', students:'Students', attendance:'Attendance',
  lessons:'Lessons', evaluation:'Evaluation', payment:'Payment',
  reports:'Parent Reports', analytics:'Analytics', backup:'Backup & Restore'
};
const pageActions = {
  students: `<button class="btn-topbar primary" onclick="openStudentForm()">＋ Add Student</button>`,
  lessons:  `<button class="btn-topbar primary" onclick="resetLessonForm();openPanel('form-lesson','700px')">＋ Add Lesson</button>`,
  evaluation:`<button class="btn-topbar primary" onclick="resetEvalForm();switchEvalTab('single')">＋ Add Evaluation</button>`,
  payment:  `<button class="btn-topbar primary" onclick="openPaymentForm()">＋ Record Payment</button>`,
};

function _navigateRaw(page){
  // Navigate tanpa update lastPage — dipakai internal (e.g. switchClass reset sementara)
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg = document.getElementById('page-'+page);
  if(pg) pg.classList.add('active');
  document.getElementById('topbar-title').textContent = pageNames[page]||'';
  document.querySelectorAll('.mbn-item').forEach(el=>el.classList.toggle('active', el.dataset.page===page));
}
function navigate(page){
  localStorage.setItem('lastPage', page);
  if(currentClassId) localStorage.setItem('lastPage_' + currentClassId, page);
  document.querySelectorAll('.nav-item').forEach(n=>{
    n.classList.toggle('active', n.dataset.page===page);
  });
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.getElementById('topbar-title').textContent = pageNames[page]||'';
  // preserve sync+user in topbar-actions by only injecting the action button separately
  const actEl = document.getElementById('topbar-actions');
  // replace only the action button slot (first child before sync-status)
  const existing = document.getElementById('page-action-btn');
  if(existing) existing.remove();
  if(pageActions[page]){
    const tmp=document.createElement('div');
    tmp.id='page-action-btn'; tmp.style.display='contents';
    tmp.innerHTML=pageActions[page];
    actEl.insertBefore(tmp, actEl.firstChild);
  }
  if(page==='dashboard') setCurrentMonthDashFilter();
  if(page==='analytics') renderAnalytics();
  if(page==='reports')   renderReports();
  if(page==='backup')  { renderBackupSummary(); renderAccessPanel(); }
  if(page==='payment') { setCurrentMonthFilter(); }
  if(page==='attendance') { setCurrentMonthAttFilter(); }
  if(window.innerWidth<=768) closeSidebar();
  // Sync mobile bottom nav
  document.querySelectorAll('.mbn-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.page===page);
  });
}
document.querySelectorAll('.nav-item').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-backdrop').classList.toggle('show'); }
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('show');
}

// ════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════
let darkMode = localStorage.getItem('theme')!=='light';
function applyTheme(){
  document.body.dataset.theme = darkMode?'dark':'light';
  document.getElementById('theme-icon').textContent  = darkMode?'🌙':'☀️';
  document.getElementById('theme-label').textContent = darkMode?'Dark Mode':'Light Mode';
  localStorage.setItem('theme', darkMode?'dark':'light');
}
function toggleTheme(){ darkMode=!darkMode; applyTheme(); }
applyTheme();

// ════════════════════════════════════════════════
