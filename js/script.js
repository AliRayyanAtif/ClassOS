'use strict';
/* ==========================================================
   ClassWork OS · js/script.js  (shared by all six pages)

   Every page has <body data-page="...">. The BOOT section at
   the bottom runs the shared setup, then only the code for
   that page.

    1. Storage                 7. Page: Home
    2. Helpers                 8. Page: Class Work (explore)
    3. App data + sample data  9. Page: Task Details
    4. Theme, toast, shell    10. Page: Planner
    5. Modals (add / edit)    11. Page: Study Tips
    6. Shared renderers       12. Page: Feedback
                              13. BOOT
   ========================================================== */


/* ==========================================================
   1. STORAGE (localStorage)
   Each list is turned into a JSON string and saved in the
   browser's localStorage under its own key, e.g. "cw_tasks".
   It stays there until the user clears their browser data.
   ========================================================== */
const KEYS = { tasks:'cw_tasks', dates:'cw_dates', courses:'cw_courses', prefs:'cw_prefs', seeded:'cw_seeded' };

function saveData(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function loadData(key, fallback){
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch (e) { return fallback; }
}
function removeData(key){
  try { localStorage.removeItem(key); } catch (e) {}
}


/* ==========================================================
   2. HELPERS
   ========================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function newId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function startOfToday(){ const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseDue(s){ const d = new Date(s + 'T00:00:00'); d.setHours(0, 0, 0, 0); return d; }
function isoDate(d){
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDaysISO(n, fromISO){
  const d = fromISO ? parseDue(fromISO) : startOfToday();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function daysUntil(s){ return Math.round((parseDue(s) - startOfToday()) / 86400000); }
function relText(s){
  const n = daysUntil(s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return (-n) + 'd ago';
  return 'in ' + n + 'd';
}
function niceDate(s, opts){ return parseDue(s).toLocaleDateString(undefined, opts || { weekday:'short', day:'numeric', month:'short' }); }
function longDate(s){ return niceDate(s, { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
function bucketOf(s){ const n = daysUntil(s); if (n < 0) return 'ov'; if (n <= 6) return 'sn'; return 'lt'; }
function agoText(ts){
  if (!ts) return '';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}
function plural(n, word){ return n + ' ' + word + (n === 1 ? '' : 's'); }
function fmtH(h){ return (Math.round(h * 10) / 10) + 'h'; }
function param(name){ return new URLSearchParams(location.search).get(name); }

/* small inline SVG icons (used instead of emoji) */
const svgIcon = d => `<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  warn: svgIcon('M8 2L1.5 13.5h13zM8 6.5v3.2M8 11.6v.1'),
  check: svgIcon('M3 8.5l3 3 7-7'),
  undo: svgIcon('M5.5 3.5l-3 3 3 3M2.5 6.5H10a3.5 3.5 0 010 7H7')
};


/* ==========================================================
   3. APP DATA
   ========================================================== */
const TYPES = ['Assignment', 'Quiz', 'Project', 'Presentation', 'Other'];
const TYPE_IMG = { Assignment:'images/assignment.svg', Quiz:'images/quiz.svg', Project:'images/project.svg', Presentation:'images/presentation.svg', Other:'images/other.svg' };
const DEFAULT_PREFS = { hoursPerDay:3, daysOff:'none' };

const STATE = { tasks:[], dates:[], courses:[], prefs:{ ...DEFAULT_PREFS } };

function loadAll(){
  STATE.tasks = loadData(KEYS.tasks, []);
  STATE.dates = loadData(KEYS.dates, []);
  STATE.courses = loadData(KEYS.courses, []);
  STATE.prefs = Object.assign({}, DEFAULT_PREFS, loadData(KEYS.prefs, {}));
}
const saveTasks = () => saveData(KEYS.tasks, STATE.tasks);
const saveDates = () => saveData(KEYS.dates, STATE.dates);
const saveCourses = () => saveData(KEYS.courses, STATE.courses);
const savePrefs = () => saveData(KEYS.prefs, STATE.prefs);

const findTask = id => STATE.tasks.find(t => t.id === id);
const findDate = id => STATE.dates.find(d => d.id === id);
function sortedTasks(){ return STATE.tasks.slice().sort((a, b) => parseDue(a.due) - parseDue(b.due)); }
function activeTasks(){ return sortedTasks().filter(t => !t.done); }

/* --- task / date / course changes (each one saves to localStorage) --- */
function addTask(fields){
  const now = Date.now();
  const task = { id:newId(), title:fields.title, course:fields.course, type:fields.type, due:fields.due, notes:fields.notes || '', done:false, createdAt:now, updatedAt:now };
  STATE.tasks.push(task); saveTasks(); return task;
}
function editTask(id, fields){
  const t = findTask(id); if (!t) return;
  Object.assign(t, fields, { updatedAt:Date.now() }); saveTasks();
}
function deleteTask(id){ STATE.tasks = STATE.tasks.filter(t => t.id !== id); saveTasks(); }
function toggleDone(id){
  const t = findTask(id); if (!t) return;
  t.done = !t.done; t.updatedAt = Date.now(); saveTasks();
  toast(t.done ? 'Nice! Marked as done.' : 'Moved back to your to-do list.');
}
function addDate(fields){
  const now = Date.now();
  STATE.dates.push({ id:newId(), ...fields, createdAt:now, updatedAt:now }); saveDates();
}
function editDate(id, fields){ const d = findDate(id); if (!d) return; Object.assign(d, fields, { updatedAt:Date.now() }); saveDates(); }
function deleteDate(id){ STATE.dates = STATE.dates.filter(d => d.id !== id); saveDates(); }
function addCourse(name){ STATE.courses.push(name); STATE.courses.sort((a, b) => a.localeCompare(b)); saveCourses(); }
function deleteCourse(name){ STATE.courses = STATE.courses.filter(c => c !== name); saveCourses(); }

/* --- sample data so a first-time visitor sees how it works --- */
const SAMPLE_COURSES = ['Applied Physics', 'Calculus & Analytical Geometry', 'Functional English', 'Introduction to ICT', 'Islamic Studies', 'Programming Fundamentals'];
function sampleTasks(){
  return [
    { title:'Quiz 2: Limits & Continuity', course:'Calculus & Analytical Geometry', type:'Quiz', due:addDaysISO(1), notes:'Covers lectures 5–8. Bring a calculator.' },
    { title:'Assignment 3: Loops & Arrays', course:'Programming Fundamentals', type:'Assignment', due:addDaysISO(2), notes:'Questions 1–6 from the handout.\nSubmit .cpp files on the LMS before midnight.' },
    { title:'Lab Report 4: Ohm’s Law', course:'Applied Physics', type:'Assignment', due:addDaysISO(-1), notes:'Include the V–I graph and the error analysis table.' },
    { title:'Group Presentation: Effective Listening', course:'Functional English', type:'Presentation', due:addDaysISO(6), notes:'5–7 minutes, every member speaks.' },
    { title:'Reading: Chapter 4, Functions', course:'Programming Fundamentals', type:'Other', due:addDaysISO(9), notes:'' },
    { title:'Web Project: 6-page website', course:'Introduction to ICT', type:'Project', due:addDaysISO(12), notes:'HTML + CSS + JS. Report and AI conversation history also needed.' },
    { title:'Quiz 1: Vectors', course:'Applied Physics', type:'Quiz', due:addDaysISO(15), notes:'Dot and cross products.' },
    { title:'Assignment 2: Conditionals', course:'Programming Fundamentals', type:'Assignment', due:addDaysISO(-5), notes:'', done:true }
  ];
}
function sampleDates(){
  return [
    { kind:'exam', course:'Calculus & Analytical Geometry', label:'Mid-Term Exam', date:addDaysISO(20), time:'09:00', loc:'Room C-301' },
    { kind:'exam', course:'Programming Fundamentals', label:'Mid-Term Exam', date:addDaysISO(22), time:'13:30', loc:'Computer Lab 2' },
    { kind:'deadline', course:'Introduction to ICT', label:'Project demo day', date:addDaysISO(14), time:'', loc:'Bring the site on a USB' },
    { kind:'other', course:'Islamic Studies', label:'Course drop deadline', date:addDaysISO(25), time:'', loc:'Student portal' }
  ];
}
function loadSampleData(){
  const now = Date.now();
  sampleTasks().forEach((t, i) => STATE.tasks.push({ id:newId() + i, notes:'', done:false, ...t, createdAt:now - i * 3600000, updatedAt:now - i * 3600000 }));
  sampleDates().forEach((d, i) => STATE.dates.push({ id:newId() + 'd' + i, ...d, createdAt:now, updatedAt:now }));
  SAMPLE_COURSES.forEach(c => { if (!STATE.courses.includes(c)) STATE.courses.push(c); });
  STATE.courses.sort((a, b) => a.localeCompare(b));
  saveTasks(); saveDates(); saveCourses();
}
function seedIfFirstVisit(){
  if (loadData(KEYS.seeded, false)) return;
  if (!STATE.tasks.length && !STATE.dates.length) loadSampleData();
  saveData(KEYS.seeded, true);
}
function clearAllData(){
  [KEYS.tasks, KEYS.dates, KEYS.courses].forEach(removeData);
  STATE.tasks = []; STATE.dates = []; STATE.courses = [];
  saveData(KEYS.seeded, true);   // stay empty: don't re-add the samples
}


/* ==========================================================
   4. THEME, TOAST, SHELL
   ========================================================== */
let rerender = () => {};   // each page sets this to its own render function

function toast(message, kind = 'ok'){
  let box = $('#toastBox');
  if (!box){
    box = document.createElement('div');
    box.id = 'toastBox'; box.className = 'toast-box';
    box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
}

function initShell(){
  $$('[data-add]').forEach(b => b.addEventListener('click', openChooser));

  const note = $('#storageNote');
  if (note){
    note.textContent = 'Everything you add is saved in this browser’s local storage. No account, no server.';
  }
}


/* ==========================================================
   5. MODALS: add chooser, task form, date form, confirm, courses
   Injected once so every page shares the same dialogs.
   ========================================================== */
const MODALS_HTML = `
<div class="overlay" id="chooser" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="chooserTitle">
    <div class="titlebar"><span id="chooserTitle">ADD_NEW</span><button class="x" type="button" data-close aria-label="Close">✕</button></div>
    <div class="dlg-body"><div class="chooser">
      <button type="button" data-choose="task"><img src="images/assignment.svg" alt="">
        <span><span class="ct">Class task</span><span class="cs">Assignment, quiz, project, presentation…</span></span></button>
      <button type="button" data-choose="date"><img src="images/exam.svg" alt="">
        <span><span class="ct">Exam / important date</span><span class="cs">A dated event for your schedule</span></span></button>
    </div></div>
  </div>
</div>

<div class="overlay" id="taskOverlay" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="taskDlgTitle">
    <div class="titlebar"><span id="taskDlgTitle">NEW_TASK</span><button class="x" type="button" data-close aria-label="Close">✕</button></div>
    <form id="taskForm" novalidate>
      <input type="hidden" id="t_id">
      <div class="field"><label for="t_title">Task title <span class="req">*</span></label>
        <input id="t_title" type="text" maxlength="120" placeholder="e.g. Assignment 2: Pointers"></div>
      <div class="field"><label for="t_course">Course / subject <span class="req">*</span></label>
        <select id="t_course"></select>
        <button type="button" class="linkbtn" data-managecourses>＋ Add / manage courses</button></div>
      <fieldset class="field"><legend>Type</legend><div class="seg">
        ${TYPES.map((t, i) => `<label><input type="radio" name="ttype" value="${t}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}
      </div></fieldset>
      <div class="field"><label for="t_due">Due date <span class="req">*</span></label><input id="t_due" type="date"></div>
      <div class="field"><label for="t_notes">Notes <span class="opt">(optional)</span></label>
        <textarea id="t_notes" maxlength="500" placeholder="Links, chapter, instructions…"></textarea></div>
      <p class="err" id="taskErr" role="alert"></p>
      <div class="foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">Save task</button></div>
    </form>
  </div>
</div>

<div class="overlay" id="dateOverlay" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dateDlgTitle">
    <div class="titlebar"><span id="dateDlgTitle">NEW_DATE</span><button class="x" type="button" data-close aria-label="Close">✕</button></div>
    <form id="dateForm" novalidate>
      <input type="hidden" id="d_id">
      <fieldset class="field"><legend>Type</legend><div class="seg">
        <label><input type="radio" name="dkind" value="exam" checked><span>Exam</span></label>
        <label><input type="radio" name="dkind" value="deadline"><span>Deadline</span></label>
        <label><input type="radio" name="dkind" value="other"><span>Other</span></label>
      </div></fieldset>
      <div class="field"><label for="d_course">Course / subject <span class="req">*</span></label>
        <select id="d_course"></select>
        <button type="button" class="linkbtn" data-managecourses>＋ Add / manage courses</button></div>
      <div class="field"><label for="d_label">Label <span class="opt">(optional)</span></label>
        <input id="d_label" type="text" maxlength="80" placeholder="e.g. Mid-Term Exam"></div>
      <div class="field row2">
        <div><label for="d_date">Date <span class="req">*</span></label><input id="d_date" type="date"></div>
        <div><label for="d_time">Time <span class="opt">(optional)</span></label><input id="d_time" type="time"></div>
      </div>
      <div class="field"><label for="d_loc">Location / details <span class="opt">(optional)</span></label>
        <input id="d_loc" type="text" maxlength="120" placeholder="e.g. Room C-301"></div>
      <p class="err" id="dateErr" role="alert"></p>
      <div class="foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">Save date</button></div>
    </form>
  </div>
</div>

<div class="overlay" id="confirmOverlay" hidden>
  <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmMsg" style="max-width:400px">
    <div class="titlebar"><span>CONFIRM</span><button class="x" type="button" data-close aria-label="Close">✕</button></div>
    <div class="dlg-body"><p class="confirm-msg" id="confirmMsg"></p><p class="confirm-sub" id="confirmSub"></p>
      <div class="foot" style="margin-top:14px"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn danger" id="confirmYes">Delete</button></div></div>
  </div>
</div>

<div class="overlay" id="coursesOverlay" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="coursesTitle" style="max-width:420px">
    <div class="titlebar"><span id="coursesTitle">MANAGE_COURSES</span><button class="x" type="button" data-close aria-label="Close">✕</button></div>
    <div class="dlg-body">
      <div class="field">
        <label for="c_name">Add a course</label>
        <div style="display:flex; gap:8px"><input id="c_name" type="text" maxlength="80" placeholder="e.g. Discrete Mathematics"><button type="button" class="btn primary" id="c_add">Add</button></div>
        <p class="err" id="courseErr" role="alert"></p>
      </div>
      <div id="courseList"></div>
      <p class="hint">Removing a course only takes it off this list. Tasks already using it keep their course name.</p>
    </div>
  </div>
</div>`;

let lastFocus = null;
function openOverlay(id){
  lastFocus = document.activeElement;
  $('#' + id).hidden = false;
}
function closeAll(){
  $$('.overlay').forEach(o => { o.hidden = true; });
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function fillCourseSelect(select, current){
  const list = STATE.courses.slice();
  if (current && !list.includes(current)) list.unshift(current);   // keep a value that was removed from the list
  select.innerHTML = '<option value="">Select a course…</option>' +
    list.map(c => `<option value="${esc(c)}"${c === current ? ' selected' : ''}>${esc(c)}</option>`).join('');
  select.value = current || '';
}

function openChooser(){ closeAll(); openOverlay('chooser'); }

function openTaskDialog(id, presetCourse){
  closeAll();
  const form = $('#taskForm');
  form.reset(); $('#taskErr').textContent = '';
  let course = presetCourse || '';
  if (id){
    const t = findTask(id); if (!t) return;
    $('#taskDlgTitle').textContent = 'EDIT_TASK';
    $('#t_id').value = t.id; $('#t_title').value = t.title; $('#t_due').value = t.due; $('#t_notes').value = t.notes || '';
    course = t.course;
    const radio = form.querySelector(`input[name=ttype][value="${t.type}"]`); if (radio) radio.checked = true;
  } else {
    $('#taskDlgTitle').textContent = 'NEW_TASK';
    $('#t_id').value = '';
    $('#t_due').value = addDaysISO(7);
  }
  fillCourseSelect($('#t_course'), course);
  openOverlay('taskOverlay');
  setTimeout(() => $('#t_title').focus(), 30);
}

function openDateDialog(id){
  closeAll();
  const form = $('#dateForm');
  form.reset(); $('#dateErr').textContent = '';
  let course = '';
  if (id){
    const d = findDate(id); if (!d) return;
    $('#dateDlgTitle').textContent = 'EDIT_DATE';
    $('#d_id').value = d.id; $('#d_label').value = d.label || ''; $('#d_date').value = d.date; $('#d_time').value = d.time || ''; $('#d_loc').value = d.loc || '';
    course = d.course;
    const radio = form.querySelector(`input[name=dkind][value="${d.kind}"]`); if (radio) radio.checked = true;
  } else {
    $('#dateDlgTitle').textContent = 'NEW_DATE'; $('#d_id').value = '';
  }
  fillCourseSelect($('#d_course'), course);
  openOverlay('dateOverlay');
  setTimeout(() => $('#d_course').focus(), 30);
}

let confirmCallback = null;
function askConfirm(message, sub, callback, yesLabel = 'Delete'){
  closeAll();
  confirmCallback = callback;
  $('#confirmMsg').textContent = message;
  $('#confirmSub').textContent = sub;
  $('#confirmYes').textContent = yesLabel;
  openOverlay('confirmOverlay');
  setTimeout(() => $('#confirmYes').focus(), 30);
}
function confirmDeleteTask(id, after){
  const t = findTask(id); if (!t) return;
  askConfirm(`Delete “${t.title}”?`, 'This removes it from your browser for good.', () => {
    deleteTask(id); toast('Task deleted');
    if (after) after(); else rerender();
  });
}
function confirmDeleteDate(id){
  const d = findDate(id); if (!d) return;
  askConfirm(`Delete “${d.label || 'this date'}”?`, 'It will be removed from your schedule.', () => {
    deleteDate(id); toast('Date deleted'); rerender();
  });
}

function renderCourseList(){
  const el = $('#courseList');
  if (!STATE.courses.length){ el.innerHTML = '<p class="panel-empty">No courses yet. Add one above.</p>'; return; }
  el.innerHTML = STATE.courses.map(c =>
    `<div class="course-row"><span>${esc(c)}</span><button type="button" class="btn sm danger" data-delcourse="${esc(c)}">Remove</button></div>`).join('');
}
function openCoursesManager(){
  $('#courseErr').textContent = ''; $('#c_name').value = '';
  renderCourseList();
  $('#coursesOverlay').hidden = false;   // opens on top of any open dialog
  setTimeout(() => $('#c_name').focus(), 30);
}
function refreshOpenCourseSelects(){
  if (!$('#taskOverlay').hidden) fillCourseSelect($('#t_course'), $('#t_course').value);
  if (!$('#dateOverlay').hidden) fillCourseSelect($('#d_course'), $('#d_course').value);
}
function submitCourse(){
  const input = $('#c_name'), errEl = $('#courseErr');
  const name = input.value.trim();
  errEl.textContent = '';
  if (!name){ errEl.textContent = 'Type a course name.'; return; }
  if (name.length < 2){ errEl.textContent = 'Course names need at least 2 characters.'; return; }
  if (STATE.courses.some(c => c.toLowerCase() === name.toLowerCase())){ errEl.textContent = 'That course already exists.'; return; }
  addCourse(name);
  input.value = ''; renderCourseList(); refreshOpenCourseSelects(); input.focus();
  toast('Course added');
}

function mountModals(){
  document.body.insertAdjacentHTML('beforeend', MODALS_HTML);

  // close on backdrop click or ✕/Cancel
  $$('.overlay').forEach(o => o.addEventListener('click', e => {
    if (e.target === o || e.target.closest('[data-close]')){
      if (o.id === 'coursesOverlay') o.hidden = true; else closeAll();
    }
  }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#coursesOverlay').hidden) $('#coursesOverlay').hidden = true; else closeAll();
  });
  $$('[data-choose]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.choose === 'task') openTaskDialog(null); else openDateDialog(null);
  }));
  document.addEventListener('click', e => { if (e.target.closest('[data-managecourses]')) openCoursesManager(); });

  // task form validation + save
  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const err = $('#taskErr');
    const id = $('#t_id').value;
    const title = $('#t_title').value.trim();
    const course = $('#t_course').value.trim();
    const due = $('#t_due').value;
    const type = $('#taskForm').querySelector('input[name=ttype]:checked').value;
    const notes = $('#t_notes').value.trim();
    if (!title){ err.textContent = 'Please add a task title.'; $('#t_title').focus(); return; }
    if (title.length < 3){ err.textContent = 'The title is a bit short. Use at least 3 characters.'; $('#t_title').focus(); return; }
    if (!course){ err.textContent = 'Please choose the course / subject (or add one).'; $('#t_course').focus(); return; }
    if (!due){ err.textContent = 'Please pick a due date.'; $('#t_due').focus(); return; }
    if (id){
      editTask(id, { title, course, type, due, notes });
      toast('Task updated');
    } else {
      addTask({ title, course, type, due, notes });
      if (daysUntil(due) < 0) toast('Saved. Heads up, that date has already passed.', 'warn');
      else toast('Task added');
    }
    closeAll(); rerender();
  });

  // date form validation + save
  $('#dateForm').addEventListener('submit', e => {
    e.preventDefault();
    const err = $('#dateErr');
    const id = $('#d_id').value;
    const course = $('#d_course').value.trim();
    const date = $('#d_date').value;
    const kind = $('#dateForm').querySelector('input[name=dkind]:checked').value;
    const label = $('#d_label').value.trim();
    const time = $('#d_time').value;
    const loc = $('#d_loc').value.trim();
    if (!course){ err.textContent = 'Please choose the course / subject.'; $('#d_course').focus(); return; }
    if (!date){ err.textContent = 'Please pick a date.'; $('#d_date').focus(); return; }
    if (id){ editDate(id, { course, date, kind, label, time, loc }); toast('Date updated'); }
    else { addDate({ course, date, kind, label, time, loc }); toast(kind === 'exam' ? 'Exam added. Good luck!' : 'Date added'); }
    closeAll(); rerender();
  });

  $('#confirmYes').addEventListener('click', () => { const cb = confirmCallback; closeAll(); if (cb) cb(); });

  $('#c_add').addEventListener('click', submitCourse);
  $('#c_name').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); submitCourse(); } });
  $('#courseList').addEventListener('click', e => {
    const del = e.target.closest('[data-delcourse]'); if (!del) return;
    deleteCourse(del.dataset.delcourse); renderCourseList(); refreshOpenCourseSelects(); rerender();
  });
}


