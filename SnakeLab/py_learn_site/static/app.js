// i18n setup with inline resources
const resources = {
  en: { translation: {
    nav: { lesson: "Lesson", chat: "Global Chat", profile: "Profile", settings: "Settings" },
    common: { run: "Run", reset: "Reset" },
    lesson: {
      title: "Print and Variables",
      intro: "In Python, use print(...) to output text or numbers to the console.",
      print_title: "print()",
      print_ex1: "print(1) outputs 1",
      print_ex2: "print(\"a\") outputs a",
      print_ex3: "print(a) is an error if a is not defined",
      quotes_when: "Use quotes for text (strings). No quotes for numbers or variables.",
      vars_title: "Variables",
      vars_text: "A variable stores a value: name = \"Alice\" or count = 3."
    },
    chat: { title: "Global Chat", send: "Send" },
    ui: { lessons: "Lessons" },
    tabs: { theory: "Theory", practice: "Practice" },
    profile: {
      title: "Profile",
      username: "Username",
      display: "Display name",
      avatar: "Avatar",
      save: "Save account",
      accounts: "Accounts",
      add: "Add account",
      note: "You can register once per account slot. Accounts are local to this browser."
    },
    settings: { title: "Settings", theme: "Theme", anim: "Animations", anim_enable: "Enable background animations" },
    themes: { dark: "Dark", light: "Light", rainbow: "Rainbow" },
  }},
  ru: { translation: {
    nav: { lesson: "Урок", chat: "Глобальный чат", profile: "Профиль", settings: "Настройки" },
    common: { run: "Запустить", reset: "Сброс" },
    lesson: {
      title: "print и переменные",
      intro: "В Python используется print(...) для вывода текста и чисел.",
      print_title: "print()",
      print_ex1: "print(1) выведет 1",
      print_ex2: "print(\"a\") выведет a",
      print_ex3: "print(a) — ошибка, если a не определена",
      quotes_when: "Кавычки нужны для текста (строк). Для чисел и переменных кавычки не ставятся.",
      vars_title: "Переменные",
      vars_text: "Переменная хранит значение: name = \"Alice\" или count = 3."
    },
    chat: { title: "Глобальный чат", send: "Отправить" },
    ui: { lessons: "Уроки" },
    tabs: { theory: "Теория", practice: "Практика" },
    profile: {
      title: "Профиль",
      username: "Имя пользователя",
      display: "Отображаемое имя",
      avatar: "Аватар",
      save: "Сохранить аккаунт",
      accounts: "Аккаунты",
      add: "Добавить аккаунт",
      note: "Зарегистрироваться можно один раз на слот. Аккаунты сохраняются в этом браузере."
    },
    settings: { title: "Настройки", theme: "Тема", anim: "Анимации", anim_enable: "Включить анимации фона" },
    themes: { dark: "Тёмная", light: "Светлая", rainbow: "Радужная" },
  }},
  es: { translation: {
    nav: { lesson: "Lección", chat: "Chat global", profile: "Perfil", settings: "Ajustes" },
    common: { run: "Ejecutar", reset: "Reiniciar" },
    lesson: {
      title: "Print y Variables",
      intro: "En Python, usa print(...) para mostrar texto o números.",
      print_title: "print()",
      print_ex1: "print(1) muestra 1",
      print_ex2: "print(\"a\") muestra a",
      print_ex3: "print(a) es un error si a no está definida",
      quotes_when: "Usa comillas para texto. Sin comillas para números o variables.",
      vars_title: "Variables",
      vars_text: "Una variable guarda un valor: name = \"Alice\" o count = 3."
    },
    chat: { title: "Chat global", send: "Enviar" },
    ui: { lessons: "Lecciones" },
    tabs: { theory: "Teoría", practice: "Práctica" },
    profile: {
      title: "Perfil",
      username: "Nombre de usuario",
      display: "Nombre para mostrar",
      avatar: "Avatar",
      save: "Guardar cuenta",
      accounts: "Cuentas",
      add: "Agregar cuenta",
      note: "Puedes registrarte una vez por ranura. Las cuentas son locales de este navegador."
    },
    settings: { title: "Ajustes", theme: "Tema", anim: "Animaciones", anim_enable: "Activar animaciones de fondo" },
    themes: { dark: "Oscuro", light: "Claro", rainbow: "Arcoíris" },
  }}};

// Auth gate: allow if there is a server session OR at least one local account
async function ensureAuth(){
  const onApp = (window.location.pathname === '/app' || window.location.pathname.startsWith('/app/'));
  if(!onApp) return true;
  let serverAuth = false;
  try{
    const me = await fetch('/api/me', { credentials: 'include' }).then(r=>r.json());
    serverAuth = !!(me && me.auth);
  }catch{}
  // Require real server session only (no local pseudo-accounts bypass)
  if(!serverAuth){
    // No access for guests: go to unified login page
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Tabs: Theory / Practice
function setupLessonTabs(){
  const the = document.getElementById('theory');
  const pra = document.getElementById('practice');
  const btns = document.querySelectorAll('.lesson-header .tab');
  if(!the || !pra || !btns.length) return;
  btns.forEach(btn => {
    if(btn._bound) return;
    btn._bound = true;
    btn.addEventListener('click', ()=>{
      btns.forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      if(tab === 'theory'){
        the.classList.add('active');
        pra.classList.remove('active');
        renderLesson();
      } else {
        the.classList.remove('active');
        pra.classList.add('active');
        renderPractice();
      }
    });
  });
}

// Compare outputs ignoring case, punctuation and extra spaces
function normalizeOutput(s){
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // keep letters/numbers, remove punctuation
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

// Sidebar profile card
function updateSidebarProfileCard(){
  const card = document.getElementById('sidebar-profile-card'); if(!card) return;
  const acc = currentIdentity();
  const display = document.getElementById('spc-display');
  const username = document.getElementById('spc-username');
  const avatar = document.getElementById('spc-avatar');
  // Try server-side auth info; fallback to local account
  fetch('/api/me', { credentials: 'include' }).then(r=>r.json()).then(me=>{
    const d = (me && me.auth && me.display) || (acc && acc.display) || 'Guest';
    const u = (me && me.auth && me.email) || (acc && acc.username) || 'guest';
    display.textContent = d;
    username.textContent = u;
  }).catch(()=>{
    const d = (acc && acc.display) || 'Guest';
    const u = (acc && acc.username) || 'guest';
    display.textContent = d;
    username.textContent = u;
  });
  avatar.src = (acc && acc.avatar) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="100%" height="100%" rx="8" fill="%239b7dff"/></svg>';
}

const supportedLangs = ["en","ru","es","fr","de","pt","it","tr","pl","uk","hi","ar","zh","ja","ko"];

async function setupI18n() {
  await i18next.init({
    resources,
    lng: detectLanguage(),
    fallbackLng: "en"
  });
  translatePage();
  populateLangSelect();
  // sync topbar language select
  const top = document.getElementById('lang-select-top');
  const side = document.getElementById('lang-select');
  if(top){
    // populate
    supportedLangs.forEach(l=>{
      const o = document.createElement('option'); o.value=l; o.textContent=l.toUpperCase();
      if(i18next.language===l) o.selected=true; top.appendChild(o);
    });
    top.addEventListener('change', ()=>{
      const target = top.value; try{ localStorage.setItem('lang', target); }catch{}
      i18next.changeLanguage(target).then(()=>{
        translatePage(); currentLessonIndex=0; currentTaskIndex=0; setupLessons();
        if(side) side.value = i18next.language.slice(0,2);
      });
    });
  }
}

function detectLanguage(){
  try {
    const saved = localStorage.getItem('lang');
    if (saved && supportedLangs.includes(saved)) return saved;
  } catch {}
  const nav = navigator.language?.slice(0,2) || "en";
  return supportedLangs.includes(nav) ? nav : "en";
}

function translatePage(){
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = i18next.t(key);
  });
}

function populateLangSelect(){
  const select = document.getElementById("lang-select");
  supportedLangs.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l; opt.textContent = l.toUpperCase();
    if (i18next.language === l) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => {
    const target = select.value;
    try { localStorage.setItem('lang', target); } catch {}
    i18next.changeLanguage(target).then(() => {
      translatePage();
      // Re-render lessons to match language without reload
      currentLessonIndex = 0; currentTaskIndex = 0;
      setupLessons();
      // Ensure the select shows the active language after re-render
      select.value = i18next.language.slice(0,2);
    });
  });
  // If there is a saved language, ensure the select shows it even before change
  try {
    const saved = localStorage.getItem('lang');
    if (saved && supportedLangs.includes(saved)) select.value = saved;
  } catch {}
}

// Navigation
function setupNav(){
  document.querySelectorAll(".sidebar nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sidebar nav button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const section = btn.getAttribute("data-section");
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      const tgt = document.getElementById(section);
      tgt.classList.add("active");
      // animate target section and its first card
      animatePop(tgt);
      const firstCard = tgt.querySelector('.card'); if(firstCard){ animatePop(firstCard); }
    });
  });
}

// Accounts stored locally
const ACCOUNTS_KEY = "pystart_accounts";
const ACTIVE_ACCOUNT_KEY = "pystart_active_idx";
const THEME_KEY = "pystart_theme"; // dark|light|rainbow|midnight|solarized|dracula|pastel|auto
const ANIM_KEY = "pystart_anim";   // 0/1
const ACCENT_KEY = "pystart_accent"; // css color string
const BG_MODE_KEY = "pystart_bg_mode"; // gradient1|gradient2|image
const BG_IMAGE_KEY = "pystart_bg_image"; // base64 image
const FONT_SIZE_KEY = "pystart_font_size"; // small|medium|large
const FONT_FAMILY_KEY = "pystart_font_family"; // sans|serif|mono
const LIGATURES_KEY = "pystart_ligatures"; // 0/1
const ANIM_INT_KEY = "pystart_anim_intensity"; // off|low|normal|max
const SIDEBAR_POS_KEY = "pystart_sidebar_pos"; // left|right
const SIDEBAR_COMPACT_KEY = "pystart_sidebar_compact"; // 0/1
const SIDEBAR_OPACITY_KEY = "pystart_sidebar_opacity"; // 50..100
const LAYOUT_MODE_KEY = "pystart_layout_mode"; // normal|wide|focus|split
function loadAccounts(){
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; } catch { return []; }
}
function saveAccounts(list){ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); }
function currentIdentity(){
  const list = loadAccounts();
  let idx = parseInt(localStorage.getItem(ACTIVE_ACCOUNT_KEY)||"0", 10);
  if(isNaN(idx) || idx < 0 || idx >= list.length) idx = 0;
  return list[idx] || null;
}
function currentAccountIndex(){
  const list = loadAccounts();
  let idx = parseInt(localStorage.getItem(ACTIVE_ACCOUNT_KEY)||"0", 10);
  if(isNaN(idx) || idx < 0 || idx >= list.length) idx = 0;
  return idx;
}
function updateActiveAccount(mut){
  const list = loadAccounts();
  const i = currentAccountIndex();
  if(!list[i]) return;
  // init containers
  list[i].progress = list[i].progress || {}; // { [lessonId]: { doneTasks: { [idx]: true } } }
  list[i].drafts = list[i].drafts || {};     // { [lessonId]: { [taskIdx]: code } }
  mut(list[i]);
  saveAccounts(list);
}

function renderAccounts(){
  const box = document.getElementById("accounts");
  box.innerHTML = "";
  const list = loadAccounts();
  const activeIdx = parseInt(localStorage.getItem(ACTIVE_ACCOUNT_KEY)||"0",10);
  list.forEach((acc, idx) => {
    const row = document.createElement("div");
    row.className = "acc-row";
    const avatar = acc.avatar ? `<img class="acc-avatar" src="${acc.avatar}" alt="avatar"/>` : `<div class="acc-avatar" style="background:linear-gradient(135deg,var(--accent),var(--accent-2));"></div>`;
    const badge = (idx===activeIdx) ? `<span class="badge-active">Active</span>` : "";
    const btnUse = (idx===activeIdx) ? `<button class="ghost small" disabled>Current</button>` : `<button class="ghost small use-account" data-idx="${idx}">Use</button>`;
    const btnRen = `<button class="ghost small rename-account" data-idx="${idx}">Rename</button>`;
    const btnDel = `<button class="ghost small delete-account" data-idx="${idx}">Delete</button>`;
    row.innerHTML = `${avatar}<div>${acc.username} <span class="muted">(${acc.display || ""})</span> ${badge}</div><div style="margin-left:auto; display:flex; gap:6px;">${btnUse}${btnRen}${btnDel}</div>`;
    box.appendChild(row);
  });
  // bind use buttons
  box.querySelectorAll('.use-account').forEach(b=> b.addEventListener('click', ()=>{
    const i = parseInt(b.getAttribute('data-idx'),10);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(i));
    renderAccounts();
    showToast('Active account switched');
  }));
  // rename
  box.querySelectorAll('.rename-account').forEach(b=> b.addEventListener('click', ()=>{
    const i = parseInt(b.getAttribute('data-idx'),10);
    const list = loadAccounts(); if(!list[i]) return;
    const newName = prompt('New username', list[i].username) || list[i].username;
    const newDisplay = prompt('New display name (optional)', list[i].display||'') || list[i].display||'';
    list[i].username = newName; list[i].display = newDisplay; saveAccounts(list); renderAccounts();
  }));
  // delete
  box.querySelectorAll('.delete-account').forEach(b=> b.addEventListener('click', ()=>{
    const i = parseInt(b.getAttribute('data-idx'),10);
    const list = loadAccounts(); if(!list[i]) return;
    if(!confirm(`Delete account ${list[i].username}?`)) return;
    list.splice(i,1); saveAccounts(list);
    const cur = currentAccountIndex(); if(cur>=list.length){ localStorage.setItem(ACTIVE_ACCOUNT_KEY, '0'); }
    renderAccounts(); showToast('Account deleted');
  }));
  // update sidebar profile card
  updateSidebarProfileCard();
  updateGlobalProgressWidget();
}

