// Simple cloud-like notes app using localStorage
(() => {
  // Elements
  const notesListEl = document.getElementById('notesList');
  const newBtn = document.getElementById('newBtn');
  const searchInput = document.getElementById('search');
  const noteTitle = document.getElementById('noteTitle');
  const noteContent = document.getElementById('noteContent');
  const deleteBtn = document.getElementById('deleteBtn');
  const statusEl = document.getElementById('status');
  const darkToggle = document.getElementById('darkToggle');

  // Keys & state
  const STORAGE_KEY = 'cloud_notes_v1';
  let notes = []; // {id,title,content,updated}
  let activeId = null;
  let autosaveTimer = null;
  let typingTimer = null;

  // Helpers
  const nowISO = () => new Date().toISOString();
  const saveAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  };
  const loadAll = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      notes = raw ? JSON.parse(raw) : [];
    } catch {
      notes = [];
    }
  };

  // Render list
  function renderList(filter = '') {
    notesListEl.innerHTML = '';
    const q = filter.trim().toLowerCase();
    const sorted = notes.slice().sort((a,b)=> b.updated.localeCompare(a.updated));
    const shown = q ? sorted.filter(n => (n.title + ' ' + n.content).toLowerCase().includes(q)) : sorted;
    if(shown.length === 0){
      notesListEl.innerHTML = `<div class="note-item" style="opacity:.6"><div class="note-title">No notes</div><div class="note-preview">Create a new note to get started.</div></div>`;
      return;
    }
    for (const n of shown) {
      const el = document.createElement('div');
      el.className = 'note-item';
      el.dataset.id = n.id;
      el.innerHTML = `
        <div class="note-title">${escapeHtml(n.title || 'Untitled')}</div>
        <div class="note-preview">${escapeHtml(n.content || '')}</div>
        <div class="note-meta"><span>${timeAgo(n.updated)}</span><span>${(n.content||'').length} chars</span></div>
      `;
      if (n.id === activeId) el.style.boxShadow = '0 8px 26px rgba(37,99,235,0.12)';
      el.addEventListener('click', ()=> setActive(n.id));
      notesListEl.appendChild(el);
    }
  }

  // Escape HTML
  function escapeHtml(s=''){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}

  // Time ago
  function timeAgo(iso){
    const d = new Date(iso); const s = Math.floor((Date.now() - d)/1000);
    if (s<10) return 'just now';
    if (s<60) return `${s}s`;
    if (s<3600) return `${Math.floor(s/60)}m`;
    if (s<86400) return `${Math.floor(s/3600)}h`;
    return d.toLocaleString();
  }

  // New note
  function createNote(){
    const id = 'n_'+Date.now();
    const note = {id, title:'', content:'', updated:nowISO()};
    notes.push(note);
    saveAll();
    setActive(id);
    renderList(searchInput.value);
  }

  // Set active
  function setActive(id){
    const n = notes.find(x=>x.id===id);
    if(!n) return;
    activeId = id;
    noteTitle.value = n.title;
    noteContent.value = n.content;
    status('Loaded');
    renderList(searchInput.value);
    // focus content
    noteContent.focus();
    // update URL hash (optional)
    try{history.replaceState(null,'', '#'+id);}catch{}
  }

  // Update note fields (autosave called separately)
  function updateActiveFromInputs(){
    if(!activeId) return;
    const n = notes.find(x=>x.id===activeId);
    if(!n) return;
    n.title = noteTitle.value;
    n.content = noteContent.value;
    n.updated = nowISO();
    renderList(searchInput.value);
  }

  // Autosave with debounce
  function scheduleAutosave(){
    status('Typing...');
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (!activeId) { status('Idle'); return; }
      updateActiveFromInputs();
      saveAll();
      status('Saved');
      setTimeout(()=> status('Idle'), 900);
    }, 900);
  }

  // Manual delete
  function deleteActive(){
    if(!activeId) return;
    const idx = notes.findIndex(n=>n.id===activeId);
    if(idx === -1) return;
    if(!confirm('Delete this note?')) return;
    notes.splice(idx,1);
    saveAll();
    activeId = notes[0]?.id || null;
    if(activeId) setActive(activeId); else { noteTitle.value=''; noteContent.value=''; renderList(searchInput.value); }
  }

  // Status helper
  function status(s){
    statusEl.textContent = s;
  }

  // Initialize
  function init(){
    loadAll();
    // If none, create sample note
    if(notes.length === 0){
      notes.push({id:'n_'+Date.now(), title:'Welcome to Cloud Notes', content:'This demo saves notes to localStorage to simulate cloud storage. Create, edit, delete, and search your notes. Dark mode and autosave included.', updated:nowISO()});
      saveAll();
    }

    // Restore theme
    const theme = localStorage.getItem('cloud_notes_theme') || 'light';
    applyTheme(theme === 'dark');

    // Restore last active from hash or first note
    const hashId = location.hash ? location.hash.slice(1) : null;
    activeId = notes.find(n=>n.id===hashId)?.id || notes[0]?.id || null;
    renderList();
    if(activeId) setActive(activeId);

    // Events
    newBtn.addEventListener('click', createNote);
    deleteBtn.addEventListener('click', deleteActive);
    searchInput.addEventListener('input', (e)=> renderList(e.target.value));
    noteTitle.addEventListener('input', scheduleAutosave);
    noteContent.addEventListener('input', scheduleAutosave);
    darkToggle.addEventListener('change', e => {
      applyTheme(e.target.checked);
      localStorage.setItem('cloud_notes_theme', e.target.checked ? 'dark' : 'light');
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e)=> {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n'){ e.preventDefault(); createNote(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f'){ e.preventDefault(); searchInput.focus(); searchInput.select(); }
    });

    // Save before unload
    window.addEventListener('beforeunload', ()=> { updateActiveFromInputs(); saveAll(); });
  }

  function applyTheme(dark){
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    darkToggle.checked = dark;
  }

  // Expose manual save for debugging
  window.__cloudNotesSave = () => { updateActiveFromInputs(); saveAll(); };

  // Kick off
  init();

})();