/* ==========================================================
   6. SHARED RENDERERS
   ========================================================== */
function windowBox(title, inner, extraClass = ''){
  return `<section class="window ${extraClass}"><div class="titlebar"><span>${title}</span><span class="dots"><i></i><i></i><i></i></span></div><div class="body">${inner}</div></section>`;
}
function miniRow(t){
  return `<a class="row" href="details.html?id=${encodeURIComponent(t.id)}"><span class="tdot t-${t.type}"></span>
    <span class="r-main"><span class="r-title">${esc(t.title)}</span><span class="r-sub">${esc(t.course)}</span></span>
    <span class="r-when ${t.done ? '' : bucketOf(t.due)}">${t.done ? '✓ done' : relText(t.due)}</span></a>`;
}
function dateRow(d){
  return `<a class="row" href="interactive.html#schedule"><span class="tdot ${d.kind === 'exam' ? 'c-red' : d.kind === 'deadline' ? 'c-blue' : 'c-muted'}"></span>
    <span class="r-main"><span class="r-title">${esc(d.label || 'Important date')}</span><span class="r-sub">${esc([d.time, d.loc].filter(Boolean).join(' · ') || d.course)}</span></span>
    <span class="r-when">${niceDate(d.date)}</span></a>`;
}


/* ==========================================================
   7. PAGE: HOME
   ========================================================== */