function setupProfile(){
  const saveBtn = document.getElementById("save-profile");
  const addBtn = document.getElementById("add-account");
  const avatarInput = document.getElementById("avatar");
  let avatarData = null;

  // Prefill fields with current account for editing
  const cur = currentIdentity();
  if(cur){
    const u = document.getElementById("username"); if(u) u.value = cur.username || '';
    const d = document.getElementById("display"); if(d) d.value = cur.display || '';
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', () => {
      const f = avatarInput.files[0];
      if(!f){ avatarData = null; return; }
      const reader = new FileReader();
      reader.onload = () => { avatarData = reader.result; };
      reader.readAsDataURL(f);
    });
  }

  saveBtn.addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const display = document.getElementById("display").value.trim();
    const file = document.getElementById("avatar").files[0];
    if(!username){ showToast("Enter username"); return; }
    const list = loadAccounts();
    const idx = currentAccountIndex();
    const onSave = (newAvatar)=>{
      // If there is an active account, update it; otherwise create first
      if(list[idx]){
        list[idx].username = username;
        list[idx].display = display;
        if(newAvatar!=null){ list[idx].avatar = newAvatar; }
      } else {
        list.push({ username, display, avatar: newAvatar||null });
        if(localStorage.getItem(ACTIVE_ACCOUNT_KEY)===null){ localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(list.length-1)); }
      }
      saveAccounts(list);
      renderAccounts();
      updateSidebarProfileCard();
      showToast("Profile updated");
    };

    if(file){
      const r = new FileReader();
      r.onload = ()=> onSave(r.result);
      r.readAsDataURL(file);
    } else {
      // If no new avatar chosen: keep existing by passing null
      onSave(avatarData===null ? null : avatarData);
    }
  });

  addBtn.addEventListener("click", () => {
    document.getElementById("username").value = "";
    document.getElementById("display").value = "";
  });

  renderAccounts();

  // Bind server-side Logout (auth session)
  const logoutBtn = document.getElementById('logout');
  if(logoutBtn){
    logoutBtn.addEventListener('click', async ()=>{
      try{
        await fetch('/logout', { credentials: 'include' });
      }catch{}
      window.location.href = '/login';
    });
  }
}

