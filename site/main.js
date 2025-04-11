var me_se = 123456789; // the number of your user page - https://chat.stackexchange.com/users/123456789
var me_mx = "@example:matrix.org"; // your matrix ID
console.log("Variable 'matched' contains the filtered message objects");

function mkRoom(name, roomRef, logFile, shortName, roomID, loader) {
  return {
    state: 0,
    chr: roomRef,
    name,
    fn: next => loader(logFile, shortName, roomRef, roomID, next),
  }
}

var allRooms = [
  mkRoom("Orchard",    'o', "../logs/SE_orchard",      "SE/Orchard",  52405, loadSE),
  mkRoom("ktree",      'k', "../logs/SE_thektree",     "SE/ktree",    52405, loadSE),
  
  mkRoom("BQN",        'B', "../logs/matrix_BQN",      "mx/BQN",      "!EjsgbQQNuTfHXQoiax:matrix.org", loadMx),
  mkRoom("APL",        'A', "../logs/matrix_APL",      "mx/APL",      "!TobkTZMOkZJCvcSvwq:matrix.org", loadMx),
  mkRoom("k",          'K', "../logs/matrix_k",        "mx/k",        "!laJBzNwLcAOMAbAEeQ:matrix.org", loadMx),
  mkRoom("main",       'M', "../logs/matrix_main",     "mx/main",     "!cxPCiPlsXnajakSrqd:matrix.org", loadMx),
  mkRoom("offtopic",   'O', "../logs/matrix_offtopic", "mx/offtopic", "!qfXqAqUHneTxiUgfrZ:matrix.org", loadMx),
  mkRoom("J",          'J', "../logs/matrix_j",        "mx/J",        "!wypKDDiZJdzZRWebIG:matrix.org", loadMx),
  mkRoom("Nial",       'N', "../logs/matrix_nial",     "mx/Nial",     "!YbHrHUqZIKqlLlqkVS:matrix.org", loadMx),
  mkRoom("content",    'C', "../logs/matrix_content",  "mx/content",  "!gtyUrNfDifinXDOAsD:matrix.org", loadMx),
  mkRoom("langdev",    'D', "../logs/matrix_langdev",  "mx/langdev",  "!WpdazzauuDxyGNAiCr:matrix.org", loadMx),
  mkRoom("Kap",        'P', "../logs/matrix_kap",      "mx/Kap",      "!OFniHvZeRnzLtnCiWw:dhsdevelopments.com", loadMx),
];
async function load() {
  let html = "";
  for (let i = 0; i < allRooms.length; i++) {
    let {name} = allRooms[i];
    // if (i === allRooms.length>>1) html+= '<br>';
    html+= `<label><input type="checkbox" onchange="checkboxUpd()" id="chk-${name}"></input>${name}</label> `;
  }
  roomselect.innerHTML = html;
  for (let r of allRooms) r.obj = document.getElementById("chk-"+r.name);
  loadLnk();
  filterRender();
  txt.focus();
}

function checkboxUpd() {
  updateRooms();
  saveLnk();
}
function updateRooms() {
  let checked = allRooms.filter(c=>c.obj.checked);
  if (checked.some(c=>c.state==1)) return;
  
  currRooms = [];
  let todo = checked.every(c=>c.state==2)? filterRender : updateRooms;
  for (let room of checked) {
    if (room.state==0) {
      room.state = 1;
      let prevtodo = todo;
      todo = () => room.fn(r => {
        room.loaded = r;
        room.state = 2;
        prevtodo();
      });
    }
    if (room.state==2) {
      currRooms.push(room.loaded);
    }
  }
  todo();
}

var j;
var currRooms = [];

async function showStatus(str) {
  console.log(str);
  statusMsg.innerText = str;
  await new Promise(r=>setTimeout(r, 0));
}

async function loadFile(path) {
  let f = await fetch(path);
  let b = await f.arrayBuffer();
  return new TextDecoder().decode(b);
}

function decompressPasteURI(str) {
  try {
    let arr = new Uint8Array([...atob(decodeURIComponent(str).replace(/@/g, '+'))].map(c=>c.charCodeAt()));
    return new TextDecoder('utf-8').decode(pako.inflateRaw(arr));
  } catch (e) {
    return null;
  }
}