function initHome(){
  const hour = new Date().getHours();
  $('#greet').textContent = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  rerender = renderHome;
  renderHome();
}

function renderHome(){
  const active = activeTasks();
  const upcoming = active.filter(t => daysUntil(t.due) >= 0);
  const overdue = active.filter(t => daysUntil(t.due) < 0);
  const thisWeek = upcoming.filter(t => daysUntil(t.due) <= 6);
  const examsAhead = STATE.dates.filter(d => d.kind === 'exam' && daysUntil(d.date) >= 0).length;

  const stat = (label, n, color, href) =>
    `<a class="stat" href="${href}"><span class="stat-n c-${color}">${n}</span><span class="stat-l">${label}</span></a>`;
  $('#stats').innerHTML =
    stat('Upcoming', upcoming.length, 'blue', 'explore.html') +
    stat('Due this week', thisWeek.length, thisWeek.length ? 'amber' : 'green', 'explore.html') +
    stat('Overdue', overdue.length, overdue.length ? 'red' : 'green', 'explore.html') +
    stat('Exams ahead', examsAhead, 'plum', 'interactive.html#schedule');

  // NEXT UP
  const next = upcoming[0];
  let html = next
    ? windowBox('NEXT_UP', `<a class="nu-link" href="details.html?id=${encodeURIComponent(next.id)}">
        <span class="nu-title">${esc(next.title)}</span>
        <span class="nu-meta"><span>${esc(next.course)}</span><span class="chip t-${next.type}">${next.type}</span><span>${niceDate(next.due)}</span></span></a>
        <span class="nu-count">${relText(next.due).toUpperCase()}</span>`, 'nextup full ' + bucketOf(next.due))
    : windowBox('NEXT_UP', `<p class="panel-empty">Nothing upcoming. You're all caught up. <a href="#" data-add-task>Add a task</a>.</p>`, 'full');

  // URGENT (overdue or due within a day)
  const urgent = active.filter(t => daysUntil(t.due) <= 1);
  if (urgent.length) html += windowBox('URGENT_&amp;_OVERDUE', `<div class="rows">${urgent.map(miniRow).join('')}</div>`, 'full');

  // COMING UP
  const coming = upcoming.filter(t => t !== next).slice(0, 5);
  html += windowBox('COMING_UP', coming.length ? `<div class="rows">${coming.map(miniRow).join('')}</div>` : '<p class="panel-empty">No further deadlines yet.</p>');

  // NEXT 2 WEEKS
  const inRange = (lo, hi) => upcoming.filter(t => { const n = daysUntil(t.due); return n >= lo && n <= hi; });
  const weekList = items => items.length
    ? items.map(t => `<a class="mini" href="details.html?id=${encodeURIComponent(t.id)}"><span class="tdot t-${t.type}"></span><span>${esc(t.title)}</span></a>`).join('')
    : '<p class="none">Nothing</p>';
  const wk1 = inRange(0, 6), wk2 = inRange(7, 13);
  html += windowBox('NEXT_2_WEEKS', `<div class="twoweeks">
      <div class="wk"><h3>This week <span class="n">${wk1.length}</span></h3>${weekList(wk1)}</div>
      <div class="wk"><h3>Next week <span class="n">${wk2.length}</span></h3>${weekList(wk2)}</div></div>`);

  // RECENTLY UPDATED (tasks + dates)
  const recent = [
    ...STATE.tasks.map(t => ({ ...t, isTask:true, label:t.title })),
    ...STATE.dates.map(d => ({ ...d, isTask:false, type:d.kind === 'exam' ? 'Quiz' : 'Other', label:(d.label || 'Important date') + ' · ' + d.course }))
  ].filter(r => r.updatedAt).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  html += windowBox('RECENTLY_UPDATED', recent.length ? `<div class="rows">${recent.map(r => `
      <a class="row" href="${r.isTask ? 'details.html?id=' + encodeURIComponent(r.id) : 'interactive.html#schedule'}"><span class="tdot t-${r.type}"></span>
        <span class="r-main"><span class="r-title">${esc(r.label)}</span><span class="r-sub"><span class="r-act">${r.createdAt === r.updatedAt ? 'Added' : 'Updated'}</span></span></span>
        <span class="r-when">${agoText(r.updatedAt)}</span></a>`).join('')}</div>` : '<p class="panel-empty">No recent changes yet.</p>', 'full');

  $('#dash').innerHTML = html;
  const addLink = $('#dash [data-add-task]');
  if (addLink) addLink.addEventListener('click', e => { e.preventDefault(); openTaskDialog(null); });
}


