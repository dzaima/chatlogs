'use strict';
console.log("Variable 'matched' contains the filtered message objects");

var currRooms = [];
var matched;

function loadMe(name) {
  let r = localStorage.getItem("me-"+name);
  return r? r.split(";") : [];
}
var me_se = loadMe("se").map(c => +c);
var me_mx = loadMe("mx");
var me_ta = loadMe("ta");

function mkRoom(name, roomRef, logFile, roomID, loader) {
  return {
    state: 0,
    chr: roomRef,
    name,
    fn: next => loader(logFile, name, roomRef, roomID, next),
  }
}

var allRooms = [
  mkRoom("SE/Orchard", 'o', "../logs/SE_orchard",      52405, loadSE),
  mkRoom("SE/ktree",   'k', "../logs/SE_thektree",     52405, loadSE),
  
  mkRoom("TA/bqnffi", 'Tf', "../logs/ta_bqnffi.json",  "https://topanswers.xyz/apl?q=2002", loadTA),
  mkRoom("TA/Singeli",'Ts', "../logs/ta_singeli.json", "https://topanswers.xyz/apl?q=1623", loadTA),
  
  mkRoom("main",       'M', "../logs/matrix_main",      "!cxPCiPlsXnajakSrqd:matrix.org", loadMx),
  mkRoom("BQN",        'B', "../logs/matrix_BQN",       "!EjsgbQQNuTfHXQoiax:matrix.org", loadMx),
  mkRoom("APL",        'A', "../logs/matrix_APL",       "!TobkTZMOkZJCvcSvwq:matrix.org", loadMx),
  mkRoom("k",          'K', "../logs/matrix_k",         "!laJBzNwLcAOMAbAEeQ:matrix.org", loadMx),
  mkRoom("offtopic",   'O', "../logs/matrix_offtopic",  "!qfXqAqUHneTxiUgfrZ:matrix.org", loadMx),
  mkRoom("J",          'J', "../logs/matrix_j",         "!wypKDDiZJdzZRWebIG:matrix.org", loadMx),
  mkRoom("Nial",       'N', "../logs/matrix_nial",      "!YbHrHUqZIKqlLlqkVS:matrix.org", loadMx),
  mkRoom("content",    'C', "../logs/matrix_content",   "!gtyUrNfDifinXDOAsD:matrix.org", loadMx),
  mkRoom("langdev",    'D', "../logs/matrix_langdev",   "!WpdazzauuDxyGNAiCr:matrix.org", loadMx),
  mkRoom("Kap",        'P', "../logs/matrix_kap",       "!OFniHvZeRnzLtnCiWw:dhsdevelopments.com", loadMx),
];

async function setup() {
  var theme = localStorage.getItem("chatlogs-theme");
  if (theme) {
    document.body.classList.remove("dark");
    document.body.classList.add(theme);
  }
  let html = "";
  for (let i = 0; i < allRooms.length; i++) {
    let {name} = allRooms[i];
    if (i == 2) html+= '&nbsp;&nbsp;';
    if (i == 4) html+= '<br>matrix:';
    html+= `<label><input type="checkbox" onchange="checkboxUpd()" id="chk-${name}"></input>${name}</label> `;
  }
  roomselect.innerHTML = html;
  for (let r of allRooms) r.obj = document.getElementById("chk-"+r.name);
  loadLink();
  filterRender();
  txt.focus();
}

function checkboxUpd() {
  updateRooms();
  saveLink();
}
function updateRooms() {
  let checked = allRooms.filter(c=>c.obj.checked);
  if (checked.some(c=>c.state==1)) return;
  
  currRooms = [];
  let next = checked.every(c=>c.state==2)? filterRender : updateRooms;
  for (let room of checked) {
    if (room.state==0) {
      room.state = 1;
      let prev = next;
      next = () => room.fn(r => {
        room.loaded = r;
        room.state = 2;
        prev();
      });
    }
    if (room.state==2) {
      currRooms.push(room.loaded);
    }
  }
  next();
}

function showStatus0(str) {
  statusMsg.innerText = str;
}
async function showStatus(str) {
  console.log(str);
  showStatus0(str);
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
  return `href="${room.msgLink(msgID)||"#"}" onclick="toInlineTranscript(event, ${stresc(room.roomRef)}, ${stresc(msgID)})"`
}