// Chat via Socket.IO
let socket;
function setupChat(){
  socket = io();
  socket.on("connect", () => {
    const me = currentIdentity() || { username: "guest", display: "Guest" };
    socket.emit("join", { username: me.username, display: me.display, avatar: me.avatar });
    updateSockStatus('online');
  });
  socket.on("disconnect", () => {
    showToast("Disconnected"); updateSockStatus('offline');
  });
  // history first
  socket.on("history", (arr)=>{
    try{
      (arr||[]).forEach(addChatMessage);
      const box = document.getElementById("chat-box"); if(box){ box.scrollTop = box.scrollHeight; }
    }catch{}
  });
  socket.on("chat", addChatMessage);
  socket.on("system", (m)=> addChatMessage({ username: "system", display: "System", text: m.text, ts: m.ts }));

  document.getElementById("chat-send").addEventListener("click", sendChat);
  document.getElementById("chat-text").addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ sendChat(); }});
}
function addChatMessage(m){
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "msg";
  const avatar = document.createElement('img');
  avatar.className = 'msg-avatar';
  avatar.src = m.avatar || (m.username==='system' ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="100%" height="100%" fill="%237c5cff"/></svg>' : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="100%" height="100%" fill="%239b7dff"/></svg>');
  const name = document.createElement("span");
  name.className = "name"; name.textContent = `${m.display}`;
  const text = document.createElement("span");
  text.textContent = `: ${m.text}`;
  div.appendChild(avatar); div.appendChild(name); div.appendChild(text);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function sendChat(){
  const input = document.getElementById("chat-text");
  const txt = input.value.trim(); if(!txt) return;
  const me = currentIdentity() || { username: "guest", display: "Guest" };
  socket.emit("message", { ...me, text: txt, avatar: me.avatar });
  input.value = "";
}

// Lessons data (localized)
function getLessons(){
  const lang = (i18next.language || 'en').slice(0,2);
  if(lang === 'ru') return [
    {
      id: 'print-basics',
      title: '1. Основы print()',
      theory: `
        <div class="card">
          <h2>Что делает print?</h2>
          <p>Представь, что компьютер — это робот. Он делает то, что мы пишем. <b>print</b> — это как сказать роботу: «скажи вслух вот это». То, что внутри скобок, робот показывает в «консоли» (внизу).</p>
          <ul>
            <li><code>print(1)</code> → робот говорит <code>1</code></li>
            <li><code>print("a")</code> → робот говорит <code>a</code>. Кавычки нужны, когда это <b>текст</b>.</li>
            <li><code>print(a)</code> — ошибка, если <b>a</b> мы не объяснили заранее. Робот не знает, что такое <b>a</b>.</li>
          </ul>
          <p><b>Почему так?</b> Роботу нужно понимать: это слово — просто текст или это имя коробочки с данными. Кавычки — знак «это текст». Без кавычек — значит имя переменной или число.</p>
          <h3>Примеры</h3>
          <pre>print("Привет!")\nprint(2+3)          # можно печатать результат выражения\nprint("2+3 =", 2+3) # печатать текст и числа вместе</pre>
          <h3>Подсказки</h3>
          <ul>
            <li>Внутри кавычек можно ставить пробелы и эмодзи: <code>print("🙂 Ура!")</code></li>
            <li>Если нужны кавычки внутри текста — используй разные: <code>print('Он сказал "привет"')</code></li>
          </ul>
        </div>
      `,
      tasks: [
        { text: "Скажи роботу произнести: Hello, world!", starter: "# Напиши ниже команду, чтобы робот сказал фразу\nprint('Hello, world!')\n", check: async (p)=> (await runAndCapture(p, "print('Hello, world!')\n")).trim()==='Hello, world!' },
        { text: "Положи число 1 в коробочку по имени a и попроси робота сказать, что внутри.", starter: "a=1\nprint(a)\n", check: async (p)=> (await runAndCapture(p, "a=1\nprint(a)\n")).trim()==='1' }
      ]
    },
    {
      id: 'variables',
      title: '2. Переменные',
      theory: `
        <div class="card">
          <h2>Переменные</h2>
          <p>Переменная — это <b>коробочка с именем</b>, в которую мы кладём значение. Так роботу легче запоминать.</p>
          <p>Например: <code>name = "Alice"</code> — в коробочку <b>name</b> кладём текст «Alice». <code>count = 3</code> — в коробочку <b>count</b> кладём число 3.</p>
          <p>Чтобы сказать текст вместе с содержимым коробочки, удобно использовать:</p>
          <ul>
            <li>Запятые: <code>print("Hello", name)</code> — робот скажет «Hello Alice».</li>
            <li>f-строки: <code>print(f"Hello {name}")</code> — в фигурных скобках робот подставит то, что лежит в коробочке.</li>
          </ul>
          <p><b>Почему так?</b> Так мы не переписываем один и тот же текст много раз — меняем содержимое коробочки, и текст сам подстраивается.</p>
          <h3>Типы значений</h3>
          <ul>
            <li><b>int</b> — целые числа: 1, 2, 10</li>
            <li><b>float</b> — числа с точкой: 3.14</li>
            <li><b>str</b> — строки: "Привет"</li>
            <li><b>bool</b> — правда/ложь: True, False</li>
          </ul>
          <pre>x = 5\ny = 2\nprint(x + y)   # 7\nprint(x / y)   # 2.5</pre>
        </div>
      `,
      tasks: [
        { text: "Создай a = 2 и скажи: I have 2 apples (используй f-строку)", starter: "a=2\nprint(f'I have {a} apples')\n", check: async (p)=> (await runAndCapture(p, "a=2\nprint(f'I have {a} apples')\n")).trim()==='I have 2 apples' }
      ]
    },
    {
      id: 'input',
      title: '3. Ввод (input)',
      theory: `
        <div class="card">
          <h2>input()</h2>
          <p><b>input</b> — это «робот задаёт вопрос и ждёт ответ». Ответ всегда приходит <b>строкой</b> (текстом).</p>
          <pre># Обычная программа спросит прямо у тебя\n# name = input("Ваше имя: ")\n# Здесь, в браузере, мы просто притворимся, что ответ уже пришёл:\nname = "Alice"\nprint("Hello", name)</pre>
          <p>Если нужно число — превращаем текст в число: <code>age = int(input())</code>.</p>
          <p><b>Почему так?</b> Потому что всё, что ты печатаешь на клавиатуре — это буквы. Роботу нужно явно сказать: «это число».</p>
          <h3>Примеры</h3>
          <pre># Суммируем два ответа пользователя\n# a = int(input())\n# b = int(input())\n# print(a + b)</pre>
        </div>
      `,
      tasks: [
        { text: "Представь, что человек ответил: Bob. Скажи: Hello Bob.", starter: "name='Bob'\nprint('Hello', name)\n", check: async (p)=> (await runAndCapture(p, "name='Bob'\nprint('Hello', name)\n")).trim()==='Hello Bob' }
      ]
    },
    {
      id: 'if',
      title: '4. Условия (if/else)',
      theory: `
        <div class="card">
          <h2>if/else</h2>
          <p>Иногда роботу нужно выбрать, <b>что делать</b>. Если условие верно — делаем один план, иначе — другой.</p>
          <pre>a = 5\nif a > 3:\n    print('big')  # если правда\nelse:\n    print('small')  # иначе</pre>
          <p><b>Почему так?</b> Так мы учим программу принимать решения: как светофор — если красный, стой; если зелёный, иди.</p>
        </div>
      `,
      tasks: [
        { text: "Если a > 3 — скажи big (иначе не нужно)", starter: "a=5\nif a>3:\n    print('big')\n", check: async (p)=> (await runAndCapture(p, "a=5\nif a>3:\n    print('big')\n")).trim()==='big' }
      ]
    },
    {
      id: 'loops',
      title: '5. Циклы',
      theory: `
        <div class="card">
          <h2>for</h2>
          <p>Цикл — это «сделай много раз». Чтобы не писать одну и ту же команду десять раз, мы пишем цикл.</p>
          <pre>for i in range(3):\n    print(i)  # робот повторит print 3 раза: 0, 1 и 2</pre>
          <p><b>Почему так?</b> Это экономит время и убирает ошибки — меняешь число 3 на 100, и робот сделает 100 повторов.</p>
          <h3>Ещё примеры</h3>
          <pre># печатаем 5 звёздочек в одну строку\ns = ""\nfor _ in range(5):\n    s += "*"\nprint(s)  # *****</pre>
        </div>
      `,
      tasks: [
        { text: "Попроси робота назвать 0, 1, 2 (каждое с новой строки)", starter: "for i in range(3):\n    print(i)\n", check: async (p)=> (await runAndCapture(p, "for i in range(3):\n    print(i)\n")).trim()==='0\n1\n2' }
      ]
    },
    {
      id: 'funcs',
      title: '6. Функции',
      theory: `
        <div class="card">
          <h2>Определение функции</h2>
          <p>Функция — это как мини‑робот внутри программы с именем и инструкцией. Мы можем звать его много раз.</p>
          <pre>def add(a,b):\n    return a+b  # скажи результат назад\nprint(add(2,3))  # 5</pre>
          <p><b>Почему так?</b> Чтобы не повторять один и тот же код, даём имя полезному действию и используем его снова.</p>
          <h3>Ещё пример</h3>
          <pre>def greet(name):\n    print(f"Hello {name}")\n\ngreet("Bob")\ngreet("Ann")</pre>
        </div>
      `,
      tasks: [
        { text: "Сделай мини‑робота add(a,b), чтобы он возвращал сумму. Скажи результат add(2,3)", starter: "def add(a,b):\n    return a+b\nprint(add(2,3))\n", check: async (p)=> (await runAndCapture(p, "def add(a,b):\n    return a+b\nprint(add(2,3))\n")).trim()==='5' }
      ]
    },
    {
      id: 'strings',
      title: '7. Строки',
      theory: `
        <div class="card">
          <h2>Строки</h2>
          <p>Строка — это текст. Можно соединять строки и узнавать длину.</p>
          <pre>s = "Hi" + "!"\nprint(len(s))  # 3</pre>
          <p><b>Почему так?</b> Текст — это список символов. Его можно собирать и измерять.</p>
        </div>
      `,
      tasks: [
        { text: "Соедини 'Py' и 'thon' и скажи результат", starter: "print('Py' + 'thon')\n", check: async (p)=> (await runAndCapture(p, "print('Py' + 'thon')\n")).trim()==='Python' }
      ]
    },
    {
      id: 'lists',
      title: '8. Списки',
      theory: `
        <div class="card">
          <h2>Списки</h2>
          <p>Список — это коробка с несколькими вещами по порядку.</p>
          <pre>nums = [1,2,3]\nnums.append(4)\nprint(len(nums))  # 4</pre>
        </div>
      `,
      tasks: [
        { text: "Создай список [1,2,3] и добавь 4, затем выведи длину", starter: "nums=[1,2,3]\nnums.append(4)\nprint(len(nums))\n", check: async (p)=> (await runAndCapture(p, "nums=[1,2,3]\nnums.append(4)\nprint(len(nums))\n")).trim()==='4' }
      ]
    },
    {
      id: 'while',
      title: '9. Цикл while',
      theory: `
        <div class="card">
          <h2>while</h2>
          <p>Повторяем, пока условие истинно.</p>
          <pre>i=1; s=0\nwhile i<=3:\n    s+=i\n    i+=1\nprint(s)  # 6</pre>
        </div>
      `,
      tasks: [
        { text: "Суммируй 1..5 и скажи сумму", starter: "i=1\ns=0\nwhile i<=5:\n    s+=i\n    i+=1\nprint(s)\n", check: async (p)=> (await runAndCapture(p, "i=1\ns=0\nwhile i<=5:\n    s+=i\n    i+=1\nprint(s)\n")).trim()==='15' }
      ]
    },
    {
      id: 'defaults',
      title: '10. Параметры по умолчанию',
      theory: `
        <div class="card">
          <h2>Аргументы по умолчанию</h2>
          <p>Если имя не передали — используем стандартное.</p>
          <pre>def hello(name="World"):\n    print("Hello", name)\nhello()  # Hello World</pre>
        </div>
      `,
      tasks: [
        { text: "Создай hello с name='World' по умолчанию и вызови без аргументов", starter: "def hello(name='World'):\n    print('Hello', name)\nhello()\n", check: async (p)=> (await runAndCapture(p, "def hello(name='World'):\n    print('Hello', name)\nhello()\n")).trim()==='Hello World' }
      ]
    },
    {
      id: 'exceptions',
      title: '11. Исключения',
      theory: `
        <div class="card">
          <h2>try/except</h2>
          <p>Ошибки можно ловить и отвечать вежливо.</p>
          <pre>text = "12a"\ntry:\n    n = int(text)\n    print(n)\nexcept ValueError:\n    print('not a number')</pre>
        </div>
      `,
      tasks: [
        { text: "Пусть text='12a'. Поймай ошибку и скажи 'not a number'", starter: "text='12a'\ntry:\n    n=int(text)\n    print(n)\nexcept ValueError:\n    print('not a number')\n", check: async (p)=> (await runAndCapture(p, "text='12a'\ntry:\n    n=int(text)\n    print(n)\nexcept ValueError:\n    print('not a number')\n")).trim()==='not a number' }
      ]
    },
    {
      id: 'slicing',
      title: '12. Срезы',
      theory: `
        <div class="card">
          <h2>Срезы</h2>
          <p>Можно брать кусочек строки или списка: <code>obj[start:end]</code> (end не включается).</p>
          <pre>text = "python"\nprint(text[0:2])  # py\nprint(text[-3:])  # hon</pre>
          <h3>Почему так?</h3>
          <p>Срез помогает быстро получить часть без циклов. Левая граница включается, правая — нет: так удобно считать длину куска (<code>end - start</code>).</p>
          <h3>Подсказки</h3>
          <ul>
            <li><code>obj[:3]</code> — от начала до 3 (не включая 3).</li>
            <li><code>obj[3:] </code> — от 3 до конца.</li>
            <li><code>obj[::2]</code> — каждый второй символ.</li>
          </ul>
        </div>
      `,
      tasks: [
        { text: "Из 'python' возьми 'py'", starter: "text='python'\nprint(text[0:2])\n", check: async (p)=> (await runAndCapture(p, "text='python'\nprint(text[0:2])\n")).trim()==='py' }
      ]
    },
    {
      id: 'dicts',
      title: '13. Словари',
      theory: `
        <div class="card">
          <h2>Словари</h2>
          <p>Словарь хранит пары ключ→значение.</p>
          <pre>user = {"name":"Ann", "age":12}\nprint(user["name"])  # Ann</pre>
          <h3>Почему так?</h3>
          <p>Когда нужен быстрый доступ по имени (ключу), словарь — лучший выбор: не нужно искать по списку.</p>
          <h3>Подсказки</h3>
          <pre>user["city"] = "Rome"      # добавление\nprint("age" in user)     # True — есть ли ключ\nprint(user.get("phone", "—"))  # безопасное чтение</pre>
        </div>
      `,
      tasks: [
        { text: "Создай словарь с name='Bob' и выведи имя", starter: "user={'name':'Bob','age':10}\nprint(user['name'])\n", check: async (p)=> (await runAndCapture(p, "user={'name':'Bob','age':10}\nprint(user['name'])\n")).trim()==='Bob' }
      ]
    },
    {
      id: 'sets',
      title: '14. Множества',
      theory: `
        <div class="card">
          <h2>Множества</h2>
          <p>Множество хранит уникальные элементы.</p>
          <pre>s = {1,2,2,3}\nprint(len(s))  # 3</pre>
          <h3>Почему так?</h3>
          <p>Множества автоматически убирают дубликаты и быстро отвечают «есть ли элемент?».</p>
          <h3>Операции</h3>
          <pre>{1,2,3} | {3,4}  # объединение — {1,2,3,4}\n{1,2,3} & {2,3}  # пересечение — {2,3}</pre>
        </div>
      `,
      tasks: [
        { text: "Создай множество из [1,1,2,3] и выведи длину", starter: "s=set([1,1,2,3])\nprint(len(s))\n", check: async (p)=> (await runAndCapture(p, "s=set([1,1,2,3])\nprint(len(s))\n")).trim()==='3' }
      ]
    },
    {
      id: 'casting',
      title: '15. Преобразование типов',
      theory: `
        <div class="card">
          <h2>int, float, str</h2>
          <p>Меняем типы, когда нужно: <code>int("5")</code>, <code>str(5)</code>, <code>float("3.5")</code>.</p>
          <h3>Почему так?</h3>
          <p>Ответ из <code>input()</code> — всегда строка. Чтобы считать, переводим в число. А чтобы красиво выводить — обратно в строку.</p>
          <h3>Подсказки</h3>
          <pre>price = 10\nprint("Цена: "+str(price))  # склеиваем текст и число</pre>
        </div>
      `,
      tasks: [
        { text: "Преобразуй строку '5' в число и прибавь 2", starter: "print(int('5')+2)\n", check: async (p)=> (await runAndCapture(p, "print(int('5')+2)\n")).trim()==='7' }
      ]
    },
    {
      id: 'format',
      title: '16. Форматирование строк',
      theory: `
        <div class="card">
          <h2>f-строки и format</h2>
          <pre>name='Ann'\nprint(f"Hi {name}")\nprint("Hi {}".format(name))</pre>
          <h3>Почему так?</h3>
          <p>f-строки делают текст с подстановками читаемым и коротким. Подставляются значения прямо внутри фигурных скобок.</p>
          <h3>Примеры</h3>
          <pre>a=3.14159\nprint(f"pi ≈ {a:.2f}")   # pi ≈ 3.14\nuser={"name":"Ann","age":12}\nprint(f"{user['name']} is {user['age']}")</pre>
        </div>
      `,
      tasks: [
        { text: "Скажи: Hi Alice (через f-строку)", starter: "name='Alice'\nprint(f'Hi {name}')\n", check: async (p)=> (await runAndCapture(p, "name='Alice'\nprint(f'Hi {name}')\n")).trim()==='Hi Alice' }
      ]
    },
    {
      id: 'modules',
      title: '17. Модули',
      theory: `
        <div class="card">
          <h2>math / random</h2>
          <pre>import math, random\nprint(math.sqrt(9))    # 3.0\nprint(random.randint(1,3))  # 1..3</pre>
          <h3>Почему так?</h3>
          <p>Модули — это готовые «наборы инструментов». Мы берём нужные функции, чтобы не изобретать заново.</p>
          <h3>Подсказки</h3>
          <pre>from math import sqrt\nprint(sqrt(16))  # 4.0</pre>
        </div>
      `,
      tasks: [
        { text: "Импортируй math и выведи корень из 16", starter: "import math\nprint(math.sqrt(16))\n", check: async (p)=> (await runAndCapture(p, "import math\nprint(math.sqrt(16))\n")).trim()==='4.0' }
      ]
    }
  ];

  // Spanish (ES) localized lessons
  if(lang === 'es') return [
    {
      id: 'print-basics',
      title: '1. Básicos de print() (como para niños)',
      theory: `
        <div class="card">
          <h2>¿Qué hace print?</h2>
          <p>Imagina que el ordenador es un robot. <b>print</b> es “di esto en voz alta”. Lo que va dentro de los paréntesis aparece abajo.</p>
          <ul>
            <li><code>print(1)</code> → muestra <code>1</code></li>
            <li><code>print("a")</code> → muestra <code>a</code> (comillas = texto)</li>
            <li><code>print(a)</code> → error si <b>a</b> no existe todavía</li>
          </ul>
        </div>
      `,
      tasks: [
        { text: "Pídele al robot que diga: Hello, world!", starter: "print('Hello, world!')\n", check: async (p)=> (await runAndCapture(p, "print('Hello, world!')\n")).trim()==='Hello, world!' },
        { text: "Pon el número 1 en la caja llamada a y muéstralo", starter: "a=1\nprint(a)\n", check: async (p)=> (await runAndCapture(p, "a=1\nprint(a)\n")).trim()==='1' }
      ]
    },
    {
      id: 'variables',
      title: '2. Variables',
      theory: `
        <div class="card">
          <h2>Variables: cajitas con nombre</h2>
          <p><code>name = "Alice"</code>, <code>count = 3</code>. Con f-Strings es fácil: <code>print(f"Hello {name}")</code>.</p>
        </div>
      `,
      tasks: [
        { text: "Haz a = 2 y di: I have 2 apples", starter: "a=2\nprint(f'I have {a} apples')\n", check: async (p)=> (await runAndCapture(p, "a=2\nprint(f'I have {a} apples')\n")).trim()==='I have 2 apples' }
      ]
    },
    {
      id: 'input',
      title: '3. input()',
      theory: `
        <div class="card">
          <h2>El robot pregunta</h2>
          <p><b>input</b> pide texto. Para números usamos <code>int(input())</code>.</p>
        </div>
      `,
      tasks: [
        { text: "Imagina que la respuesta es Bob y di: Hello Bob", starter: "name='Bob'\nprint('Hello', name)\n", check: async (p)=> (await runAndCapture(p, "name='Bob'\nprint('Hello', name)\n")).trim()==='Hello Bob' }
      ]
    },
    {
      id: 'osint-intro',
      title: 'OSINT — introducción (sé amable)',
      theory: `
        <div class="card">
          <h2>Solo para buenos usos</h2>
          <p>OSINT es buscar información <b>pública</b>. Aprende y ayuda, no dañes. Respeta leyes y reglas.</p>
        </div>
      `,
      tasks: [
        { text: "Escribe agree para prometer buen uso", starter: "print('agree')\n", check: async (p)=> (await runAndCapture(p, "print('agree')\n")).trim()==='agree' }
      ]
    },
    {
      id: 'osint-search',
      title: 'OSINT‑1: Operadores de búsqueda',
      theory: `
        <div class="card">
          <h2>Busca más inteligente</h2>
          <ul>
            <li><code>site:</code>, <code>filetype:</code>, <code>"frase exacta"</code>, <code>-palabra</code></li>
          </ul>
        </div>
      `,
      tasks: [
        { text: 'PDF en example.org con "security report"', starter: "query = ''\n", check: async (p)=>{ const out=(await runAndCapture(p,'print(query)')).trim().toLowerCase(); return out.includes('site:example.org') && out.includes('filetype:pdf') && out.includes('security report'); } },
        { text: 'Añade -draft y -beta', starter: "query = 'site:example.org filetype:pdf \"security report\"'\n", check: async (p)=>{ const out=(await runAndCapture(p,'print(query)')).trim().toLowerCase(); return out.includes('-draft')&&out.includes('-beta'); } }
      ]
    },
    {
      id: 'first-cli',
      title: 'Mini‑proyecto: tu primer programa (CLI)',
      theory: `
        <div class="card"><h2>Idea → Entrada → Trabajo → Salida</h2></div>
      `,
      tasks: [
        { text: "greet('World') debe decir Hello, World!", starter: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('World'))\n", check: async (p)=> (await runAndCapture(p, "def greet(name):\n    return f'Hello, {name}!'\nprint(greet('World'))\n")).trim()==='Hello, World!' }
      ]
    }
  ];

  // German (DE) localized lessons
  if(lang === 'de') return [
    {
      id: 'print-basics',
      title: '1. print() Grundlagen (kinderleicht)',
      theory: `
        <div class="card">
          <h2>Was macht print?</h2>
          <p>Denk dir: Der Computer ist ein Roboter. <b>print</b> heißt: „Sag das laut.“</p>
          <ul>
            <li><code>print(1)</code> → zeigt <code>1</code></li>
            <li><code>print("a")</code> → zeigt <code>a</code> (Anführungszeichen = Text)</li>
            <li><code>print(a)</code> → Fehler, wenn <b>a</b> nicht existiert</li>
          </ul>
        </div>
      `,
      tasks: [
        { text: "Sag: Hello, world!", starter: "print('Hello, world!')\n", check: async (p)=> (await runAndCapture(p, "print('Hello, world!')\n")).trim()==='Hello, world!' },
        { text: "Lege 1 in a und gib es aus", starter: "a=1\nprint(a)\n", check: async (p)=> (await runAndCapture(p, "a=1\nprint(a)\n")).trim()==='1' }
      ]
    },
    {
      id: 'variables',
      title: '2. Variablen',
      theory: `
        <div class="card">
          <h2>Kästchen mit Namen</h2>
          <p><code>name = "Alice"</code>, <code>count = 3</code>. Mit f-Strings: <code>print(f"Hello {name}")</code>.</p>
        </div>
      `,
      tasks: [
        { text: "a = 2 und sage: I have 2 apples", starter: "a=2\nprint(f'I have {a} apples')\n", check: async (p)=> (await runAndCapture(p, "a=2\nprint(f'I have {a} apples')\n")).trim()==='I have 2 apples' }
      ]
    },
    {
      id: 'input',
      title: '3. input()',
      theory: `
        <div class="card">
          <h2>Der Roboter fragt</h2>
          <p><b>input</b> gibt Text. Für Zahlen: <code>int(input())</code>.</p>
        </div>
      `,
      tasks: [
        { text: "Stell dir vor, die Antwort ist Bob und sage: Hello Bob", starter: "name='Bob'\nprint('Hello', name)\n", check: async (p)=> (await runAndCapture(p, "name='Bob'\nprint('Hello', name)\n")).trim()==='Hello Bob' }
      ]
    },
    {
      id: 'osint-intro',
      title: 'OSINT — Einleitung (bleib nett)',
      theory: `
        <div class="card"><h2>Nur für gute Zwecke</h2><p>OSINT = <b>öffentliche</b> Infos suchen und prüfen. Gesetze und Regeln beachten.</p></div>
      `,
      tasks: [
        { text: "Schreibe agree", starter: "print('agree')\n", check: async (p)=> (await runAndCapture(p, "print('agree')\n")).trim()==='agree' }
      ]
    },
    {
      id: 'osint-search',
      title: 'OSINT‑1: Suchoperatoren',
      theory: `
        <div class="card"><p><code>site:</code>, <code>filetype:</code>, <code>"genaue phrase"</code>, <code>-wort</code></p></div>
      `,
      tasks: [
        { text: "PDF auf example.org mit 'security report'", starter: "query = ''\n", check: async (p)=>{ const out=(await runAndCapture(p,'print(query)')).trim().toLowerCase(); return out.includes('site:example.org') && out.includes('filetype:pdf') && out.includes('security report'); } }
      ]
    },
    {
      id: 'first-cli',
      title: 'Mini‑Projekt: deine erste App (CLI)',
      theory: `<div class="card"><h2>Idee → Eingabe → Arbeit → Ausgabe</h2></div>`,
      tasks: [
        { text: "greet('World') soll Hello, World! ausgeben", starter: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('World'))\n", check: async (p)=> (await runAndCapture(p, "def greet(name):\n    return f'Hello, {name}!'\nprint(greet('World'))\n")).trim()==='Hello, World!' }
      ]
    }
  ];

  // English default
  return [
    {
      id: 'print-basics',
      title: '1. print() basics',
      theory: `
        <div class="card">
          <h2>What does print do?</h2>
          <p>Imagine the computer is a helper robot. <b>print</b> means: “say this out loud.” Whatever is inside the brackets will be shown in the console.</p>
          <ul>
            <li><code>print(1)</code> → <code>1</code></li>
            <li><code>print("a")</code> → <code>a</code> (quotes mean text)</li>
            <li><code>print(a)</code> → error if <code>a</code> wasn’t explained before</li>
          </ul>
          <p><b>Why?</b> The robot must know: is it plain text or the name of a box with data? Quotes = text. No quotes = number or variable.</p>
        </div>
      `,
      tasks: [
        { text: "Ask the robot to say: Hello, world!", starter: "print('Hello, world!')\n", check: async (p)=> (await runAndCapture(p, "print('Hello, world!')\n")).trim()==='Hello, world!' },
        { text: "Put number 1 into a box named a and tell the robot to say it.", starter: "a=1\nprint(a)\n", check: async (p)=> (await runAndCapture(p, "a=1\nprint(a)\n")).trim()==='1' }
      ]
    },
    {
      id: 'variables',
      title: '2. Variables',
      theory: `
        <div class="card">
          <h2>Variables</h2>
          <p>A variable is a <b>named box</b> for a value. The robot can remember and use it later.</p>
          <p>Examples: <code>name = "Alice"</code>, <code>count = 3</code>.</p>
          <p>To mix text and variable values, use commas or f-strings:</p>
          <pre>name = "Alice"\nprint("Hello", name)\nprint(f"Hello {name}")</pre>
          <p><b>Why?</b> We avoid repeating the same text — we change the box content, and the sentence updates automatically.</p>
        </div>
      `,
      tasks: [
        { text: "Make a = 2 and say: I have 2 apples (use an f-string)", starter: "a=2\nprint(f'I have {a} apples')\n", check: async (p)=> (await runAndCapture(p, "a=2\nprint(f'I have {a} apples')\n")).trim()==='I have 2 apples' }
      ]
    },
    {
      id: 'input',
      title: '3. Input',
      theory: `
        <div class="card">
          <h2>input()</h2>
          <p><b>input</b> means the robot asks a question and waits for your answer. The answer is a <b>string</b> (text).</p>
          <pre># name = input("Your name: ")\nname = "Alice"\nprint("Hello", name)</pre>
          <p>To read numbers: <code>age = int(input())</code> — we turn text into a number.</p>
          <p><b>Why?</b> Keyboard gives letters, not numbers. We must convert when we need math.</p>
        </div>
      `,
      tasks: [
        { text: "Pretend the answer is 'Bob' and say: Hello Bob", starter: "name='Bob'\nprint('Hello', name)\n", check: async (p)=> (await runAndCapture(p, "name='Bob'\nprint('Hello', name)\n")).trim()==='Hello Bob' }
      ]
    },
    {
      id: 'if',
      title: '4. If/Else',
      theory: `
        <div class="card">
          <h2>if/else</h2>
          <p>Sometimes we need a choice. If the condition is true — do one plan, otherwise — another.</p>
          <pre>a = 5\nif a > 3:\n    print('big')\nelse:\n    print('small')</pre>
          <p><b>Why?</b> This is how programs make decisions, like a traffic light.</p>
        </div>
      `,
      tasks: [
        { text: "If a > 3 — say big (else nothing)", starter: "a=5\nif a>3:\n    print('big')\n", check: async (p)=> (await runAndCapture(p, "a=5\nif a>3:\n    print('big')\n")).trim()==='big' }
      ]
    },
    {
      id: 'loops',
      title: '5. Loops',
      theory: `
        <div class="card">
          <h2>for</h2>
          <p>Loop means “do many times”. No need to write the same line again and again.</p>
          <pre>for i in range(3):\n    print(i)  # 0 1 2</pre>
          <p><b>Why?</b> It saves time and avoids errors. Change 3 to 100 — and you get 100 repeats.</p>
        </div>
      `,
      tasks: [
        { text: "Say 0, 1, 2 (each on a new line)", starter: "for i in range(3):\n    print(i)\n", check: async (p)=> (await runAndCapture(p, "for i in range(3):\n    print(i)\n")).trim()==='0\n1\n2' }
      ]
    },
    {
      id: 'funcs',
      title: '6. Functions',
      theory: `
        <div class="card">
          <h2>Define a function</h2>
          <p>A function is like a tiny helper with a name. We teach it once and call it many times.</p>
          <pre>def add(a,b):\n    return a+b\nprint(add(2,3))  # 5</pre>
          <p><b>Why?</b> Reuse the same useful action instead of copying code.</p>
        </div>
      `,
      tasks: [
        { text: "Create add(a,b) that returns a+b and say the result of add(2,3)", starter: "def add(a,b):\n    return a+b\nprint(add(2,3))\n", check: async (p)=> (await runAndCapture(p, "def add(a,b):\n    return a+b\nprint(add(2,3))\n")).trim()==='5' }
      ]
    },
    {
      id: 'strings',
      title: '7. Strings',
      theory: `
        <div class="card">
          <h2>Strings</h2>
          <p>String is text. You can join strings and measure length.</p>
          <pre>s = "Hi" + "!"\nprint(len(s))  # 3</pre>
          <h3>More</h3>
          <pre>name = "Alice"\nprint(name.upper())  # ALICE\nprint(name[0])       # A\nprint(name[-1])      # e</pre>
        </div>
      `,
      tasks: [
        { text: "Join 'Py' and 'thon' and say the result", starter: "print('Py' + 'thon')\n", check: async (p)=> (await runAndCapture(p, "print('Py' + 'thon')\n")).trim()==='Python' }
      ]
    },
    {
      id: 'lists',
      title: '8. Lists',
      theory: `
        <div class="card">
          <h2>Lists</h2>
          <p>A list holds several items in order.</p>
          <pre>nums = [1,2,3]\nnums.append(4)\nprint(len(nums))  # 4</pre>
          <h3>More</h3>
          <pre>letters = ['a','b','c']\nprint(letters[1])  # b\nletters[0] = 'z'\nprint(letters)     # ['z','b','c']</pre>
        </div>
      `,
      tasks: [
        { text: "Create [1,2,3], append 4, then print length", starter: "nums=[1,2,3]\nnums.append(4)\nprint(len(nums))\n", check: async (p)=> (await runAndCapture(p, "nums=[1,2,3]\nnums.append(4)\nprint(len(nums))\n")).trim()==='4' }
      ]
    },
    {
      id: 'while',
      title: '9. While loop',
      theory: `
        <div class="card">
          <h2>while</h2>
          <p>Repeat while the condition is true.</p>
          <pre>i=1; s=0\nwhile i<=3:\n    s+=i\n    i+=1\nprint(s)  # 6</pre>
          <h3>Be careful</h3>
          <p>Always change variables inside the loop, or it may run forever.</p>
        </div>
      `,
      tasks: [
        { text: "Sum 1..5 and say the sum", starter: "i=1\ns=0\nwhile i<=5:\n    s+=i\n    i+=1\nprint(s)\n", check: async (p)=> (await runAndCapture(p, "i=1\ns=0\nwhile i<=5:\n    s+=i\n    i+=1\nprint(s)\n")).trim()==='15' }
      ]
    },
    {
      id: 'defaults',
      title: '10. Default arguments',
      theory: `
        <div class="card">
          <h2>Defaults</h2>
          <p>If no name is given — use a default value.</p>
          <pre>def hello(name="World"):\n    print("Hello", name)\nhello()  # Hello World</pre>
        </div>
      `,
      tasks: [
        { text: "Create hello with default 'World' and call with no args", starter: "def hello(name='World'):\n    print('Hello', name)\nhello()\n", check: async (p)=> (await runAndCapture(p, "def hello(name='World'):\n    print('Hello', name)\nhello()\n")).trim()==='Hello World' }
      ]
    },
    {
      id: 'exceptions',
      title: '11. Exceptions',
      theory: `
        <div class="card">
          <h2>try/except</h2>
          <p>Catch errors and respond nicely.</p>
          <pre>text = "12a"\ntry:\n    n = int(text)\n    print(n)\nexcept ValueError:\n    print('not a number')</pre>
        </div>
      `,
      tasks: [
        { text: "Let text='12a'. Catch error and say 'not a number'", starter: "text='12a'\ntry:\n    n=int(text)\n    print(n)\nexcept ValueError:\n    print('not a number')\n", check: async (p)=> (await runAndCapture(p, "text='12a'\ntry:\n    n=int(text)\n    print(n)\nexcept ValueError:\n    print('not a number')\n")).trim()==='not a number' }
      ]
    },
    {
      id: 'slicing',
      title: '12. Slicing',
      theory: `
        <div class="card">
          <h2>Slices</h2>
          <p>Take a piece of a string or list: <code>obj[start:end]</code> (end is not included).</p>
          <pre>text = "python"\nprint(text[0:2])  # py\nprint(text[-3:])  # hon</pre>
          <h3>Why?</h3>
          <p>Fast way to get a part without loops. Left bound is inclusive, right bound is exclusive → easy to count length.</p>
          <h3>Tips</h3>
          <ul>
            <li><code>obj[:3]</code> — from start to index 3 (excluded).</li>
            <li><code>obj[3:]</code> — from index 3 to end.</li>
            <li><code>obj[::2]</code> — every second item.</li>
          </ul>
        </div>
      `,
      tasks: [
        { text: "From 'python' take 'py'", starter: "text='python'\nprint(text[0:2])\n", check: async (p)=> (await runAndCapture(p, "text='python'\nprint(text[0:2])\n")).trim()==='py' }
      ]
    },
    {
      id: 'dicts',
      title: '13. Dictionaries',
      theory: `
        <div class="card">
          <h2>Dict</h2>
          <p>Key→value storage.</p>
          <pre>user = {"name":"Ann", "age":12}\nprint(user["name"])  # Ann</pre>
          <h3>Why?</h3>
          <p>Use dicts when you need quick access by name (key) without searching a list.</p>
          <h3>Tips</h3>
          <pre>user["city"] = "Rome"\nprint("age" in user)\nprint(user.get("phone", "—"))</pre>
        </div>
      `,
      tasks: [
        { text: "Create dict with name='Bob' and print name", starter: "user={'name':'Bob','age':10}\nprint(user['name'])\n", check: async (p)=> (await runAndCapture(p, "user={'name':'Bob','age':10}\nprint(user['name'])\n")).trim()==='Bob' }
      ]
    },
    {
      id: 'sets',
      title: '14. Sets',
      theory: `
        <div class="card">
          <h2>Set</h2>
          <p>Keeps unique items.</p>
          <pre>s = {1,2,2,3}\nprint(len(s))  # 3</pre>
          <h3>Why?</h3>
          <p>Sets remove duplicates automatically and are fast for membership checks.</p>
          <h3>Ops</h3>
          <pre>{1,2,3} | {3,4}  # union\n{1,2,3} & {2,3}  # intersection</pre>
        </div>
      `,
      tasks: [
        { text: "Create a set from [1,1,2,3] and print length", starter: "s=set([1,1,2,3])\nprint(len(s))\n", check: async (p)=> (await runAndCapture(p, "s=set([1,1,2,3])\nprint(len(s))\n")).trim()==='3' }
      ]
    },
    {
      id: 'casting',
      title: '15. Type casting',
      theory: `
        <div class="card">
          <h2>int, float, str</h2>
          <p>Convert when needed: <code>int("5")</code>, <code>str(5)</code>, <code>float("3.5")</code>.</p>
          <h3>Why?</h3>
          <p><code>input()</code> returns strings. Convert to numbers for math; to strings for pretty output.</p>
          <h3>Tip</h3>
          <pre>price = 10\nprint("Price: "+str(price))</pre>
        </div>
      `,
      tasks: [
        { text: "Convert '5' to number and add 2", starter: "print(int('5')+2)\n", check: async (p)=> (await runAndCapture(p, "print(int('5')+2)\n")).trim()==='7' }
      ]
    },
    {
      id: 'format',
      title: '16. String formatting',
      theory: `
        <div class="card">
          <h2>f-strings and format</h2>
          <pre>name='Ann'\nprint(f"Hi {name}")\nprint("Hi {}".format(name))</pre>
          <h3>Why?</h3>
          <p>f-strings are short and readable: values go inside curly braces.</p>
          <h3>Examples</h3>
          <pre>a=3.14159\nprint(f"pi ≈ {a:.2f}")\nuser={"name":"Ann","age":12}\nprint(f"{user['name']} is {user['age']}")</pre>
        </div>
      `,
      tasks: [
        { text: "Say: Hi Alice (use f-string)", starter: "name='Alice'\nprint(f'Hi {name}')\n", check: async (p)=> (await runAndCapture(p, "name='Alice'\nprint(f'Hi {name}')\n")).trim()==='Hi Alice' }
      ]
    },
    {
      id: 'modules',
      title: '17. Modules',
      theory: `
        <div class="card">
          <h2>math / random</h2>
          <pre>import math, random\nprint(math.sqrt(9))    # 3.0\nprint(random.randint(1,3))  # 1..3</pre>
          <h3>Why?</h3>
          <p>Modules are toolboxes: reuse ready-made functions instead of reinventing.</p>
          <h3>Tip</h3>
          <pre>from math import sqrt\nprint(sqrt(16))</pre>
        </div>
      `,
      tasks: [
        { text: "Import math and print sqrt(16)", starter: "import math\nprint(math.sqrt(16))\n", check: async (p)=> (await runAndCapture(p, "import math\nprint(math.sqrt(16))\n")).trim()==='4.0' }
      ]
    },
    {
      id: 'strings-formatting',
      title: t('Строки: форматирование', 'Strings: formatting'),
      theory: t(
        `<div class="card"><h2>f-строки и формат</h2><p>Склеивать удобно через f"...{x}..."</p></div>`,
        `<div class="card"><h2>f-strings and format</h2><p>Compose text using f"...{x}..."</p></div>`
      ),
      tasks: [
        { text: t('Скажи: My name is Bob and I am 7', 'Say: My name is Bob and I am 7'), starter: "name='Bob'\nage=7\nprint(f'My name is {name} and I am {age}')\n", check: async (p)=> (await runAndCapture(p, "name='Bob'\nage=7\nprint(f'My name is {name} and I am {age}')\n")).trim()==='My name is Bob and I am 7' }
      ]
    },
    {
      id: 'list-comprehension',
      title: t('Списки: генераторы', 'Lists: comprehensions'),
      theory: t(
        `<div class="card"><h2>[x*x for x in range(5)]</h2><p>Быстро строим новый список по правилу.</p></div>`,
        `<div class="card"><h2>[x*x for x in range(5)]</h2><p>Build lists from rules.</p></div>`
      ),
      tasks: [
        { text: t('Сделай квадраты 0..4', 'Make squares 0..4'), starter: "s=[x*x for x in range(5)]\nprint(s)\n", check: async (p)=> (await runAndCapture(p, "s=[x*x for x in range(5)]\nprint(s)\n")).trim()==='[0, 1, 4, 9, 16]' }
      ]
    },
    {
      id: 'sets-ops',
      title: t('Множества: операции', 'Sets: operations'),
      theory: t(
        `<div class="card"><h2>set</h2><p>Уникальные элементы и быстрые операции: ∪ ∩ −</p></div>`,
        `<div class="card"><h2>set</h2><p>Unique elements; union/intersection/difference</p></div>`
      ),
      tasks: [
        { text: t('Найди общие элементы', 'Find intersection'), starter: "a={1,2,3}; b={2,3,4}\nprint(a & b)\n", check: async (p)=> (await runAndCapture(p, "a={1,2,3}; b={2,3,4}\nprint(a & b)\n")).trim()==='{2, 3}' }
      ]
    },
    {
      id: 'dict-comprehension',
      title: t('Словари: генераторы', 'Dicts: comprehensions'),
      theory: t(
        `<div class="card"><h2>{x: x*x for x in range(3)}</h2><p>Строим словарь по правилу.</p></div>`,
        `<div class="card"><h2>{x: x*x for x in range(3)}</h2><p>Build dict from rule.</p></div>`
      ),
      tasks: [
        { text: t('Сделай квадраты 0..2 в словаре', 'Make squares 0..2 in dict'), starter: "d={x:x*x for x in range(3)}\nprint(d)\n", check: async (p)=> (await runAndCapture(p, "d={x:x*x for x in range(3)}\nprint(d)\n")).trim()==='{0: 0, 1: 1, 2: 4}' }
      ]
    },
    {
      id: 'functions-args',
      title: t('Функции: *args и **kwargs', 'Functions: *args and **kwargs'),
      theory: t(
        `<div class="card"><h2>*args/**kwargs</h2><p>Принимаем разное число аргументов.</p></div>`,
        `<div class="card"><h2>*args/**kwargs</h2><p>Accept variable arguments.</p></div>`
      ),
      tasks: [
        { text: t('Сделай joiner(*args) печатает через запятую', 'Make joiner(*args) print comma-separated'), starter: "def joiner(*args):\n    print(','.join(str(x) for x in args))\n\njoiner(1,2,3)\n", check: async (p)=> (await runAndCapture(p, "joiner(1,2,3)\n")).trim()==='1,2,3' }
      ]
    },
    {
      id: 'classes-intro',
      title: t('Классы: Введение', 'Classes: Introduction'),
      theory: t(
        `<div class="card"><h2>class Robot</h2><p>Свойства и методы: конструктор __init__</p></div>`,
        `<div class="card"><h2>class Robot</h2><p>Properties and methods: __init__</p></div>`
      ),
      tasks: [
        { text: t('Создай класс Robot(name) и метод hello()', 'Create Robot(name) and hello()'), starter: "class Robot:\n    def __init__(self, name):\n        self.name=name\n    def hello(self):\n        print(f'Hello {self.name}')\n\nr=Robot('Ann')\nr.hello()\n", check: async (p)=> (await runAndCapture(p, "class Robot:\n    def __init__(self, name):\n        self.name=name\n    def hello(self):\n        print(f'Hello {self.name}')\nr=Robot('Ann')\nr.hello()\n")).trim()==='Hello Ann' }
      ]
    },
  ];
}

// Pyodide to run lesson code client-side
let pyodide;
async function setupPyodide(){
  pyodide = await loadPyodide();
}

// Helper: run and capture stdout
async function runAndCapture(pyodide, code){
  const redirect = `import sys\nclass W:\n  def write(self, s):\n    from js import _acc\n    if s:\n      _acc.append(str(s))\n  def flush(self):\n    pass\nsys.stdout=W();sys.stderr=W()`;
  const acc = [];
  window._acc = acc;
  try{
    await pyodide.runPythonAsync(redirect);
    await pyodide.runPythonAsync(code);
  }catch(e){ acc.push("Error: "+e); }
  return acc.join("");
}

// Lesson UI logic
let currentLessonIndex = 0;
let currentTaskIndex = 0;
function fallbackLessons(){
  // Minimal safe lesson shown if getLessons() fails
  const isRu = (i18next?.language || 'en').slice(0,2) === 'ru';
  return [{
    id: 'getting-started',
    title: isRu ? 'Быстрый старт' : 'Getting Started',
    theory: isRu ? `
      <div class="card">
        <h2>Добро пожаловать!</h2>
        <p>Если список уроков не загрузился, это резервный урок. Нажми Практика и запусти код.</p>
      </div>
    ` : `
      <div class="card">
        <h2>Welcome!</h2>
        <p>If lessons failed to load, this is a fallback lesson. Go to Practice and run the code.</p>
      </div>
    `,
    tasks: [
      {
        text: isRu ? 'Скажи Hello, world!' : 'Say Hello, world!',
        starter: "# Напиши ниже печать приветствия\nprint('Hello, world!')\n",
        check: async (p)=> (await runAndCapture(p, "print('Hello, world!')\n")).trim()==='Hello, world!'
      }
    ]
  }];
}

function extraLessons(lang){
  // New non-OSINT lessons injected for all languages we support.
  // Keep them simple and kid-friendly. IDs must NOT be filtered by safeGetLessons().
  const isRu = (lang||'en').slice(0,2) === 'ru';
  const t = (ru,en) => isRu ? ru : en;
  return [
    {
      id: 'cli-advanced',
      title: t('Мини‑проект: CLI — расширение команд', 'Mini‑project: CLI — more commands'),
      theory: t(
        `
        <div class="card">
          <h2>Добавим команды</h2>
          <ul>
            <li>lower text — в нижний регистр</li>
            <li>title text — Первые Буквы</li>
            <li>find sub text — найти подстроку</li>
            <li>calc "2+2" — посчитать простое выражение</li>
          </ul>
        </div>
        `,
        `
        <div class="card">
          <h2>Add commands</h2>
          <ul>
            <li>lower text — to lower case</li>
            <li>title text — Title Case</li>
            <li>find sub text — find substring</li>
            <li>calc "2+2" — evaluate simple expression</li>
          </ul>
        </div>
        `
      ),
      tasks: [
        {
          text: t('Сделай run(cmd) с командами lower/title/find/calc', 'Make run(cmd) with lower/title/find/calc'),
          starter:
`def run(cmd: str):
    parts = cmd.strip().split()
    if not parts:
        print('usage: lower|title|find|calc')
        return
    if parts[0] == 'lower' and len(parts) >= 2:
        print(' '.join(parts[1:]).lower())
    elif parts[0] == 'title' and len(parts) >= 2:
        print(' '.join(parts[1:]).title())
    elif parts[0] == 'find' and len(parts) >= 3:
        sub = parts[1]; text = ' '.join(parts[2:])
        print(text.find(sub))
    elif parts[0] == 'calc' and len(parts) >= 2:
        expr = ' '.join(parts[1:])
        # В учебных целях: eval простых выражений
        print(eval(expr, {'__builtins__': None}, {}))
    else:
        print('unknown')

# Примеры
run('lower HeLLo')
run('title hello world')
run('find lo hello')
run('calc 2+2')
`,
          check: async (p)=>{
            const a = (await runAndCapture(p, "run('lower HeLLo')\n")).trim();
            const b = (await runAndCapture(p, "run('title hello world')\n")).trim();
            const c = (await runAndCapture(p, "run('find lo hello')\n")).trim();
            const d = (await runAndCapture(p, "run('calc 2+2')\n")).trim();
            return a==='hello' && b==='Hello World' && c==='3' && d==='4';
          }
        }
      ]
    },
    {
      id: 'project-calculator',
      title: t('Проект: Калькулятор', 'Project: Calculator'),
      theory: t(
        `<div class="card"><h2>Поддержка + − × ÷ и скобок</h2><p>Считаем выражение из строки.</p></div>`,
        `<div class="card"><h2>Support + − × ÷ and parentheses</h2><p>Compute from a string.</p></div>`
      ),
      tasks: [
        {
          text: t('Сделай calc(expr) и выведи значение', 'Make calc(expr) and print value'),
          starter:
`def calc(expr: str):
    # безопасный мини-каlc: только цифры, + - * / ( ) пробелы
    import re
    if not re.fullmatch(r"[0-9+\-*/()\s.]+", expr):
        return 'ERR'
    try:
        return eval(expr, {'__builtins__': None}, {})
    except Exception:
        return 'ERR'

print(calc('2+2*2'))
`,
          check: async (p)=> (await runAndCapture(p, "print(calc('2+2*2'))\n")).trim()==='6'
        }
      ]
    },
    {
      id: 'project-notebook',
      title: t('Проект: Записная книжка (CLI)', 'Project: Notebook (CLI)'),
      theory: t(
        `<div class=\"card\"><h2>add/list/find/del</h2><p>Храним заметки в списке.</p></div>`,
        `<div class=\"card\"><h2>add/list/find/del</h2><p>Store notes in a list.</p></div>`
      ),
      tasks: [
        {
          text: t('Реализуй блокнот с командами', 'Implement notebook commands'),
          starter:
`notes = []

def notebook(cmd: str):
    parts = cmd.strip().split()
    if not parts:
        print('usage: add text | list | find word | del idx')
        return
    if parts[0] == 'add' and len(parts) >= 2:
        text = ' '.join(parts[1:])
        notes.append(text)
        print('OK')
    elif parts[0] == 'list':
        for i, n in enumerate(notes):
            print(f"{i}: {n}")
    elif parts[0] == 'find' and len(parts) >= 2:
        w = ' '.join(parts[1:]).lower()
        for i, n in enumerate(notes):
            if w in n.lower():
                print(f"{i}: {n}")
    elif parts[0] == 'del' and len(parts) == 2:
        i = int(parts[1])
        if 0 <= i < len(notes):
            notes.pop(i)
            print('OK')
        else:
            print('ERR')
    else:
        print('unknown')

# Тесты
notebook('add milk')
notebook('add bread')
notebook('list')
notebook('find bre')
notebook('del 0')
`,
          check: async (p)=>{
            const a = (await runAndCapture(p, "notebook('add milk')\n")).trim();
            const b = (await runAndCapture(p, "notebook('add bread')\n")).trim();
            const c = (await runAndCapture(p, "notebook('find bre')\n")).toLowerCase();
            const d = (await runAndCapture(p, "notebook('del 0')\n")).trim();
            return a==='OK' && b==='OK' && c.includes('bread') && d==='OK';
          }
        }
      ]
    }
  ];
}

function safeGetLessons(){
  try {
    const ls = getLessons();
    // Filter out OSINT lessons globally (ids starting with 'osint-' or equal to 'osint-intro')
    const filtered = Array.isArray(ls) ? ls.filter(l=>{
      const id = (l && l.id) || '';
      return id !== 'osint-intro' && !/^osint-/.test(id);
    }) : [];
    // Append extra cross-language lessons
    const withExtra = [...filtered, ...extraLessons((i18next.language||'en'))];
    if(!Array.isArray(withExtra) || withExtra.length === 0){
      console.warn('getLessons() returned empty/invalid, using fallback');
      return fallbackLessons();
    }
    return withExtra;
  } catch (e){
    console.error('getLessons() failed:', e);
    return fallbackLessons();
  }
}

function setupLessons(){
  const list = document.getElementById("lessons");
  list.innerHTML = "";
  const lessons = safeGetLessons(); if(!lessons.length) return;
  const ulFrag = document.createDocumentFragment();
  lessons.forEach((l, idx) => {
    const li = document.createElement("li");
    // progress mark
    const acc = currentIdentity();
    const lid = l.id; const done = acc && acc.progress && acc.progress[lid] && acc.progress[lid].doneTasks;
    const allDone = done && Object.keys(done).length >= l.tasks.length;
    const count = done ? Object.keys(done).length : 0;
    const badge = allDone ? ' <span class="done-badge">✓</span>' : ` <span class="progress-badge">${count}/${l.tasks.length}</span>`;
    li.innerHTML = `<button class="lesson-item${allDone?' done':''}" data-idx="${idx}">${l.title}${badge}</button>`;
    ulFrag.appendChild(li);
  });
  if(lessons.length === 0){
    // As a final guard, present a clickable fallback so UI stays usable
    const li = document.createElement('li');
    li.innerHTML = `<button class="lesson-item" data-idx="0">${(i18next.language||'en').slice(0,2)==='ru'?'Быстрый старт':'Getting Started'}</button>`;
    ulFrag.appendChild(li);
  }
  list.appendChild(ulFrag);
  // trigger staggered appear once when (re)building the list
  list.parentElement.classList.add('appear');
  // bind clicks to open lessons
  list.querySelectorAll('.lesson-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-idx')||'0',10);
      currentLessonIndex = i; currentTaskIndex = 0;
      renderLesson();
      renderPractice();
    });
  });
  // render first lesson by default if nothing shown yet
  if(typeof currentLessonIndex !== 'number' || currentLessonIndex < 0){ currentLessonIndex = 0; }
  renderLesson();
  renderPractice();
}