/* ==========================================================
   8. PAGE: CLASS WORK (explore.html): filter, sort, task cards
   ========================================================== */
const EXP = { type:'All', status:'active', sort:'due', expanded:new Set() };

function initExplore(){
  if (TYPES.includes(param('type'))) EXP.type = param('type');
  if (['active', 'done', 'all'].includes(param('status'))) EXP.status = param('status');

  $('#statusSelect').value = EXP.status;
  $('#sortSelect').value = EXP.sort;

  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    EXP.type = b.dataset.filter; renderExplore();
  });
  $('#statusSelect').addEventListener('change', e => { EXP.status = e.target.value; renderExplore(); });
  $('#sortSelect').addEventListener('change', e => { EXP.sort = e.target.value; renderExplore(); });
  $('#taskList').addEventListener('click', onTaskListClick);

  rerender = renderExplore;
  renderExplore();
}

function filteredTasks(){
  let list = STATE.tasks.slice();
  if (EXP.status === 'active') list = list.filter(t => !t.done);
  else if (EXP.status === 'done') list = list.filter(t => t.done);
  if (EXP.type !== 'All') list = list.filter(t => t.type === EXP.type);
  switch (EXP.sort){
    case 'due-desc': list.sort((a, b) => parseDue(b.due) - parseDue(a.due)); break;
    case 'title': list.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'course': list.sort((a, b) => a.course.localeCompare(b.course) || parseDue(a.due) - parseDue(b.due)); break;
    default: list.sort((a, b) => parseDue(a.due) - parseDue(b.due));
  }
  return list;
}

function renderExplore(){
  $$('#filters [data-filter]').forEach(b => {
    const on = b.dataset.filter === EXP.type;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });

  const list = filteredTasks();
  const box = $('#taskList');
  $('#resultCount').textContent = `Showing ${plural(list.length, 'task')}`;

  if (!list.length){
    const filtered = EXP.type !== 'All' || EXP.status !== 'active';
    box.innerHTML = filtered
      ? `<div class="empty-state">No tasks match these filters.<br><button class="btn" type="button" data-clear>Clear filters</button></div>`
      : `<div class="empty-state">No tasks yet. You're free!<br><button class="btn primary" type="button" data-add-task>Add your first task</button></div>`;
    return;
  }

  // grouped by urgency when sorting by date, flat list otherwise
  if (EXP.sort === 'due' || EXP.sort === 'due-desc'){
    const groups = [
      { key:'ov', label:'Overdue', cls:'urgent' }, { key:'sn', label:'Due within a week', cls:'soon' },
      { key:'lt', label:'Later', cls:'' }, { key:'done', label:'Completed', cls:'donegrp' }
    ];
    if (EXP.sort === 'due-desc') groups.reverse();
    let html = '';
    for (const g of groups){
      const items = list.filter(t => (t.done ? 'done' : bucketOf(t.due)) === g.key);
      if (!items.length) continue;
      html += `<h2 class="group-label ${g.cls}"><span>${g.label}</span><span class="count">${items.length}</span></h2>`;
      html += items.map(taskCard).join('');
    }
    box.innerHTML = html;
  } else {
    box.innerHTML = list.map(taskCard).join('');
  }
  markLongDescriptions();
}

/* Due line, e.g. "Due in 2 days (Sun, 22 Nov)" */
function dueLine(t){
  const n = daysUntil(t.due), when = niceDate(t.due);
  if (t.done) return `Completed · was due ${when}`;
  if (n < 0) return `Overdue by ${plural(-n, 'day')} (${when})`;
  if (n === 0) return `Due today (${when})`;
  if (n === 1) return `Due tomorrow (${when})`;
  return `Due in ${n} days (${when})`;
}
function stampText(ts){
  return new Date(ts).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
}

function taskCard(t){
  const state = t.done ? 'done' : bucketOf(t.due);
  const id = esc(t.id);
  const hasNotes = !!(t.notes && t.notes.trim());
  const expanded = EXP.expanded.has(t.id);
  const desc = hasNotes
    ? `<div class="tc-desc-wrap"><p class="tc-desc${expanded ? ' expanded' : ''}" id="desc_${id}">${esc(t.notes.trim())}</p>
        <button class="tc-more" type="button" data-more="${id}" aria-controls="desc_${id}" aria-expanded="${expanded}"${expanded ? '' : ' hidden'}>${expanded ? 'Show less' : 'Show more'}</button></div>`
    : '';
  const added = t.createdAt ? ` on ${stampText(t.createdAt)}` : '';
  return `<article class="tcard cat-${t.type} ${state}" data-id="${id}">
    <div class="tc-top">
      <input class="tc-check" type="checkbox" data-done="${id}"${t.done ? ' checked' : ''} aria-label="Mark “${esc(t.title)}” as ${t.done ? 'not done' : 'done'}">
      <span class="tc-label"><span class="tc-cat">${t.type}</span><span class="tc-course">${esc(t.course)}</span></span>
      <span class="tc-actions">
        <button type="button" class="tc-edit" data-edit="${id}">Edit</button>
        <button type="button" class="tc-del" data-del="${id}">Delete</button>
      </span>
    </div>
    <h3 class="tc-title"><a href="details.html?id=${encodeURIComponent(t.id)}">${esc(t.title)}</a></h3>
    ${desc}
    <p class="tc-due">${dueLine(t)}</p>
    <p class="tc-meta">Added by <b>You</b>${added}</p>
  </article>`;
}