function replyPrefix(room, msg) {
  // https://github.com/Templarian/MaterialDesign/blob/master/LICENSE https://www.apache.org/licenses/LICENSE-2.0
  return `<a ${transcriptLink(room, msg.replyID)} class="reply"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M11 17v-5h5v8h5V7H11V2l-7 7.5z" fill="#aaaaaa"></path></svg></a>`;
}

async function finishRoom(room, next, getDate) {
  room.data.forEach(msg => {
    msg.room = room;
    if (!msg.html) msg.html = '<span class="removed">(removed)</span>';
    msg.date = getDate(msg);
    msg.userLower = msg.username.toLowerCase();
    msg.htmlLower = msg.html.toLowerCase();
    msg.textSearch = (msg.text + unpackPaste(msg.html)).toLowerCase();
  });
  let name = room.name;
  await showStatus(name+": Sorting...");
  room.data.sort((a,b)=>b.date-a.date);
  await showStatus(name+": Loaded");
  next(room);
}

async function loadSE(path, name, roomRef, roomid, next) {
  await showStatus(name+": Downloading message log...");
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
    isMsgMine: (msg) => me_se.includes(msg.userID),
  };
  j.forEach(msg => {
    msg.id = msg.msgID+"";
    if (msg.replyID!=-1) {
      msg.html = replyPrefix(room, msg) + msg.html
      msg.text = `:${msg.replyID} ${msg.text}`;
    }
  });
  
  await finishRoom(room, next, c => new Date(c.time*1000));
}

async function loadMx(path, name, roomRef, roomid, next) {
  await showStatus(name+": Downloading message log...");
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
    isMsgMine: (msg) => me_mx.includes(msg.sender),
  };
  j.forEach(msg => {
    let ct = msg.content;
    msg.id = msg.event_id;
    msg.text = ct.body;
    msg.html = ct.format=="org.matrix.custom.html"? ct.formatted_body : escapeHTML(msg.text);
    msg.username = nameMap[msg.sender] || msg.sender.split(':')[0].substring(1);
    
    if (ct["m.relates_to"] && ct["m.relates_to"]["m.in_reply_to"]) {
      msg.replyID = ct["m.relates_to"]["m.in_reply_to"].event_id;
      let endIdx = msg.html.indexOf("</mx-reply>");
      msg.html = replyPrefix(room, msg) + (endIdx==-1? msg.html : msg.html.substring(endIdx+11));
    }
  });
  
  await finishRoom(room, next, (c) => new Date(c.origin_server_ts));
}

async function loadTA(path, name, roomRef, link, next) {
  await showStatus(name+": Downloading message log...");
  let j = await loadFile(path);
  
  await showStatus(name+": Parsing JSON...");
  j = JSON.parse(j);
  
  await showStatus(name+": Preparing data...");
  
  let room = {
    data: j,
    roomRef,
    name,
    msgLink: (id) => undefined,
    userLink: (msg) => undefined,
    testUser: (msg, test) => test(""+msg.userID) || test(msg.userLower),
    testMsgText: (msg, test) => test(msg.textSearch) || test(msg.htmlLower),
    isMsgMine: (msg) => me_ta.includes(""+msg.userID),
  };
  j.forEach(msg => {
    if (msg.replyID !== undefined) {
      msg.html = replyPrefix(room, msg) + msg.html;
    }
  });
  
  await finishRoom(room, next, c => new Date(c.date));
}

function toInlineTranscript(e, roomChr, id) {
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
        let val = "";
        while (i<str.length) {
          if (str[i] == '\\' && ++i < str.length) {
            val+= str[i++];
          } else if (!/[ "!|&()]/.test(str[i])) {
            val+= str[i++];
          } else {
            break;
          }
        }
        return m_loose(val);
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
    ps = m_any([ps, p_or()]);
  }
  return ps;
}


function filterRender(filter = true) {
  let ok = true;
  
  matched = currRooms.flatMap(room => {
    let leftMsgs = room.data;
    
    if (filter) {
      try {
        if (usr.value) {
          let search = parseSearch(usr.value);
          leftMsgs = leftMsgs.filter(msg => room.testUser(msg, search));
        }
        if (txt.value) {
          let search = parseSearch(txt.value);
          leftMsgs = leftMsgs.filter(msg => room.testMsgText(msg, search));
        }
      } catch (e) {
        console.error(e);
        showStatus0("Failed to filter: "+e+"");
        leftMsgs = [];
        ok = false;
      }
    }
    
    return leftMsgs;
  });
  resetRender(ok);
}
function preResetRender() {
  if (currRooms.length > 1) matched.sort((a,b)=>b.date-a.date);
  pam = ((matched.length-1)/psz|0)+1;
  page = 0;
}
function resetRender(clearStatus) {
  preResetRender();
  render(clearStatus);
}