function unpackPaste(html) {
  let matches = [...html.matchAll(/\bhttps:\/\/dzaima\.github\.io\/paste\/?#0([a-zA-Z0-9#/@%]+)/g)];
  if (matches.length == 0) return '';
  matches = matches.map(c => {
    let [code] = c[1].split(/#|%23/);
    return !code? null : decompressPasteURI(code);
  }).filter(c => c);
  if (matches.length == 0) return '';
  return '\n'+matches.join('\n');
}

function transcriptLink(room, msgID) {
  function stresc(x) {
    return "'" + (x+"").replace('&','&amp;').replace(/["<>]/,''/* eh whatever */) + "'";
  }
  return `href="${room.msgLink(msgID)}" onclick="inlineTranscript(event, ${stresc(room.roomRef)}, ${stresc(msgID)})"`
}

// https://github.com/Templarian/MaterialDesign/blob/master/LICENSE https://www.apache.org/licenses/LICENSE-2.0
var arrow = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M11 17v-5h5v8h5V7H11V2l-7 7.5z" fill="#aaaaaa"></path></svg>'

function prepareMessages(room, getDate) {
  room.data.forEach(msg => {
    msg.room = room;
    if (!msg.html) msg.html = '<span class="removed">(removed)</span>';
    msg.date = getDate(msg);
    msg.userLower = msg.username.toLowerCase();
    msg.htmlLower = msg.html.toLowerCase();
    msg.textSearch = (msg.text + unpackPaste(msg.html)).toLowerCase();
  });
}
async function finishRoom(room, next) {
  let name = room.name;
  await showStatus(name+": Sorting...");
  room.data.sort((a,b)=>b.date-a.date);
  await showStatus(name+": Loaded");
  next(room);
}

async function loadSE(path, name, roomRef, roomid, next) {
  await showStatus(name+": Downloading history...");
  
  let j = (await loadFile(path)).split('\n');
  
  await showStatus(name+": Parsing JSON...");
  j.pop();
  j = j.map(c=>JSON.parse(c));
  
  await showStatus(name+": Preparing data...");
  
  let room = {
    data: j,
    roomRef,
    name,
    msgLink: (id) => `https://chat.stackexchange.com/transcript/${roomid}?m=${id}#${id}`,
    userLink: (msg) => `https://chat.stackexchange.com/users/${msg.userID}`,
    filterUsers: (prev, test) => prev.filter(msg => test(""+msg.userID) || test(msg.userLower)),
    testUser: (msg, test) => test(""+msg.userID) || test(msg.userLower),
    testMsgText: (msg, test) => test(msg.textSearch) || test(msg.htmlLower),
    isMsgMine: (msg) => me_se==msg.userID,
  };
  prepareMessages(room, c => new Date(c.time*1000));
  
  j.forEach(c => {
    c.id = c.msgID+"";
    if (c.replyID!=-1) {
      c.html = `<a ${transcriptLink(room, c.replyID)} class="reply">${arrow}</a>${c.html}`
      c.textSearch = `:${c.replyID} ${c.textSearch}`;
    }
  });
  await finishRoom(room, next);
}

async function loadMx(path, name, roomRef, roomid, next) {
  await showStatus(name+": Downloading history...");
  let j = (await loadFile(path)).split('\n');
  await showStatus(name+": Parsing JSON...")
  j.pop();
  j.pop();
  let nameMap = JSON.parse(j.shift());
  j = j.map(c=>JSON.parse(c));
  
  await showStatus(name+": Preparing data...")
  
  let newJ = [];
  let msgMap = {};
  j.forEach(c => {
    msgMap[c.event_id] = c;
    if (c.type!="m.room.message" || !c.content.body) return;
    let rel = c.content["m.relates_to"];
    if (rel && rel.rel_type == "m.replace") {
      return;
    } else {
      newJ.push(c);
    }
  });
  j = newJ;
  
  let room = {
    data: j,
    roomRef,
    name,
    msgLink: (id) => `https://matrix.to/#/${roomid}/${id}`,
    userLink: (msg) => `https://matrix.to/#/${msg.sender}`,
    testUser: (msg, test) => test(msg.sender) || test(msg.userLower),
    testMsgText: (msg, test) => test(msg.textSearch) || test(msg.htmlLower),
    isMsgMine: (msg) => me_mx==msg.sender,
  };
  j.forEach(m => {
    let ct = m.content;
    m.id = m.event_id;
    m.text = ct.body;
    m.html = ct.format=="org.matrix.custom.html"? ct.formatted_body : escapeHTML(m.text);
    m.username = nameMap[m.sender] || m.sender.split(':')[0].substring(1);
    
    if (ct["m.relates_to"] && ct["m.relates_to"]["m.in_reply_to"]) {
      m.replyID = ct["m.relates_to"]["m.in_reply_to"].event_id;
      let endIdx = m.html.indexOf("</mx-reply>");
      m.html = `<a ${transcriptLink(room, m.replyID)} class="reply">${arrow}</a>${endIdx==-1? m.html : m.html.substring(endIdx+11)}`;
    }
  });
  prepareMessages(room, (c) => new Date(c.origin_server_ts));
  
  await finishRoom(room, next);
}

function inlineTranscript(e, roomChr, id) {
  e.preventDefault();
  let room = allRooms.find(c => c.chr==roomChr).loaded;
  
  matched = room.data;
  let pos = matched.findIndex(c=>c.id==id);
  preResetRender();
  page = pos/psz | 0;
  render();
  
  let msg = msgList.children[pos%psz];
  msg.focus();
  msg.scrollIntoView();
  let msgCont = msg.querySelector(".mcont");
  msgCont.classList.add("highlighted");
  setTimeout(() => msgCont.classList.remove("highlighted"), 600);
}


function parseSearch(str) {
  function m_always() { return () => true; }
  function m_loose(txt) { return m_exact(txt); }
  function m_exact(txt) { txt = txt.toLowerCase(); return (s) => s.includes(txt); }
  function m_regex(txt) { let r = new RegExp(txt, 'i'); return (s) => r.test(s); }
  function m_not(m) { return (s) => !m(s); }
  function m_all(ms) { return (s) => ms.every(c => c(s)); }
  function m_any(ms) { return (s) =>  ms.some(c => c(s)); }
  
  let i = 0;
  function parseEscaped(end) {
    let i0 = i+1;
    i = str.indexOf(end, i0);
    if (i == -1) i = str.length;
    let body = str.substring(i0, i);
    i = Math.min(str.length, i+1);
    return body;
  }
  function skip() {
    while (str[i] === ' ') i++;
  }
  function part() {
    skip();
    if (i >= str.length) return m_always();
    switch (str[i]) {
      case '"': return m_exact(parseEscaped('"'));
      case '/': return m_regex(parseEscaped('/'));
      case '!': i++; return m_not(part());
      case '(':
        i++;
        let r = p_or();
        i++; // ')'
        return r;
      default:
        let i0 = i;
        while (i<str.length && !/[ "!|&()]/.test(str[i])) i++;
        return m_loose(str.substring(i0, i));
    }
  }
  function p_and() {
    let ps = [];
    while (i < str.length) {
      skip();
      if (/[)|]/.test(str[i])) break;
      if (str[i]==='&') { i++; skip(); }
      ps.push(part());
    }
    return ps.length==1? ps[0] : m_all(ps);
  }
  function p_or() { // main; ends on EOF or ')'
    let ps = [];
    while (i < str.length) {
      skip();
      if (str[i]===')') break;
      if (str[i]==='|') { i++; skip(); }
      ps.push(p_and());
    }
    return ps.length==1? ps[0] : m_any(ps);
  }
  
  let ps = p_or();
  if (i < str.length) {
    i++;
    ps = m_any(ps, p_or());
  }
  return ps;
}


var matched;
function filterRender(filter = true) {
  matched = currRooms.flatMap(room => {
    let leftMsgs = room.data;
    
    if (filter) {
      if (usr.value) {
        let search = parseSearch(usr.value);
        leftMsgs = leftMsgs.filter(msg => room.testUser(msg, search));
      }
      if (txt.value) {
        let search = parseSearch(txt.value);
        leftMsgs = leftMsgs.filter(msg => room.testMsgText(msg, search));
      }
    }
    
    return leftMsgs;
  });
  resetRender();
}
function preResetRender() {
  if (currRooms.length > 1) matched.sort((a,b)=>b.date-a.date);
  pam = ((matched.length-1)/psz|0)+1;
  page = 0;
}
function resetRender() {
  preResetRender();
  render();
}

var page = 0;
var psz = 100;
var pam = 0;

function messageHTML(msg, isMine) {
  return `
<div class="msg">
<div class="user"><a href="${msg.room.userLink(msg)}">${msg.username}</a></div>
<div class="mcont fr${isMine?" me":""}">
<div class="fc"><a class="opt" ${transcriptLink(msg.room, msg.id)}>▼</a></div>
<div class="fc" style="width:100%;max-width:98%;min-width:98%"><div>
 <div class="time" title="${msg.date}">${df(msg.date)}</div>
 <div class="src">${msg.html.replace(/(?<![>"])https:\/\/dzaima\.github\.io\/paste\/?#[a-zA-Z0-9#/@%]+\b/g, (c) => `<a href="${c}">https://dzaima.github.io/paste/…</a>`)}</div>
</div></div>
</div>
</div>`;
}
function render() {
  let arrows = `<div style="padding:8px 0px 5px 0px">
  <a class="arr" href="#" onclick="p(-9e9);return false;">«</a>
  <a class="arr" href="#" onclick="p(  -1);return false;">&lt;</a>
  <a class="arr" href="#" onclick="p(   1);return false;">&gt;</a>
  <a class="arr" href="#" onclick="p( 9e9);return false;">»</a></div>`;
  let res = `${arrows}Page ${page+1} of ${pam}; ${matched.length} found <span style="width:30px" id="msgList"></div>`;
  for (let i = page*psz; i < Math.min((page+1)*psz, matched.length); i++) {
    let msg = matched[i];
    res+= messageHTML(msg, msg.room.isMsgMine(msg));
  }
  msgs.innerHTML = res+"<br>"+arrows;
  statusMsg.innerText = "";
}

function p(d) {
  page+= d;
  if (page>=pam) page = pam-1;
  if (page < 0) page = 0;
  render();
}

let dateNow = new Date();
function df(d) {
  let [wd, mo, dy, yr, tm] = (d+"").split(' ');
  tm = tm.substring(0,tm.length-3);
  if (d.getFullYear() == dateNow.getFullYear()) return `${mo} ${dy} ${tm}`;
  else return `${mo} ${dy} '${yr.substr(2)} ${tm}`
}



let htmlMap = {};
function escapeHTML(str) {
  let res = "";
  for (let chr of str) {
    if (chr>='0'&chr<='9' | chr>='a'&chr<='z' | chr>='A'&chr<='Z' | chr==' ' | chr=='_') res+= chr;
    else if (chr=='\n') res+= '<br>';
    else {
      let m = htmlMap[chr];
      if (!m) m = htmlMap[chr] = new Option(chr).innerHTML;
      res+= m;
    }
  }
  return res;
}

function saveLnk(copyLink = false) {
  let b64 = "#s"+allRooms.filter(c=>c.obj.checked).map(c=>c.chr).join``+"#"+enc(txt.value)+"#"+enc(usr.value);
  history.pushState({}, "", b64);
  if (copyLink) copy(location.href.replace("/#", "#"));
}
function loadLnk() {
  let hash = decodeURIComponent(location.hash.slice(1));
  let t = hash[0];
  if (t=='s') {
    let [rs, te, ue] = hash.slice(1).split("#");
    allRooms.forEach(c => c.obj.checked = rs.includes(c.chr))
    txt.value = dec(te);
    usr.value = dec(ue);
    updateRooms();
  }
}
window.onload=load;
window.onhashchange=loadLnk;

function enc(str) {
  if (!str) return str;
  let bytes = new TextEncoder("utf-8").encode(str);
  return arrToB64(deflate(bytes));
}
function dec(str) {
  if (!str) return str;
  try {
    return new TextDecoder("utf-8").decode(inflate(b64ToArr(str)));
  } catch (e) {
    return "failed to decode - full link not copied?";
  }
}

function arrToB64(arr) {
  var bytestr = "";
  arr.forEach(c => bytestr+= String.fromCharCode(c));
  return btoa(bytestr).replace(/\+/g, "@").replace(/=+/, "");
}
function b64ToArr(str) {
  return new Uint8Array([...atob(decodeURIComponent(str).replace(/@/g, "+"))].map(c=>c.charCodeAt()))
}

function deflate(arr) {
  return pako.deflateRaw(arr, {"level": 9});
}
function inflate(arr) {
  return pako.inflateRaw(arr);
}