/* Only descriptions that actually overflow the 3-line clamp get a toggle. */
function markLongDescriptions(){
  $$('#taskList .tc-desc').forEach(p => {
    const btn = p.parentElement.querySelector('.tc-more');
    if (p.classList.contains('expanded')){ btn.hidden = false; return; }
    btn.hidden = p.scrollHeight <= p.clientHeight + 1;
  });
}

function onTaskListClick(e){
  const get = attr => e.target.closest('[' + attr + ']');
  const more = get('data-more'), edit = get('data-edit'), del = get('data-del'), done = get('data-done');
  if (get('data-clear')){
    EXP.type = 'All'; EXP.status = 'active';
    $('#statusSelect').value = 'active'; renderExplore(); return;
  }
  if (get('data-add-task')){ openTaskDialog(null); return; }
  if (edit){ openTaskDialog(edit.dataset.edit); return; }
  if (del){ confirmDeleteTask(del.dataset.del); return; }
  if (done){ toggleDone(done.dataset.done); renderExplore(); return; }
  if (more){
    const tid = more.dataset.more;
    const p = document.getElementById('desc_' + tid);
    const open = !p.classList.contains('expanded');
    p.classList.toggle('expanded', open);
    more.textContent = open ? 'Show less' : 'Show more';
    more.setAttribute('aria-expanded', String(open));
    if (open) EXP.expanded.add(tid); else EXP.expanded.delete(tid);
  }
}


/* ==========================================================
   9. PAGE: TASK DETAILS (details.html?id=...)
   ========================================================== */
const TYPE_GUIDE = {
  Assignment: ['Read the full brief and list every deliverable.', 'Split it into small parts and give each part a mini-deadline.', 'Do the hardest part first, while you are fresh.', 'Check your work against the brief (and the marking rubric if there is one).', 'Submit early: portals tend to slow down near midnight.'],
  Quiz: ['Write down which lectures or chapters it covers.', 'Close your notes and write what you remember (active recall).', 'Practise sample questions with a timer running.', 'Go back over the questions you got wrong.', 'Get a proper night’s sleep before the quiz.'],
  Project: ['Agree on the scope and who does what with your group.', 'Set milestones: plan → first version → testing → final polish.', 'Keep your files in one shared place and back them up.', 'Test everything well before the deadline.', 'Prepare to explain your own part and the whole project.'],
  Presentation: ['Outline your key points before making any slides.', 'Keep slides light: a few words, strong visuals.', 'Rehearse out loud with a timer at least twice.', 'Prepare answers to the questions you expect.', 'Check the room, projector and file format in advance.'],
  Other: ['Write down exactly what “done” looks like.', 'Block a time slot for it in your planner.', 'Remove distractions: phone in another room.', 'Tick it off here when you finish.']
};

let detailId = null;      // task shown in the modal (null = modal closed)
let modalReturnFocus = null;

function initDetails(){
  rerender = renderDetails;
  detailId = param('id');
  $('#dDone').addEventListener('click', () => { toggleDone(detailId); renderDetails(); });
  $('#dEdit').addEventListener('click', () => openTaskDialog(detailId));
  $('#dDelete').addEventListener('click', () => confirmDeleteTask(detailId, () => { closeTaskModal(true); renderDetails(); }));
  $('#dAddRelated').addEventListener('click', () => { const t = findTask(detailId); openTaskDialog(null, t ? t.course : ''); });

  // any link to a task (list, related, prev/next) opens it in the modal instead of a new page
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="details.html?id="]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    openTaskModal(new URL(link.href).searchParams.get('id'));
  });
  // close: x button, or a click on the backdrop outside the card
  $('#tmClose').addEventListener('click', () => closeTaskModal());
  $('#taskModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeTaskModal(); });
  // Escape closes the modal, unless an edit/confirm dialog is open on top of it (capture runs first)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || $('#taskModal').hidden) return;
    if ($$('.overlay').some(o => !o.hidden)) return;
    closeTaskModal();
  }, true);

  renderDetails();
}

function openTaskModal(id){
  if (!findTask(id)) return;
  const wasOpen = !$('#taskModal').hidden;
  if (!wasOpen) modalReturnFocus = document.activeElement;
  detailId = id;
  history.replaceState(null, '', 'details.html?id=' + encodeURIComponent(id));
  renderDetails();
  $('#detailArticle').scrollTop = 0;
  if (!wasOpen) $('#tmClose').focus();
}

function closeTaskModal(instant){
  const modal = $('#taskModal');
  detailId = null;
  history.replaceState(null, '', 'details.html');
  document.title = 'Task Details · ClassWork OS';
  $('#crumbTitle').textContent = 'Task details';
  document.body.classList.remove('modal-open');
  const finish = () => { modal.hidden = true; modal.classList.remove('closing'); };
  if (instant || modal.hidden) finish();
  else { modal.classList.add('closing'); setTimeout(finish, 180); }
  if (modalReturnFocus && modalReturnFocus.focus && document.contains(modalReturnFocus)) modalReturnFocus.focus();
}