var page = 0;
var psz = 100;
var pam = 0;

function messageHTML(msg, isMine) {
  let userLink = msg.room.userLink(msg);
  return `
<div class="msg">
<div class="user"><a ${userLink? `href="${userLink}"` : ``}>${msg.username}</a></div>
<div class="mcont fr${isMine?" me":""}">
<div class="fc"><a class="opt" ${transcriptLink(msg.room, msg.id)}>▼</a></div>
<div class="fc" style="width:100%;max-width:98%;min-width:98%"><div>
 <div class="time" title="${msg.date}">${dateFormat(msg.date)}</div>
 <div class="src">${msg.html.replace(/(?<![>"])https:\/\/dzaima\.github\.io\/paste\/?#[a-zA-Z0-9#/@%]+\b/g, (c) => `<a href="${c}">https://dzaima.github.io/paste/…</a>`)}</div>
</div></div>
</div>
</div>`;
}
function render(clearStatus = true) {
  let arrows = `<div style="padding:2px 0px 5px 0px">
  <a class="arr" href="#" onclick="pageDelta(-9e9);return false;">«</a>
  <a class="arr" href="#" onclick="pageDelta(  -1);return false;">&lt;</a>
  <a class="arr" href="#" onclick="pageDelta(   1);return false;">&gt;</a>
  <a class="arr" href="#" onclick="pageDelta( 9e9);return false;">»</a></div>`;
  let res = `${arrows}Page ${page+1} of ${pam}; ${matched.length} found <span style="width:30px" id="msgList"></div>`;
  for (let i = page*psz; i < Math.min((page+1)*psz, matched.length); i++) {
    let msg = matched[i];
    res+= messageHTML(msg, msg.room.isMsgMine(msg));
  }
  msgs.innerHTML = res+"<br>"+arrows;
  if (clearStatus) showStatus0("");
}

function pageDelta(d) {
  page+= d;
  if (page>=pam) page = pam-1;
  if (page < 0) page = 0;
  render();
}

let dateNow = new Date();
function dateFormat(d) {
  let [wd, mo, dy, yr, tm] = (d+"").split(' ');
  tm = tm.substring(0, tm.length-3);
  if (d.getFullYear() == dateNow.getFullYear()) return `${mo} ${dy} ${tm}`;
  else return `${mo} ${dy} '${yr.substring(2)} ${tm}`
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

function saveLink(copyLink = false) {
  let b64 = `#s${allRooms.filter(c => c.obj.checked).map(c => c.chr).join('')}#${compressToURI(txt.value)}#${compressToURI(usr.value)}`;
  history.pushState({}, '', b64);
  if (copyLink) copy(location.href.replace('/#', '#'));
}
function loadLink() {
  let hash = decodeURIComponent(location.hash.slice(1));
  let t = hash[0];
  if (t=='s') {
    let [rs, te, ue] = hash.slice(1).split('#');
    allRooms.forEach(c => c.obj.checked = rs.includes(c.chr))
    txt.value = decompressURI(te);
    usr.value = decompressURI(ue);
    updateRooms();
  }
}
window.onload=setup;
window.onhashchange=loadLink;

function compressToURI(str) {
  if (!str) return str;
  let bytes = new TextEncoder('utf-8').encode(str);
  let arr = pako.deflateRaw(bytes, {'level': 9});
  let bytestr = [...arr].map(c => String.fromCharCode(c)).join('');
  return btoa(bytestr).replace(/\+/g, '@').replace(/=+/, '');
}

function decompressURI(str) {
  if (!str) return str;
  try {
    let arr = new Uint8Array([...atob(decodeURIComponent(str).replace(/@/g, '+'))].map(c=>c.charCodeAt()));
    return new TextDecoder('utf-8').decode(pako.inflateRaw(arr));
  } catch (e) {
    return 'failed to decode - full link not copied?';
  }
}