function setupLessonSearch(){
  const input = document.getElementById('lesson-search');
  if(!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const items = document.querySelectorAll('#lessons .lesson-item');
    items.forEach((btn) => {
      const text = btn.textContent.toLowerCase();
      const match = !q || text.includes(q);
      btn.parentElement.style.display = match ? '' : 'none';
      if(q){
        const raw = btn.textContent;
        const idx = raw.toLowerCase().indexOf(q);
        if(idx>=0){
          const hi = raw.substring(0,idx) + '<mark>'+ raw.substring(idx, idx+q.length) + '</mark>' + raw.substring(idx+q.length);
          btn.innerHTML = hi;
        } else {
          btn.textContent = raw; // safe fallback
        }
      } else {
        // rebuild label from data
        const i = parseInt(btn.getAttribute('data-idx')||'0',10);
        const all = safeGetLessons();
        // preserve badge markup
        const l = all[i];
        if(l){
          const acc = currentIdentity();
          const lid = l.id; const done = acc && acc.progress && acc.progress[lid] && acc.progress[lid].doneTasks;
          const allDone = done && Object.keys(done).length >= l.tasks.length;
          const count = done ? Object.keys(done).length : 0;
          const badge = allDone ? ' <span class="done-badge">✓</span>' : ` <span class="progress-badge">${count}/${l.tasks.length}</span>`;
          btn.innerHTML = `${l.title}${badge}`;
        }
      }
    });
  });
}