function renderDetails(){
  // the list of every task is always visible behind the modal
  const all = sortedTasks();
  $('#pickerList').innerHTML = all.length
    ? `<div class="rows">${all.map(miniRow).join('')}</div>`
    : '<div class="empty-state">No tasks yet.<br><button class="btn primary" type="button" data-add>Add a task</button></div>';
  const addBtn = $('#pickerList [data-add]'); if (addBtn) addBtn.addEventListener('click', openChooser);

  const t = detailId ? findTask(detailId) : null;
  $('#pickerNote').innerHTML = detailId && !t
    ? `<div class="banner warn"><span class="ic-line">${ICON.warn}That task doesn’t exist any more. It may have been deleted, so pick another one below.</span></div>` : '';
  if (!t){
    if (!$('#taskModal').hidden) closeTaskModal(true);
    detailId = null;
    return;
  }

  const modal = $('#taskModal');
  modal.classList.remove('closing');
  modal.hidden = false;
  document.body.classList.add('modal-open');
  document.title = t.title + ' · ClassWork OS';
  $('#crumbTitle').textContent = t.title;

  const img = $('#dImg');
  img.src = TYPE_IMG[t.type] || TYPE_IMG.Other;
  img.alt = t.type + ' icon';
  $('#dCourse').textContent = t.course;
  $('#dTitle').textContent = t.title;

  // status + countdown (conditional logic)
  const n = daysUntil(t.due);
  const bucket = t.done ? 'done' : bucketOf(t.due);
  let status, cdNum, cdLabel;
  if (t.done){ status = 'Completed'; cdNum = '✓'; cdLabel = 'Done'; }
  else if (n < 0){ status = 'Overdue'; cdNum = -n; cdLabel = (-n === 1 ? 'day' : 'days') + ' overdue'; }
  else if (n === 0){ status = 'Due today'; cdNum = '!'; cdLabel = 'Due today'; }
  else { status = n <= 6 ? 'Due soon' : 'Upcoming'; cdNum = n; cdLabel = (n === 1 ? 'day' : 'days') + ' left'; }
  const statusColor = { done:'c-green', ov:'c-red', sn:'c-amber', lt:'c-muted' }[bucket];
  $('#dChips').innerHTML = `<span class="chip t-${t.type}">${t.type}</span><span class="chip ${statusColor}">${status}</span>`;
  const cd = $('#dCount');
  cd.className = 'countdown ' + bucket;
  cd.innerHTML = `<span class="cd-n">${cdNum}</span><span class="cd-l">${cdLabel}</span>`;

  // overview table
  const rows = [
    ['Course', esc(t.course)], ['Type', t.type], ['Due date', longDate(t.due)],
    ['Time left', t.done ? 'Finished' : relText(t.due)], ['Status', status],
    ['Added', t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Unknown'], ['Last updated', agoText(t.updatedAt) || 'Unknown']
  ];
  $('#dTable').innerHTML = rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');

  const notes = $('#dNotes');
  if (t.notes && t.notes.trim()){ notes.textContent = t.notes; notes.classList.remove('empty'); }
  else { notes.textContent = 'No notes yet. Use Edit to add links, chapters or instructions.'; notes.classList.add('empty'); }

  $('#dGuideIntro').textContent = `A simple plan for tackling ${/^[AEIOU]/.test(t.type) ? 'an' : 'a'} ${t.type.toLowerCase()}:`;
  $('#dGuide').innerHTML = (TYPE_GUIDE[t.type] || TYPE_GUIDE.Other).map(s => `<li>${s}</li>`).join('');

  $('#dDone').innerHTML = t.done ? ICON.undo + 'Undo done' : ICON.check + 'Mark as done';
  $('#dPlan').href = 'interactive.html?task=' + encodeURIComponent(t.id);

  // related: other tasks in the same course
  const related = sortedTasks().filter(x => x.course === t.course && x.id !== t.id);
  $('#dRelatedTitle').textContent = 'More from ' + t.course;
  $('#dRelated').innerHTML = related.length ? `<div class="rows">${related.slice(0, 6).map(miniRow).join('')}</div>` : '<p class="panel-empty">No other tasks for this course yet.</p>';

  // important dates for the same course
  const dates = STATE.dates.filter(d => d.course === t.course && daysUntil(d.date) >= 0).sort((a, b) => parseDue(a.date) - parseDue(b.date));
  $('#dDates').innerHTML = dates.length ? `<div class="rows">${dates.map(dateRow).join('')}</div>` : '<p class="panel-empty">No upcoming exams or dates for this course.</p>';

  // previous / next task by due date
  const i = all.findIndex(x => x.id === t.id);
  const link = (x, label) => `<div><small>${label}</small>${x ? `<a href="details.html?id=${encodeURIComponent(x.id)}">${esc(x.title)}</a>` : '<span>None</span>'}</div>`;
  $('#dPager').innerHTML = link(all[i - 1], '← Previous task') + link(all[i + 1], 'Next task →');
}


/* ==========================================================
   10. PAGE: PLANNER (interactive.html)
   Tool 1: study-plan generator   Tool 2: exams & dates schedule
   ========================================================== */
const EST_HOURS = { Assignment:4, Quiz:3, Project:8, Presentation:5, Other:2 };
const PLAN = { hours:{}, checked:{}, kind:'all', hidePast:true };

function initPlanner(){
  // tabs (click + arrow keys)
  const tabs = $$('[role="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.id === 'tab-schedule' ? 'schedule' : 'plan'));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
        const other = tabs.find(x => x !== tab); other.focus(); other.click();
      }
    });
  });
  activateTab(location.hash === '#schedule' ? 'schedule' : 'plan');

  // form defaults from saved preferences
  $('#p_hours').value = STATE.prefs.hoursPerDay;
  $('#p_start').value = addDaysISO(0);
  $('#p_off').value = STATE.prefs.daysOff;

  // ?task=id → only that task starts ticked
  const only = param('task');
  activeTasks().forEach(t => { PLAN.checked[t.id] = only ? t.id === only : true; });

  $('#planTasks').addEventListener('change', e => {
    const box = e.target;
    if (box.type === 'checkbox') PLAN.checked[box.dataset.id] = box.checked;
    if (box.type === 'number') PLAN.hours[box.dataset.id] = box.value;
  });
  $('#ptAll').addEventListener('click', () => { activeTasks().forEach(t => PLAN.checked[t.id] = true); renderPlanTasks(); });
  $('#ptNone').addEventListener('click', () => { activeTasks().forEach(t => PLAN.checked[t.id] = false); renderPlanTasks(); });
  $('#planForm').addEventListener('submit', onGeneratePlan);

  // schedule tools
  $('#kindFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]'); if (!b) return;
    PLAN.kind = b.dataset.kind; renderSchedule();
  });
  $('#hidePast').addEventListener('change', e => { PLAN.hidePast = e.target.checked; renderSchedule(); });
  $('#addDateBtn').addEventListener('click', () => openDateDialog(null));
  $('#scheduleList').addEventListener('click', e => {
    const ed = e.target.closest('[data-editdate]'), del = e.target.closest('[data-deldate]');
    if (ed) openDateDialog(ed.dataset.editdate);
    if (del) confirmDeleteDate(del.dataset.deldate);
  });

  rerender = () => { renderPlanTasks(); renderSchedule(); };
  rerender();
}

function activateTab(name){
  const isPlan = name === 'plan';
  $('#tab-plan').setAttribute('aria-selected', String(isPlan));
  $('#tab-schedule').setAttribute('aria-selected', String(!isPlan));
  $('#tab-plan').tabIndex = isPlan ? 0 : -1;
  $('#tab-schedule').tabIndex = isPlan ? -1 : 0;
  $('#panel-plan').hidden = !isPlan;
  $('#panel-schedule').hidden = isPlan;
  history.replaceState(null, '', isPlan ? location.pathname + location.search : '#schedule');
}

function renderPlanTasks(){
  const upcoming = activeTasks().filter(t => daysUntil(t.due) >= 0);
  const overdue = activeTasks().filter(t => daysUntil(t.due) < 0);
  const box = $('#planTasks');
  if (!upcoming.length){
    box.innerHTML = '<p class="panel-empty">No upcoming tasks to plan. Add one with the <b>Add</b> button.</p>';
  } else {
    box.innerHTML = upcoming.map(t => {
      if (PLAN.checked[t.id] === undefined) PLAN.checked[t.id] = true;   // new task → ticked
      const hours = PLAN.hours[t.id] !== undefined ? PLAN.hours[t.id] : EST_HOURS[t.type];
      return `<div class="plan-task">
        <input type="checkbox" id="pt_${esc(t.id)}" data-id="${esc(t.id)}"${PLAN.checked[t.id] ? ' checked' : ''}>
        <label class="pt-name" for="pt_${esc(t.id)}">${esc(t.title)}<small>${esc(t.course)} · due ${niceDate(t.due)}</small></label>
        <label class="sr-only" for="ph_${esc(t.id)}">Hours needed for ${esc(t.title)}</label>
        <input type="number" id="ph_${esc(t.id)}" data-id="${esc(t.id)}" min="0.5" max="100" step="0.5" value="${esc(hours)}">
      </div>`;
    }).join('');
  }
  $('#planOverdue').innerHTML = overdue.length
    ? `<span class="ic-line">${ICON.warn}${plural(overdue.length, 'overdue task')} ${overdue.length === 1 ? 'is' : 'are'} not included. Finish ${overdue.length === 1 ? 'it' : 'them'} first!</span>` : '';
}

function onGeneratePlan(e){
  e.preventDefault();
  const err = $('#planErr');
  err.textContent = '';
  const hoursPerDay = parseFloat($('#p_hours').value);
  const start = $('#p_start').value;
  const daysOff = $('#p_off').value;

  if (isNaN(hoursPerDay) || hoursPerDay < 0.5 || hoursPerDay > 16){ err.textContent = 'Study hours per day must be between 0.5 and 16.'; $('#p_hours').focus(); return; }
  if (!start){ err.textContent = 'Please choose a start date.'; $('#p_start').focus(); return; }
  if (daysUntil(start) < 0){ err.textContent = 'The start date can’t be in the past.'; $('#p_start').focus(); return; }

  const items = [];
  for (const t of activeTasks().filter(x => daysUntil(x.due) >= 0)){
    if (!PLAN.checked[t.id]) continue;
    const h = parseFloat($('#ph_' + CSS.escape(t.id)).value);
    if (isNaN(h) || h < 0.5 || h > 100){ err.textContent = `Hours for “${t.title}” must be between 0.5 and 100.`; return; }
    items.push({ task:t, hours:h });
  }
  if (!items.length){ err.textContent = 'Tick at least one task to plan.'; return; }

  STATE.prefs.hoursPerDay = hoursPerDay; STATE.prefs.daysOff = daysOff; savePrefs();
  renderPlan(buildPlan({ hoursPerDay, start, daysOff, items }), hoursPerDay);
}

/* Earliest-deadline-first: each day, fill the free hours with the
   task whose deadline is closest. Work should end the day BEFORE
   the due date (or on the start day if it is due that soon). */
function buildPlan({ hoursPerDay, start, daysOff, items }){
  const isOff = iso => {
    const day = parseDue(iso).getDay();       // 0 = Sunday, 6 = Saturday
    if (daysOff === 'sun') return day === 0;
    if (daysOff === 'satsun') return day === 0 || day === 6;
    return false;
  };
  const work = items.map(it => {
    const lastDay = parseDue(it.task.due) > parseDue(start) ? addDaysISO(-1, it.task.due) : start;
    return { task:it.task, hours:it.hours, left:it.hours, lastDay };
  }).sort((a, b) => parseDue(a.task.due) - parseDue(b.task.due));

  const endDay = work.reduce((max, w) => parseDue(w.lastDay) > parseDue(max) ? w.lastDay : max, start);
  const days = [];
  let available = 0;
  for (let d = start, guard = 0; parseDue(d) <= parseDue(endDay) && guard < 120; d = addDaysISO(1, d), guard++){
    const dueToday = work.filter(w => addDaysISO(1, d) === w.task.due).map(w => w.task);
    if (isOff(d)){ days.push({ date:d, off:true, blocks:[], dueToday }); continue; }
    available += hoursPerDay;
    let free = hoursPerDay;
    const blocks = [];
    for (const w of work){
      if (free <= 0) break;
      if (w.left <= 0 || parseDue(d) > parseDue(w.lastDay)) continue;
      const h = Math.min(free, w.left);
      w.left = Math.round((w.left - h) * 100) / 100;
      free = Math.round((free - h) * 100) / 100;
      blocks.push({ task:w.task, hours:h });
    }
    days.push({ date:d, off:false, blocks, free, dueToday });
  }
  const need = work.reduce((s, w) => s + w.hours, 0);
  return { days, late:work.filter(w => w.left > 0), need, available };
}