function renderLesson(){
  const lessons = safeGetLessons(); if(!lessons.length) return;
  const lesson = lessons[currentLessonIndex];
  document.getElementById("lesson-title").textContent = lesson.title;
  document.getElementById("theory-body").innerHTML = lesson.theory;
  const theoryCard = document.getElementById("theory-body");
  if(theoryCard){ animatePop(theoryCard); }
  const titleEl = document.getElementById('lesson-title'); if(titleEl){ animatePop(titleEl); }
  // Inject detailed breakdowns where applicable
  injectBreakdown(lesson.id);
  // Inject per-lesson command glossary (RU/EN)
  injectGlossary(lesson.id);
  renderPractice();
}

function renderPractice(){
  const lessons = safeGetLessons(); if(!lessons.length) return;
  const lesson = lessons[currentLessonIndex];
  const task = lesson.tasks[currentTaskIndex];
  document.getElementById("task-text").textContent = task.text;
  const code = document.getElementById("code");
  code.placeholder = task.starter || '';
  // Load draft per account
  const acc = currentIdentity();
  const lid = lesson.id; const tix = String(currentTaskIndex);
  let draft = '';
  if(acc && acc.drafts && acc.drafts[lid] && acc.drafts[lid][tix] != null){ draft = acc.drafts[lid][tix]; }
  code.value = draft;
  document.getElementById("output").textContent = "";
  document.getElementById("task-progress").textContent = `${currentTaskIndex+1} / ${lesson.tasks.length}`;
  const pCard = document.querySelector('#practice .card'); if(pCard){ animatePop(pCard); }
  // hint/solution buttons
  const hintBtn = document.getElementById('hint');
  const solBtn = document.getElementById('solution');
  const t = task; const hasHint = !!t.hint; const hasSol = !!t.solution;
  if(hintBtn){ hintBtn.style.display = hasHint? 'inline-block':'none'; hintBtn.onclick = ()=> showToast(t.hint||''); }
  if(solBtn){ solBtn.style.display = hasSol? 'inline-block':'none'; solBtn.onclick = ()=>{ code.value = t.solution||code.value; animatePop(code); } }
  // Save draft on input (debounced)
  let to;
  code.addEventListener('input', ()=>{
    clearTimeout(to);
    const val = code.value;
    to = setTimeout(()=>{
      updateActiveAccount(accObj => {
        accObj.drafts[lid] = accObj.drafts[lid] || {};
        accObj.drafts[lid][tix] = val;
      });
    }, 150);
  }, { once: true });
}