function renderPlan(plan, hoursPerDay){
  const { days, late, need, available } = plan;
  let tag, color, msg;
  if (late.length){
    tag = 'OVERLOADED'; color = 'c-red';
    msg = `${plural(late.length, 'task')} can’t be finished in time with ${fmtH(hoursPerDay)} a day. Try more hours per day, fewer days off, or ask for help early.`;
  } else if (need / available > 0.8){
    tag = 'TIGHT'; color = 'c-amber';
    msg = 'Doable, but there is very little slack. Protect your study hours!';
  } else {
    tag = 'COMFORTABLE'; color = 'c-green';
    msg = `You have breathing room: about ${fmtH(available - need)} of spare study time in this plan.`;
  }
  const lateList = late.length
    ? `<ul>${late.map(w => `<li><a href="details.html?id=${encodeURIComponent(w.task.id)}">${esc(w.task.title)}</a>: about <b>${fmtH(w.left)}</b> short (due ${niceDate(w.task.due)})</li>`).join('')}</ul>` : '';

  const dayCards = days.map((d, i) => {
    const head = `<h3><span>${niceDate(d.date)}</span><span>${d.off ? 'off' : d.blocks.length ? fmtH(d.blocks.reduce((s, b) => s + b.hours, 0)) : ''}</span></h3>`;
    const due = d.dueToday.length ? `<p class="due-flag">Due tomorrow: ${d.dueToday.map(t => esc(t.title)).join(', ')}</p>` : '';
    const body = d.off ? '<p class="panel-empty">Day off</p>'
      : d.blocks.length ? `<ul>${d.blocks.map(b => `<li><span class="tdot t-${b.task.type}"></span><a href="details.html?id=${encodeURIComponent(b.task.id)}">${esc(b.task.title)}</a><span class="hrs">${fmtH(b.hours)}</span></li>`).join('')}</ul>`
      : '<p class="panel-empty">Free. Review or rest.</p>';
    return `<article class="day-card${d.off ? ' off' : ''}" style="animation-delay:${Math.min(i, 12) * 30}ms">${head}${body}${due}</article>`;
  }).join('');

  $('#planOut').innerHTML = `<section class="pl-card pl-result"><h2>Your study plan</h2>
    <div class="verdict"><span class="verdict-tag ${color}">${tag}</span><span>${msg}</span></div>${lateList}
    <div class="plan-meta"><div><b>${fmtH(need)}</b><span>Hours needed</span></div><div><b>${fmtH(available)}</b><span>Hours available</span></div><div><b>${days.length}</b><span>Days planned</span></div></div>
    <div class="plan-days">${dayCards}</div>
    <p class="hint">Plans aren’t saved. They’re rebuilt from your tasks each time, so they always match your latest list.</p></section>`;
  $('#planOut').scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderSchedule(){
  $$('#kindFilters [data-kind]').forEach(b => {
    const on = b.dataset.kind === PLAN.kind;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });
  let items = [
    ...STATE.tasks.filter(t => !t.done).map(t => ({ id:t.id, isTask:true, kind:'deadline', date:t.due, title:t.title, course:t.course, time:'', loc:'' })),
    ...STATE.dates.map(d => ({ id:d.id, isTask:false, kind:d.kind, date:d.date, title:d.label || (d.kind === 'exam' ? 'Exam' : 'Important date'), course:d.course, time:d.time || '', loc:d.loc || '' }))
  ];
  if (PLAN.kind !== 'all') items = items.filter(it => it.kind === PLAN.kind);
  if (PLAN.hidePast) items = items.filter(it => daysUntil(it.date) >= 0);
  items.sort((a, b) => parseDue(a.date) - parseDue(b.date));

  const box = $('#scheduleList');
  if (!items.length){
    box.innerHTML = '<div class="empty-state">Nothing scheduled here.<br>Use <b>Add date</b> to add an exam or deadline.</div>';
    return;
  }
  let html = '', month = '';
  for (const it of items){
    const d = parseDue(it.date);
    const m = d.toLocaleDateString(undefined, { month:'long', year:'numeric' });
    if (m !== month){ month = m; html += `<h2 class="month-label">${m.toUpperCase()}</h2>`; }
    const kc = it.kind === 'exam' ? 'k-exam' : it.kind === 'deadline' ? 'k-deadline' : 'k-other';
    const sub = [it.course, it.time, it.loc].filter(Boolean).join(' · ');
    const act = it.isTask
      ? `<a class="btn sm" href="details.html?id=${encodeURIComponent(it.id)}">Open</a>`
      : `<button class="btn sm" type="button" data-editdate="${esc(it.id)}">Edit</button><button class="btn sm danger" type="button" data-deldate="${esc(it.id)}">Delete</button>`;
    html += `<div class="sched-row${daysUntil(it.date) < 0 ? ' past' : ''}"><div class="datebox"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleDateString(undefined, { month:'short' })}</div></div>
      <div class="s-main"><div class="s-title">${esc(it.title)} <span class="kindtag ${kc}">${it.isTask ? 'task' : it.kind}</span></div><div class="s-sub">${esc(sub)} · ${relText(it.date)}</div></div>
      <div class="s-act">${act}</div></div>`;
  }
  box.innerHTML = html;
}


/* ==========================================================
   11. PAGE: STUDY TIPS (topic-specific.html)
   ========================================================== */
const TIPS = [
  { cat:'Focus', title:'The Pomodoro technique', summary:'Work in short, timed bursts with small breaks so your brain stays fresh.', steps:['Pick one task.', 'Work for 25 minutes with no distractions.', 'Take a 5-minute break.', 'After four rounds, take a longer 15–30 minute break.'] },
  { cat:'Focus', title:'Phone out of reach', summary:'Notifications break your concentration even when you don’t reply. Distance beats willpower.', steps:['Put your phone in another room or bag.', 'Turn on Do Not Disturb.', 'Check messages only during breaks.'] },
  { cat:'Memory', title:'Active recall', summary:'Testing yourself makes you remember more than re-reading the same notes.', steps:['Read a section once.', 'Close the book and write down everything you remember.', 'Check what you missed and repeat.'] },
  { cat:'Memory', title:'Spaced repetition', summary:'Review topics at growing gaps (a day later, a few days later, a week later) instead of cramming.', steps:['Make short flashcards for key facts.', 'Review them the next day, then after 3 days, then after a week.', 'Spend more time on the cards you get wrong.'] },
  { cat:'Memory', title:'The Feynman technique', summary:'If you can explain it simply, you understand it. If you can’t, you’ve found your gap.', steps:['Pick a concept.', 'Explain it in plain words as if teaching a friend.', 'Wherever you get stuck, go back to the source.', 'Simplify your explanation again.'] },
  { cat:'Planning', title:'Eat the frog', summary:'Do your hardest or most-dreaded task first. Everything after it feels easier.', steps:['Each evening, choose tomorrow’s “frog”.', 'Start with it before anything else.', 'Small wins can come later.'] },
  { cat:'Planning', title:'Time-blocking', summary:'Give every task a slot in your day instead of a vague “I’ll do it later”.', steps:['List what must be done this week.', 'Assign each item a block on a specific day.', 'Protect those blocks like class times.', 'Use the Planner page to generate blocks for you.'] },
  { cat:'Exams', title:'Practise under exam conditions', summary:'Past papers with a timer show you what you really know and train your pacing.', steps:['Get past papers or sample questions.', 'Set a timer for the real exam length.', 'Mark your answers honestly.', 'Study the topics you lost marks on.'] },
  { cat:'Exams', title:'Night-before checklist', summary:'Reduce panic on exam day by preparing everything the night before.', steps:['Check the exam time and room.', 'Pack your ID card, pens and calculator.', 'Do a light review only, no new topics.', 'Sleep on time.'] },
  { cat:'Wellbeing', title:'Breaks, water and sleep', summary:'Tired brains learn slowly. Regular breaks and enough sleep help you study better.', steps:['Stand up and stretch every hour.', 'Keep water nearby.', 'Keep a regular sleep schedule, especially before exams.'] },
  { cat:'Coding', title:'Rubber-duck debugging', summary:'Explain your code line by line to an object (or a friend). Bugs often reveal themselves while you talk.', steps:['Say what each line is supposed to do.', 'Compare that with what it actually does.', 'Print values to check your assumptions.'] },
  { cat:'Coding', title:'Code a little every day', summary:'Programming is a skill like a language: short daily practice beats one long session a week.', steps:['Solve one small problem a day.', 'Retype examples instead of copy-pasting them.', 'Revisit old code and improve it.'] }
];
const TIPSTATE = { open:{} };

function initTips(){
  $('#tipList').addEventListener('click', e => {
    const b = e.target.closest('[data-tip]'); if (!b) return;
    TIPSTATE.open[b.dataset.tip] = !TIPSTATE.open[b.dataset.tip]; renderTips();
  });
  renderTips();
}

function renderTips(){
  $('#tipList').innerHTML = TIPS.map((t, i) => {
    const open = !!TIPSTATE.open[i];
    return `<article class="tip"><span class="chip c-blue" style="align-self:flex-start">${t.cat}</span>
      <h3>${esc(t.title)}</h3><p>${esc(t.summary)}</p>
      ${open ? `<ul>${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      <button class="btn sm tip-toggle" type="button" data-tip="${i}" aria-expanded="${open}">${open ? 'Hide steps' : 'Show steps'}</button>
    </article>`;
  }).join('');
}


/* ==========================================================
   12. PAGE: FEEDBACK (contact.html): form validation
   This site has no server: nothing is sent or stored. The
   success message says so honestly and offers copy / email.
   ========================================================== */
const RULES = {
   name: v => !v ? 'Please enter your name.'
    : v.length < 2 || v.length > 50 ? 'Use between 2 and 50 characters.'
    : /\d/.test(v) ? 'A name can’t contain numbers.' : '',
  email: v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'That email doesn’t look right (e.g. name@example.com).' : '',
  role: v => !v ? 'Please choose who you are.' : '',
  message: v => v.length < 20 ? `Please write at least 20 characters (${v.length}/20 so far).` : v.length > 500 ? 'Please keep it under 500 characters.' : '',
  consent: v => !v ? 'Please tick this box to continue.' : ''
};
let triedSubmit = false;

function formValues(){
  const f = $('#feedbackForm');
  const checked = name => { const r = f.querySelector(`input[name="${name}"]:checked`); return r ? r.value : ''; };
  return {
    name: $('#f_name').value.trim(), email: $('#f_email').value.trim(), role: $('#f_role').value,
   rating: checked('f_rating'), message: $('#f_msg').value.trim(), consent: $('#f_consent').checked
  };
}
function validateField(name){
  const message = RULES[name](formValues()[name]);
  const wrap = $(`[data-field="${name}"]`);
  wrap.classList.toggle('invalid', !!message);
  wrap.classList.toggle('valid', !message && name !== 'consent');
  $('#err_' + name).textContent = message;
  const input = wrap.querySelector('input, select, textarea');
  if (input) input.setAttribute('aria-invalid', String(!!message));
  return !message;
}

function initContact(){
  const form = $('#feedbackForm');
  $('#f_msg').addEventListener('input', () => {
    const n = $('#f_msg').value.trim().length;
    const counter = $('#msgCount');
    counter.textContent = n + ' / 500';
    counter.className = 'counter ' + (n > 500 ? 'c-red' : n >= 20 ? 'c-green' : '');
  });
  // after the first submit, re-check fields live as the user fixes them
  form.addEventListener('input', e => { if (!triedSubmit) return; const w = e.target.closest('[data-field]'); if (w) validateField(w.dataset.field); });
  form.addEventListener('change', e => { if (!triedSubmit) return; const w = e.target.closest('[data-field]'); if (w) validateField(w.dataset.field); });
  form.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('blur', () => {
    const w = el.closest('[data-field]'); if (w && (triedSubmit || el.value)) validateField(w.dataset.field);
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    triedSubmit = true;
    const bad = Object.keys(RULES).filter(name => !validateField(name));
    const banner = $('#formBanner');
    if (bad.length){
      banner.innerHTML = `<div class="banner err"><span class="ic-line">${ICON.warn}Please fix ${plural(bad.length, 'field')} before continuing.</span></div>`;
      const first = $(`[data-field="${bad[0]}"]`).querySelector('input, select, textarea');
      if (first) first.focus();
      $('#formResult').hidden = true;
      return;
    }
    banner.innerHTML = '';
    showFeedbackResult(formValues());
  });
  form.addEventListener('reset', () => {
    triedSubmit = false;
    setTimeout(() => {
      $$('[data-field]').forEach(w => w.classList.remove('invalid', 'valid'));
      $$('.field-err').forEach(p => p.textContent = '');
      $('#formBanner').innerHTML = ''; $('#msgCount').textContent = '0 / 500'; $('#msgCount').className = 'counter';
    });
  });

  $('#copyBtn').addEventListener('click', copyFeedback);
  $('#newBtn').addEventListener('click', () => { form.reset(); $('#formResult').hidden = true; $('#f_name').focus(); });

  // data controls
  $('#exportBtn').addEventListener('click', exportData);
  $('#sampleBtn').addEventListener('click', () => { loadSampleData(); toast('Sample tasks and dates added'); renderDataStats(); });
  $('#clearBtn').addEventListener('click', () => askConfirm('Clear all your ClassWork data?',
    'Every task, date and course saved in this browser will be deleted. This can’t be undone.',
    () => { clearAllData(); toast('All data cleared'); renderDataStats(); }, 'Clear everything'));
  rerender = renderDataStats;
  renderDataStats();
}

function feedbackText(v){
  return [
    'ClassWork OS feedback',
    'Name: ' + v.name,
    v.email ? 'Email: ' + v.email : '',
    'Role: ' + v.role,
    'About: ' + v.topic,
    v.rating ? 'Rating: ' + v.rating + '/5' : '',
    '',
    v.message
  ].filter((line, i) => line !== '' || i === 5).join('\n');
}
function showFeedbackResult(v){
  const first = v.name.split(' ')[0];
  const text = feedbackText(v);
  $('#resultMsg').textContent = `All good, ${first}! Your feedback passed every check.`;
  $('#fbText').value = text;
  $('#mailLink').href = 'mailto:?subject=' + encodeURIComponent('ClassWork OS feedback: ' + v.topic) + '&body=' + encodeURIComponent(text);
  $('#formResult').hidden = false;
  $('#formResult').scrollIntoView({ behavior:'smooth', block:'start' });
}
function copyFeedback(){
  const area = $('#fbText');
  if (navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(area.value).then(() => toast('Copied to clipboard')).catch(() => fallbackCopy(area));
  } else fallbackCopy(area);
}
function fallbackCopy(area){
  area.select();
  try { document.execCommand('copy'); toast('Copied to clipboard'); }
  catch (e) { toast('Select the text and press Ctrl+C to copy.', 'warn'); }
}
function renderDataStats(){
  $('#dataStats').textContent = `${plural(STATE.tasks.length, 'task')}, ${plural(STATE.dates.length, 'date')} and ${plural(STATE.courses.length, 'course')} saved in this browser.`;
}
function exportData(){
  const blob = new Blob([JSON.stringify({ exported:new Date().toISOString(), tasks:STATE.tasks, dates:STATE.dates, courses:STATE.courses }, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'classwork-data.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Downloaded classwork-data.json');
}


/* ==========================================================
   13. BOOT
   ========================================================== */
loadAll();
seedIfFirstVisit();
mountModals();
initShell();

const PAGE_INIT = { home:initHome, explore:initExplore, details:initDetails, planner:initPlanner, tips:initTips, contact:initContact };
const page = document.body.dataset.page;
if (PAGE_INIT[page]) PAGE_INIT[page]();