function setupLessonRunner(){
  const code = document.getElementById("code");
  const out = document.getElementById("output");
  document.getElementById("run").addEventListener("click", async () => {
    out.textContent = await runAndCapture(pyodide, code.value);
  });
  document.getElementById("reset").addEventListener("click", () => {
    // Reset to empty value while keeping the same task
    code.value = '';
    out.textContent = '';
  });
}

async function checkTask(){
  const out = document.getElementById("output");
  try{
    const lesson = getLessons()[currentLessonIndex];
    const task = lesson.tasks[currentTaskIndex];
    const codeEl = document.getElementById('code');
    const studentOut = await runAndCapture(pyodide, codeEl.value || '');
    // Try to extract expected literal from old-style task.check implementation
    let expected = null;
    try{
      const src = task.check?.toString() || '';
      const m = src.match(/trim\(\)\s*===\s*([`'"])([\s\S]*?)\1/);
      if(m){ expected = m[2]; }
    }catch{}
    let ok = false;
    if(expected != null){
      ok = (normalizeOutput(studentOut) === normalizeOutput(expected));
    } else {
      // Fallback to task's own checker (may use pyodide internally)
      ok = await task.check(pyodide, codeEl.value, studentOut);
    }
    if(ok){
      out.textContent = (out.textContent ? out.textContent + "\n" : "") + "✅ Correct!";
      out.scrollTop = out.scrollHeight;
      // mark progress for active account
      const lid = lesson.id; const tix = String(currentTaskIndex);
      updateActiveAccount(accObj => {
        accObj.progress[lid] = accObj.progress[lid] || { doneTasks: {} };
        accObj.progress[lid].doneTasks[tix] = true;
      });
      // refresh UI: lessons list badges + progress widget
      setupLessons();
      updateGlobalProgressWidget();
    } else {
      out.textContent = (out.textContent ? out.textContent + "\n" : "") + "❌ Not yet. Read the task and try again.";
      out.scrollTop = out.scrollHeight;
    }
  } catch(err){
    out.textContent = (out.textContent ? out.textContent + "\n" : "") + `⚠️ Error: ${err?.message || err}`;
  }
}

// ---- Progress Widget ----
function computeProgress(){
  const lessons = safeGetLessons();
  const acc = currentIdentity();
  let total = 0, done = 0;
  const perLesson = [];
  lessons.forEach((l, idx) => {
    const t = l.tasks.length; total += t;
    const dmap = acc && acc.progress && acc.progress[l.id] && acc.progress[l.id].doneTasks || {};
    const d = Object.keys(dmap).length; done += Math.min(d, t);
    perLesson.push({ idx, id: l.id, title: l.title, total: t, done: Math.min(d, t) });
  });
  return { total, done, perLesson };
}

function updateGlobalProgressWidget(){
  const card = document.getElementById('sidebar-progress-card'); if(!card) return;
  const { total, done, perLesson } = computeProgress();
  const dEl = document.getElementById('sw-done'); const tEl = document.getElementById('sw-total');
  if(dEl) dEl.textContent = String(done);
  if(tEl) tEl.textContent = String(total);
  const fill = card.querySelector('.sw-progress-fill'); if(fill){ const pct = total? Math.round(done/total*100):0; fill.style.width = pct + '%'; }
  // next lessons list (first 3 not completed)
  const ul = document.getElementById('sw-next'); if(ul){
    ul.innerHTML = '';
    perLesson.filter(x=> x.done < x.total).slice(0,3).forEach(x=>{
      const li = document.createElement('li');
      li.innerHTML = `${x.title} <span class="badge">${x.done}/${x.total}</span>`;
      li.style.cursor = 'pointer';
      li.addEventListener('click', ()=>{
        const first = perLesson.find(x=> x.done < x.total);
        if(first){ jumpToFirstUndone(first.idx); }
      });
      ul.appendChild(li);
    });
  }
  // continue button
  const btn = document.getElementById('sw-continue'); if(btn && !btn._bound){
    btn._bound = true;
    btn.addEventListener('click', ()=>{
      const first = perLesson.find(x=> x.done < x.total);
      if(first){ jumpToFirstUndone(first.idx); }
    });
  }
}

function jumpToFirstUndone(lessonIdx){
  const lessons = getLessons();
  lessonIdx = Math.max(0, Math.min(lessons.length-1, lessonIdx));
  currentLessonIndex = lessonIdx;
  const l = lessons[lessonIdx];
  const acc = currentIdentity();
  const dmap = acc && acc.progress && acc.progress[l.id] && acc.progress[l.id].doneTasks || {};
  // pick first not-done task index
  let firstNot = 0; for(let i=0;i<l.tasks.length;i++){ if(!dmap[String(i)]){ firstNot = i; break; } }
  currentTaskIndex = firstNot;
  // open lesson section
  document.querySelectorAll('main .section').forEach(s=> s.classList.remove('active'));
  document.getElementById('lesson').classList.add('active');
  document.querySelectorAll('.sidebar nav button').forEach(b=> b.classList.remove('active'));
  const btn = document.querySelector('.sidebar nav button[data-section="lesson"]') || document.querySelector('[data-target="lesson"]'); if(btn){ btn.classList.add('active'); }
  // show practice tab
  const tThe = document.querySelector('#theory'); const tPra = document.querySelector('#practice');
  const tabBtns = document.querySelectorAll('.lesson-header .tab');
  if(tThe && tPra){ tThe.classList.remove('active'); tPra.classList.add('active'); }
  tabBtns.forEach(tb=> tb.classList.toggle('active', tb.getAttribute('data-tab')==='practice'));
  // render
  renderLesson();
}

// Animated background particles
function setupBackground(){
  if(!getAnimEnabled()) return; // respect settings
  // soft gradient mover
  const bg = document.createElement('div');
  bg.className = 'bg-anim';
  document.body.appendChild(bg);

  // glowing orbs
  const orb1 = document.createElement('div');
  orb1.className = 'orb orb-a';
  const orb2 = document.createElement('div');
  orb2.className = 'orb orb-b';
  document.body.appendChild(orb1);
  document.body.appendChild(orb2);

  // particles canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  document.body.appendChild(canvas);
  startParticles(canvas);
}

function startParticles(canvas){
  const ctx = canvas.getContext('2d');
  let w, h; const DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize(){
    w = canvas.width = window.innerWidth * DPR;
    h = canvas.height = window.innerHeight * DPR;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  window.addEventListener('resize', resize); resize();

  const N = 80;
  const pts = Array.from({length:N}, () => ({
    x: Math.random()*w, y: Math.random()*h,
    vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
    r: 1 + Math.random()*2
  }));

  function tick(){
    ctx.clearRect(0,0,w,h);
    // draw links
    for(let i=0;i<N;i++){
      for(let j=i+1;j<N;j++){
        const a=pts[i], b=pts[j];
        const dx=a.x-b.x, dy=a.y-b.y; const d=Math.hypot(dx,dy);
        if(d<120*DPR){
          const alpha = 1 - d/(120*DPR);
          ctx.strokeStyle = `rgba(124,92,255,${0.06*alpha})`;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    // draw points
    for(const p of pts){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>w) p.vx*=-1; if(p.y<0||p.y>h) p.vy*=-1;
      ctx.fillStyle = 'rgba(155,125,255,0.6)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// Bootstrap
async function init(){
  await setupI18n();
  // Enforce auth before building app UI
  const ok = await ensureAuth();
  if(!ok) return;
  
  // Check if user has any accounts - if not, redirect to home for onboarding
  // But only if we're currently on the /app page to avoid infinite redirects
  if (window.location.pathname === '/app' || window.location.pathname.startsWith('/app/')) {
    const accounts = loadAccounts();
    if (!accounts.length) {
      // No accounts yet: open Profile section inside the app for quick onboarding
      if (location.hash !== '#profile') {
        location.hash = '#profile';
      }
      // We'll activate the Profile section after UI is initialized below
    }
  }
  
  setupProfile();
  setupNav();
  setupChat();
  setupLessons();
  setupLessonSearch();
  setupLessonTabs();
  setupPyodide();
  updateGlobalProgressWidget();
  setupLessonRunner();
  setupBackground();
  setupSettings();
  updateSidebarProfileCard();
  updateGlobalProgressWidget();

  // After UI init, if user has no accounts, ensure Profile section is visible
  if ((window.location.pathname === '/app' || window.location.pathname.startsWith('/app/')) && !loadAccounts().length) {
    try {
      document.querySelectorAll('.sidebar nav button').forEach(b=> b.classList.remove('active'));
      document.querySelectorAll('main .section').forEach(s=> s.classList.remove('active'));
      const tgt = document.getElementById('profile'); if (tgt) { tgt.classList.add('active'); animatePop(tgt.querySelector('.card')||tgt); }
      const btn = document.querySelector('.sidebar nav button[data-section="profile"]'); if (btn) btn.classList.add('active');
      showToast('Создай аккаунт, чтобы начать обучение');
    } catch {}
  }
}

window.addEventListener("DOMContentLoaded", init);

// Adds symbol-by-symbol breakdown for selected lessons
function injectBreakdown(lessonId){
  const host = document.getElementById('theory-body');
  if(!host) return;
  const lang = (i18next.language || 'en').slice(0,2);
  let html = '';
  if(lang === 'ru'){
    if(lessonId === 'slicing'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>text</code> — имя объекта (строка/список), из которого берём кусочек.</li>
          <li><code>[</code> и <code>]</code> — квадратные скобки: начиная срез/заканчивая его.</li>
          <li><code>0</code> — стартовая позиция (включительно).</li>
          <li><code>2</code> — конечная позиция (не включается) — длина куска = end − start.</li>
          <li><code>:</code> — разделитель между start и end.</li>
          <li><code>-3</code> — отрицательный индекс: считаем от конца (−1 — последний символ).</li>
          <li>пустой <code>end</code> (после двоеточия ничего) — значит «до конца».</li>
          <li><code>::2</code> — шаг 2: берём каждый второй символ.</li>
        </ul>
      `;
    } else if(lessonId === 'exceptions'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>try</code> — «попробовать выполнить» код ниже.</li>
          <li><code>:</code> — двоеточие: дальше идёт блок с отступом.</li>
          <li><code>n</code> — имя переменной, куда кладём результат.</li>
          <li><code>=</code> — присваивание: положить справа в переменную слева.</li>
          <li><code>int</code> — функция преобразования к целому числу.</li>
          <li><code>( )</code> — круглые скобки: аргументы функции.</li>
          <li><code>text</code> — значение, которое пытаемся преобразовать.</li>
          <li><code>except</code> — «если произошла ошибка…».</li>
          <li><code>ValueError</code> — тип ошибки, который ловим.</li>
          <li><code>print</code> — вывести сообщение при ошибке.</li>
        </ul>
      `;
    } else if(lessonId === 'print-basics'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>print</code> — команда «скажи» (вывести текст/значение).</li>
          <li><code>( )</code> — круглые скобки: список того, что сказать.</li>
          <li><code>'…' / "…"</code> — строка (текст) в кавычках.</li>
          <li><code>1, 2, 3</code> — числа без кавычек.</li>
          <li><code>,</code> — запятая: печатать несколько значений подряд с пробелом.</li>
        </ul>
      `;
    } else if(lessonId === 'variables'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>name</code> — имя переменной (коробочка для значения).</li>
          <li><code>=</code> — присваивание: положить справа в переменную слева.</li>
          <li><code>"Alice"</code> — строковое значение.</li>
          <li><code>f"…{name}…"</code> — f-строка: подставить значение переменной внутрь текста.</li>
        </ul>
      `;
    } else if(lessonId === 'input'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>input("…")</code> — спросить у пользователя текст с подсказкой.</li>
          <li><code>int(…)</code> — превратить строку в число (для вычислений).</li>
          <li><code>print("Hello", name)</code> — вывести текст и значение переменной.</li>
        </ul>
      `;
    } else if(lessonId === 'if'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>if</code> — «если» условие истинно — выполняем блок.</li>
          <li><code>a > 3</code> — сравнение: больше ли <code>a</code> трёх.</li>
          <li><code>:</code> — двоеточие: дальше блок с отступом.</li>
          <li><code>else</code> — «иначе» — второй блок, если условие ложно.</li>
        </ul>
      `;
    } else if(lessonId === 'loops'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>for i in range(3)</code> — повторить 3 раза, <code>i</code> меняется 0→1→2.</li>
          <li><code>range(n)</code> — даёт числа 0..n-1.</li>
          <li><code>:</code> — двоеточие: дальше блок с отступом.</li>
        </ul>
      `;
    } else if(lessonId === 'funcs'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>def add(a,b):</code> — объявление функции с параметрами <code>a</code>, <code>b</code>.</li>
          <li><code>return a+b</code> — вернуть результат наружу.</li>
          <li><code>add(2,3)</code> — вызов функции с аргументами.</li>
        </ul>
      `;
    } else if(lessonId === 'strings'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>'Py' + 'thon'</code> — конкатенация: соединить строки.</li>
          <li><code>len(s)</code> — длина строки.</li>
          <li><code>s.upper()</code> — в верхний регистр.</li>
          <li><code>s[i]</code> — символ по индексу.</li>
        </ul>
      `;
    } else if(lessonId === 'lists'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>[1,2,3]</code> — список (несколько значений по порядку).</li>
          <li><code>.append(4)</code> — добавить в конец.</li>
          <li><code>len(nums)</code> — длина списка.</li>
          <li><code>nums[i] = v</code> — изменить элемент по индексу.</li>
        </ul>
      `;
    } else if(lessonId === 'while'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>while i <= 5</code> — повторять, пока условие истинно.</li>
          <li><code>i += 1</code> — обязательно изменять переменную, чтобы не зациклиться.</li>
        </ul>
      `;
    } else if(lessonId === 'defaults'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>def hello(name="World")</code> — параметр <code>name</code> имеет значение по умолчанию.</li>
          <li><code>hello()</code> — вызов без аргумента: возьмётся <code>"World"</code>.</li>
        </ul>
      `;
    } else if(lessonId === 'format'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>f"Hi {name}"</code> — f-строка: подстановка значения <code>name</code>.</li>
          <li><code>"Hi {}".format(name)</code> — форматирование через метод <code>format</code>.</li>
          <li><code>{a:.2f}</code> — отформатировать число с 2 знаками.</li>
        </ul>
      `;
    } else if(lessonId === 'modules'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>import math</code> — подключить модуль.</li>
          <li><code>math.sqrt(16)</code> — вызвать функцию <code>sqrt</code> из модуля.</li>
          <li><code>from math import sqrt</code> — импортировать только <code>sqrt</code>.</li>
        </ul>
      `;
    } else if(lessonId === 'dicts'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>{"name":"Bob"}</code> — словарь: пары ключ→значение.</li>
          <li><code>user["name"]</code> — доступ по ключу.</li>
          <li><code>user.get("phone", "—")</code> — безопасное чтение с дефолтом.</li>
        </ul>
      `;
    } else if(lessonId === 'sets'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>{1,2,3}</code> — множество уникальных значений.</li>
          <li><code>set([1,1,2,3])</code> — построить множество из списка (удаляются дубликаты).</li>
          <li><code>|</code> и <code>&</code> — объединение и пересечение.</li>
        </ul>
      `;
    } else if(lessonId === 'casting'){
      html = `
        <h3>Подробно: каждый элемент</h3>
        <ul>
          <li><code>int("5")</code> — строка → целое число.</li>
          <li><code>float("3.5")</code> — строка → вещественное.</li>
          <li><code>str(5)</code> — число → строка.</li>
        </ul>
      `;
    }
  } else {
    if(lessonId === 'slicing'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>text</code> — object name (string/list) to slice.</li>
          <li><code>[</code> and <code>]</code> — square brackets: start/end of slice.</li>
          <li><code>0</code> — start index (inclusive).</li>
          <li><code>2</code> — end index (exclusive) → length = end − start.</li>
          <li><code>:</code> — separator between start and end.</li>
          <li><code>-3</code> — negative index: count from the end (−1 is last).</li>
          <li>empty <code>end</code> — means “to the end”.</li>
          <li><code>::2</code> — step 2: every second element.</li>
        </ul>
      `;
    } else if(lessonId === 'exceptions'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>try</code> — attempt to run code below.</li>
          <li><code>:</code> — colon: a block with indentation follows.</li>
          <li><code>n</code> — variable to store the result.</li>
          <li><code>=</code> — assignment operator.</li>
          <li><code>int</code> — cast to integer function.</li>
          <li><code>( )</code> — parentheses: function arguments.</li>
          <li><code>text</code> — value to convert.</li>
          <li><code>except</code> — error handler starts.</li>
          <li><code>ValueError</code> — error type handled.</li>
          <li><code>print</code> — show message when error happens.</li>
        </ul>
      `;
    } else if(lessonId === 'print-basics'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>print</code> — say/show text or values.</li>
          <li><code>( )</code> — function arguments to print.</li>
          <li><code>'…' / "…"</code> — string literal.</li>
          <li><code>1, 2, 3</code> — numbers (no quotes).</li>
          <li><code>,</code> — print multiple values separated by space.</li>
        </ul>
      `;
    } else if(lessonId === 'variables'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>name</code> — variable name (box for a value).</li>
          <li><code>=</code> — assignment: put right side into the variable.</li>
          <li><code>"Alice"</code> — string value.</li>
          <li><code>f"…{name}…"</code> — f-string: interpolate the variable.</li>
        </ul>
      `;
    } else if(lessonId === 'input'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>input("…")</code> — ask user with a prompt string.</li>
          <li><code>int(…)</code> — convert string to number.</li>
          <li><code>print("Hello", name)</code> — print text plus a variable.</li>
        </ul>
      `;
    } else if(lessonId === 'if'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>if</code> — run block when condition is true.</li>
          <li><code>a > 3</code> — comparison: is <code>a</code> greater than 3.</li>
          <li><code>:</code> — colon: a block with indentation follows.</li>
          <li><code>else</code> — otherwise branch.</li>
        </ul>
      `;
    } else if(lessonId === 'loops'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>for i in range(3)</code> — repeat 3 times, <code>i</code> becomes 0→1→2.</li>
          <li><code>range(n)</code> — yields 0..n-1.</li>
          <li><code>:</code> — colon: then an indented block.</li>
        </ul>
      `;
    } else if(lessonId === 'funcs'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>def add(a,b):</code> — define function with parameters <code>a</code>, <code>b</code>.</li>
          <li><code>return a+b</code> — return the result.</li>
          <li><code>add(2,3)</code> — call the function.</li>
        </ul>
      `;
    } else if(lessonId === 'strings'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>'Py' + 'thon'</code> — concatenate strings.</li>
          <li><code>len(s)</code> — string length.</li>
          <li><code>s.upper()</code> — uppercase.</li>
          <li><code>s[i]</code> — character by index.</li>
        </ul>
      `;
    } else if(lessonId === 'lists'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>[1,2,3]</code> — list literal.</li>
          <li><code>.append(4)</code> — append to end.</li>
          <li><code>len(nums)</code> — list length.</li>
          <li><code>nums[i] = v</code> — assign element by index.</li>
        </ul>
      `;
    } else if(lessonId === 'while'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>while i <= 5</code> — repeat while condition is true.</li>
          <li><code>i += 1</code> — change variable to avoid infinite loop.</li>
        </ul>
      `;
    } else if(lessonId === 'defaults'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>def hello(name="World")</code> — default value for parameter.</li>
          <li><code>hello()</code> — call uses the default.</li>
        </ul>
      `;
    } else if(lessonId === 'format'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>f"Hi {name}"</code> — f-string interpolation.</li>
          <li><code>"Hi {}".format(name)</code> — format by position.</li>
          <li><code>{a:.2f}</code> — format float with 2 decimals.</li>
        </ul>
      `;
    } else if(lessonId === 'modules'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>import math</code> — import module.</li>
          <li><code>math.sqrt(16)</code> — call function from module.</li>
          <li><code>from math import sqrt</code> — import single function.</li>
        </ul>
      `;
    } else if(lessonId === 'dicts'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>{"name":"Bob"}</code> — dictionary: key→value pairs.</li>
          <li><code>user["name"]</code> — access by key.</li>
          <li><code>user.get("phone", "-")</code> — safe read with default.</li>
        </ul>
      `;
    } else if(lessonId === 'sets'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>{1,2,3}</code> — set of unique values.</li>
          <li><code>set([1,1,2,3])</code> — build set from list (remove dups).</li>
          <li><code>|</code> and <code>&</code> — union and intersection.</li>
        </ul>
      `;
    } else if(lessonId === 'casting'){
      html = `
        <h3>Details: every token</h3>
        <ul>
          <li><code>int("5")</code> — string → integer.</li>
          <li><code>float("3.5")</code> — string → float.</li>
          <li><code>str(5)</code> — number → string.</li>
        </ul>
      `;
    }
  }
  if(html){ const div = document.createElement('div'); div.className = 'breakdown'; div.innerHTML = html; host.appendChild(div); }
}

// Adds a short glossary of commands/keywords used in lesson examples
function injectGlossary(lessonId){
  const host = document.getElementById('theory-body');
  if(!host) return;
  const lang = (i18next.language || 'en').slice(0,2);
  const RU = {
    'print-basics': [
      ['print', 'вывести на экран (показать)'],
      ['"…"/\'…\'', 'строка (текст) в кавычках'],
      ['число (1, 2, 3)', 'числовое значение без кавычек'],
      ['переменная a', 'коробочка с именем для значения'],
      ['скобки ( )', 'список того, что печатать (аргументы функции)']
    ],
    'variables': [
      ['name = …', 'присваивание: положить значение в переменную'],
      ['f"…{name}…"', 'f-строка: подставить значение переменной внутрь текста'],
      ['type: int/float/str/bool', 'типы: целое/вещественное/строка/логический']
    ],
    'input': [
      ['input(…)','спросить у пользователя текст'],
      ['int(…)', 'преобразовать строку в число'],
      ['print("Hello", name)', 'печать нескольких значений через запятую']
    ],
    'if': [
      ['if …:', 'если условие истинно — выполнить блок'],
      ['else:', 'иначе — выполнить другой блок'],
      ['>', 'оператор сравнения «больше»']
    ],
    'loops': [
      ['for i in range(n):', 'повторить n раз, i — счётчик'],
      ['range(3)', 'даёт 0,1,2'],
      ['+=', 'увеличить и присвоить (s += "*")']
    ],
    'funcs': [
      ['def name(a,b):', 'объявление функции с параметрами'],
      ['return x', 'вернуть результат из функции'],
      ['вызов: name(2,3)', 'выполнить функцию с аргументами']
    ],
    'strings': [
      ['+ (конкатенация)', 'соединить строки'],
      ['len(s)', 'длина строки'],
      ['s.upper()', 'в верхний регистр'],
      ['s[i]', 'символ по индексу']
    ],
    'lists': [
      ['[1,2,3]', 'литерал списка'],
      ['append(x)', 'добавить в конец'],
      ['len(lst)', 'длина списка'],
      ['lst[i] = v', 'изменить элемент по индексу']
    ],
    'while': [
      ['while условие:', 'повторять пока условие истинно'],
      ['i += 1', 'изменять переменную внутри цикла (иначе вечный цикл)']
    ],
    'defaults': [
      ['def hello(name="World")', 'параметр по умолчанию'],
      ['hello()', 'вызов без аргумента — берёт значение по умолчанию']
    ],
    'exceptions': [
      ['try:', 'попробовать выполнить'],
      ['except ValueError:', 'поймать указанную ошибку'],
      ['int(text)', 'преобразование к целому'],
      ['print(…)', 'вывести сообщение об ошибке']
    ],
    'slicing': [
      ['obj[start:end]', 'срез от start (включ.) до end (не включ.)'],
      ['obj[-k:]', 'с конца на k символов до конца'],
      ['obj[::2]', 'каждый второй элемент']
    ],
    'dicts': [
      ['{key: value}', 'словарь (пары ключ→значение)'],
      ['user["name"]', 'доступ по ключу'],
      ['.get(k, def)', 'безопасное чтение с значением по умолчанию']
    ],
    'sets': [
      ['{1,2,3}', 'множество уникальных значений'],
      ['set([...])', 'создать множество из списка'],
      ['| / &', 'объединение / пересечение множеств']
    ],
    'casting': [
      ['int("5")', 'строка → целое'],
      ['float("3.5")', 'строка → вещественное'],
      ['str(5)', 'число → строка']
    ],
    'format': [
      ['f"{name}"', 'f-строка: подстановка'],
      ['"Hi {}".format(name)', 'format подстановка по позиции'],
      ['{a:.2f}', 'формат числа с 2 знаками после точки']
    ],
    'modules': [
      ['import math', 'подключить модуль math'],
      ['math.sqrt(9)', 'корень квадратный'],
      ['from math import sqrt', 'импортировать отдельную функцию']
    ]
  };
  const EN = {
    'print-basics': [
      ['print', 'show text in console'],
      ['"…"/\'…\'', 'string literal (text)'],
      ['number (1,2,3)', 'numeric value (no quotes)'],
      ['variable a', 'named box for a value'],
      ['parentheses ( )', 'function arguments to print']
    ],
    'variables': [
      ['name = …', 'assignment: put value into variable'],
      ['f"…{name}…"', 'f-string: interpolate variable into text'],
      ['types', 'int/float/str/bool']
    ],
    'input': [
      ['input(…)', 'ask user for text'],
      ['int(…)', 'convert string to number'],
      ['print("Hello", name)', 'print multiple values']
    ],
    'if': [
      ['if …:', 'if condition true — run block'],
      ['else:', 'otherwise — run else block'],
      ['>', 'comparison operator “greater than”']
    ],
    'loops': [
      ['for i in range(n):', 'repeat n times, i — counter'],
      ['range(3)', 'yields 0,1,2'],
      ['+=', 'increase and assign']
    ],
    'funcs': [
      ['def name(a,b):', 'define a function with parameters'],
      ['return x', 'return a value from function'],
      ['call: name(2,3)', 'invoke function with args']
    ],
    'strings': [
      ['+', 'concatenate strings'],
      ['len(s)', 'length of string'],
      ['s.upper()', 'uppercase'],
      ['s[i]', 'character by index']
    ],
    'lists': [
      ['[1,2,3]', 'list literal'],
      ['append(x)', 'append to end'],
      ['len(lst)', 'list length'],
      ['lst[i] = v', 'assign element by index']
    ],
    'while': [
      ['while cond:', 'repeat while condition is true'],
      ['i += 1', 'change variable to avoid infinite loop']
    ],
    'defaults': [
      ['def hello(name="World")', 'default parameter'],
      ['hello()', 'call with default']
    ],
    'exceptions': [
      ['try:', 'attempt to run'],
      ['except ValueError:', 'handle that error type'],
      ['int(text)', 'convert to integer'],
      ['print(…)', 'show message on error']
    ],
    'slicing': [
      ['obj[start:end]', 'slice from start (incl.) to end (excl.)'],
      ['obj[-k:]', 'from end by k to the end'],
      ['obj[::2]', 'every second element']
    ],
    'dicts': [
      ['{key: value}', 'dictionary (map)'],
      ['user["name"]', 'get by key'],
      ['.get(k, def)', 'safe read with default']
    ],
    'sets': [
      ['{1,2,3}', 'set of unique values'],
      ['set([...])', 'build a set from list'],
      ['| / &', 'union / intersection']
    ],
    'casting': [
      ['int("5")', 'string → int'],
      ['float("3.5")', 'string → float'],
      ['str(5)', 'number → string']
    ],
    'format': [
      ['f"{name}"', 'f-string interpolation'],
      ['"Hi {}".format(name)', 'format by position'],
      ['{a:.2f}', 'format float with 2 decimals']
    ],
    'modules': [
      ['import math', 'import module'],
      ['math.sqrt(9)', 'square root'],
      ['from math import sqrt', 'import a single function']
    ]
  };

  const map = (lang === 'ru') ? RU : EN;
  const items = map[lessonId];
  if(!items) return;
  const title = (lang === 'ru') ? 'Справочник команд' : 'Command glossary';
  const container = document.createElement('div');
  container.className = 'glossary';
  const ul = items.map(([k,v])=>`<li><code>${k}</code> — ${v}</li>`).join('');
  container.innerHTML = `<h3>${title}</h3><ul>${ul}</ul>`;
  host.appendChild(container);
}

function animatePop(el){
  try {
    if (el.animate) {
      el.animate([
        { opacity: 0, transform: 'translateY(10px) scale(0.985)', filter: 'blur(2px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' }
      ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
      return;
    }
  } catch {}
  // Fallback to CSS class method
  el.classList.remove('show');
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  requestAnimationFrame(()=> el.classList.add('show'));
  el.addEventListener('transitionend', ()=>{ el.classList.remove('pop'); el.classList.remove('show'); }, { once: true });
}

// Settings: theme & animations
function resolveAutoTheme(val){
  if(val !== 'auto') return val; // use system preference
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme(theme){
  const t = resolveAutoTheme(theme);
  document.body.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, theme);
  // Preset overrides
  const root = document.documentElement.style;
  root.removeProperty('--accent'); root.removeProperty('--accent-2');
  if(t==='midnight'){ root.setProperty('--bg1','#0b0f1f'); root.setProperty('--bg2','#0e1633'); }
  if(t==='solarized'){ root.setProperty('--bg1','#002b36'); root.setProperty('--bg2','#073642'); root.setProperty('--accent','#b58900'); root.setProperty('--accent-2','#2aa198'); }
  if(t==='dracula'){ root.setProperty('--bg1','#191a21'); root.setProperty('--bg2','#282a36'); root.setProperty('--accent','#bd93f9'); root.setProperty('--accent-2','#50fa7b'); }
  if(t==='pastel'){ root.setProperty('--bg1','#1d1e2e'); root.setProperty('--bg2','#2a2c44'); root.setProperty('--accent','#f6a6ff'); root.setProperty('--accent-2','#a6e3ff'); }
  // Apply custom accent color if set
  const ac = localStorage.getItem(ACCENT_KEY);
  if(ac){ root.setProperty('--accent', ac); root.setProperty('--accent-2', ac); }
}
function getSavedTheme(){ return localStorage.getItem(THEME_KEY) || 'dark'; }
function setAnimEnabled(v){ localStorage.setItem(ANIM_KEY, v? '1':'0'); }
function getAnimEnabled(){ return localStorage.getItem(ANIM_KEY) !== '0'; }

function setupSettings(){
  // initial: allow theme override from URL, e.g. /app?theme=navy
  const urlTheme = new URLSearchParams(location.search).get('theme');
  applyTheme(urlTheme || getSavedTheme());
  const themeSel = document.getElementById('theme-select');
  if(themeSel){
    themeSel.value = urlTheme || getSavedTheme();
    themeSel.addEventListener('change', ()=>{ applyTheme(themeSel.value); showToast('Theme applied'); });
  }
  const resetTheme = document.getElementById('reset-theme'); if(resetTheme){ resetTheme.addEventListener('click', ()=>{ localStorage.removeItem(THEME_KEY); localStorage.removeItem(ACCENT_KEY); themeSel.value='dark'; applyTheme('dark'); showToast('Theme reset'); }); }

  // accent color
  const accent = document.getElementById('accent-color');
  if(accent){
    const saved = localStorage.getItem(ACCENT_KEY); if(saved) accent.value = saved;
    accent.addEventListener('input', ()=>{ localStorage.setItem(ACCENT_KEY, accent.value); applyTheme(getSavedTheme()); });
  }

  const animChk = document.getElementById('anim-enabled');
  if(animChk){ animChk.checked = getAnimEnabled(); animChk.addEventListener('change', ()=>{ setAnimEnabled(animChk.checked); location.reload(); }); }

  // background mode & image
  const bgMode = document.getElementById('bg-mode');
  const bgImg = document.getElementById('bg-image');
  if(bgMode){ bgMode.value = localStorage.getItem(BG_MODE_KEY) || 'gradient1'; bgMode.addEventListener('change', ()=>{ localStorage.setItem(BG_MODE_KEY, bgMode.value); applyBackgroundChoice(); }); }
  if(bgImg){ bgImg.addEventListener('change', ()=>{ const f=bgImg.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ localStorage.setItem(BG_IMAGE_KEY, r.result); applyBackgroundChoice(); }; r.readAsDataURL(f); }); }
  applyBackgroundChoice();
  const resetBg = document.getElementById('reset-bg'); if(resetBg){ resetBg.addEventListener('click', ()=>{ localStorage.removeItem(BG_MODE_KEY); localStorage.removeItem(BG_IMAGE_KEY); bgMode.value='gradient1'; applyBackgroundChoice(); showToast('Background reset'); }); }

  // fonts
  bindSelect('font-size', FONT_SIZE_KEY, 'medium', v=> applyFontSize(v)); applyFontSize(localStorage.getItem(FONT_SIZE_KEY)||'medium');
  bindSelect('font-family', FONT_FAMILY_KEY, 'sans', v=> applyFontFamily(v)); applyFontFamily(localStorage.getItem(FONT_FAMILY_KEY)||'sans');
  const liga = document.getElementById('ligatures'); if(liga){ liga.checked = localStorage.getItem(LIGATURES_KEY)==='1'; liga.addEventListener('change', ()=>{ localStorage.setItem(LIGATURES_KEY, liga.checked?'1':'0'); applyLigatures(liga.checked); }); applyLigatures(liga.checked); }
  const resetFonts = document.getElementById('reset-fonts'); if(resetFonts){ resetFonts.addEventListener('click', ()=>{ localStorage.removeItem(FONT_SIZE_KEY); localStorage.removeItem(FONT_FAMILY_KEY); localStorage.removeItem(LIGATURES_KEY); document.getElementById('font-size').value='medium'; document.getElementById('font-family').value='sans'; if(liga){ liga.checked=false; } applyFontSize('medium'); applyFontFamily('sans'); applyLigatures(false); showToast('Fonts reset'); }); }

  // animations intensity
  bindSelect('anim-intensity', ANIM_INT_KEY, 'normal', v=> document.body.setAttribute('data-anim-int', v)); document.body.setAttribute('data-anim-int', localStorage.getItem(ANIM_INT_KEY)||'normal');
  const resetAnim = document.getElementById('reset-anim'); if(resetAnim){ resetAnim.addEventListener('click', ()=>{ localStorage.removeItem(ANIM_INT_KEY); setAnimEnabled(true); if(document.getElementById('anim-enabled')) document.getElementById('anim-enabled').checked=true; document.body.setAttribute('data-anim-int','normal'); location.reload(); }); }

  // sidebar
  bindSelect('sidebar-pos', SIDEBAR_POS_KEY, 'left', v=> applySidebarPos(v)); applySidebarPos(localStorage.getItem(SIDEBAR_POS_KEY)||'left');
  const sComp = document.getElementById('sidebar-compact'); if(sComp){ sComp.checked = localStorage.getItem(SIDEBAR_COMPACT_KEY)==='1'; sComp.addEventListener('change', ()=>{ localStorage.setItem(SIDEBAR_COMPACT_KEY, sComp.checked?'1':'0'); document.body.classList.toggle('sidebar-compact', sComp.checked); }); document.body.classList.toggle('sidebar-compact', sComp.checked); }
  const sOp = document.getElementById('sidebar-opacity'); if(sOp){ const val = localStorage.getItem(SIDEBAR_OPACITY_KEY)||'60'; sOp.value = val; applySidebarOpacity(val); sOp.addEventListener('input', ()=>{ localStorage.setItem(SIDEBAR_OPACITY_KEY, sOp.value); applySidebarOpacity(sOp.value); }); }
  const resetSidebar = document.getElementById('reset-sidebar'); if(resetSidebar){ resetSidebar.addEventListener('click', ()=>{ localStorage.removeItem(SIDEBAR_POS_KEY); localStorage.removeItem(SIDEBAR_COMPACT_KEY); localStorage.removeItem(SIDEBAR_OPACITY_KEY); document.getElementById('sidebar-pos').value='left'; if(sComp){ sComp.checked=false; } if(sOp){ sOp.value='60'; } applySidebarPos('left'); document.body.classList.remove('sidebar-compact'); applySidebarOpacity('60'); showToast('Sidebar reset'); }); }

  // layout
  bindSelect('layout-mode', LAYOUT_MODE_KEY, 'normal', v=> applyLayout(v)); applyLayout(localStorage.getItem(LAYOUT_MODE_KEY)||'normal');
  const resetLayout = document.getElementById('reset-layout'); if(resetLayout){ resetLayout.addEventListener('click', ()=>{ localStorage.removeItem(LAYOUT_MODE_KEY); applyLayout('normal'); document.getElementById('layout-mode').value='normal'; showToast('Layout reset'); }); }

  const resetAll = document.getElementById('reset-all'); if(resetAll){ resetAll.addEventListener('click', ()=>{
    [THEME_KEY,ANIM_KEY,ACCENT_KEY,BG_MODE_KEY,BG_IMAGE_KEY,FONT_SIZE_KEY,FONT_FAMILY_KEY,LIGATURES_KEY,ANIM_INT_KEY,SIDEBAR_POS_KEY,SIDEBAR_COMPACT_KEY,SIDEBAR_OPACITY_KEY,LAYOUT_MODE_KEY].forEach(k=>localStorage.removeItem(k));
    location.reload();
  }); }
}

function bindSelect(id, key, def, onChange){
  const el = document.getElementById(id); if(!el) return;
  el.value = localStorage.getItem(key) || def;
  el.addEventListener('change', ()=>{ localStorage.setItem(key, el.value); onChange && onChange(el.value); });
}

function applyBackgroundChoice(){
  const mode = localStorage.getItem(BG_MODE_KEY) || 'gradient1';
  const img = localStorage.getItem(BG_IMAGE_KEY);
  if(mode==='image' && img){ document.body.style.backgroundImage = `url(${img})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition='center'; }
  else if(mode==='gradient2'){ document.body.style.backgroundImage = 'linear-gradient(160deg, var(--bg2), var(--bg1))'; }
  else { document.body.style.backgroundImage = 'linear-gradient(160deg, var(--bg1), var(--bg2))'; }
}

function applyFontSize(v){ document.documentElement.style.setProperty('--base-font-size', v==='small'?'14px': v==='large'?'18px':'16px'); }
function applyFontFamily(v){
  const map = { sans: "'Poppins', system-ui, -apple-system, Segoe UI, Roboto, sans-serif", serif: "Georgia, 'Times New Roman', serif", mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };
  document.body.style.fontFamily = map[v] || map.sans;
}
function applyLigatures(on){ document.body.style.fontVariantLigatures = on? 'contextual common-ligatures' : 'none'; }
function applySidebarPos(v){ document.getElementById('app').style.gridTemplateColumns = v==='left'? '260px 1fr' : '1fr 260px'; const sb=document.querySelector('.sidebar'); if(sb){ if(v==='right'){ sb.style.gridColumn='2'; } else { sb.style.gridColumn='1'; } } }
function applySidebarOpacity(val){ const sb=document.querySelector('.sidebar'); if(sb){ sb.style.background = `rgba(15,16,32,${(+val)/100})`; }}

function applyLayout(v){
  document.body.setAttribute('data-layout', v);
  // Focus: dim everything except .lesson-pane when lesson page is active
  const maskId = 'focus-mask';
  const old = document.getElementById(maskId); if(old) old.remove();
  if(v==='focus'){
    const m = document.createElement('div'); m.id = maskId; m.className='focus-mask'; document.body.appendChild(m);
  }
  // Split: for lesson section, present theory and editor side-by-side (CSS handles)
}

// Simple tooltip via CSS attribute already added in HTML using data-title
// Toasts
function showToast(msg){
  let host = document.querySelector('.toast-host');
  if(!host){ host = document.createElement('div'); host.className='toast-host'; document.body.appendChild(host); }
  const t = document.createElement('div'); t.className='toast'; t.textContent = msg; host.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=> t.remove(), 300); }, 1800);
}
