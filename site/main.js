var me_se = -1; // the number of your user page - https://chat.stackexchange.com/users/123456
var me_mx = "@example:matrix.org"; // your matrix ID

var allRooms = [
  {state: 0, chr:'o', name:"SE/Orchard", fn: next=>loadSE("../logs/SE_orchard", "SE/Orchard", 52405, next)},
  {state: 0, chr:'k', name:"SE/ktree",   fn: next=>loadSE("../logs/SE_thektree", "SE/ktree", 52405, next)},
  {state: 0, chr:'B', name:"mx/BQN",     fn: next=>loadMx("../logs/matrix_BQN", "mx/BQN", "!EjsgbQQNuTfHXQoiax:matrix.org", next)},
  {state: 0, chr:'A', name:"mx/APL",     fn: next=>loadMx("../logs/matrix_APL", "mx/APL", "!TobkTZMOkZJCvcSvwq:matrix.org", next)},
  {state: 0, chr:'K', name:"mx/k",       fn: next=>loadMx("../logs/matrix_k", "mx/k", "!TobkTZMOkZJCvcSvwq:matrix.org", next)},
  {state: 0, chr:'M', name:"mx/main",    fn: next=>loadMx("../logs/matrix_main", "mx/main", "!TobkTZMOkZJCvcSvwq:matrix.org", next)},
  {state: 0, chr:'O', name:"mx/offtopic",fn: next=>loadMx("../logs/matrix_offtopic", "mx/offtopic", "!TobkTZMOkZJCvcSvwq:matrix.org", next)},
]
async function load() {
  let html = "";
  for (let {name} of allRooms) html+= `<input type="checkbox" onchange="checkboxUpd()" id="chk-${name}"></input>${name} `
  roomselect.innerHTML = html;
  for (let r of allRooms) r.obj = document.getElementById("chk-"+r.name);
  loadLnk();
  upd();
}

function checkboxUpd() {
  updateRooms();
  saveLnk();
}
function updateRooms() {
  let checked = allRooms.filter(c=>c.obj.checked);
  if (checked.some(c=>c.state==1)) return;
  
  currRooms = [];
  let todo = checked.every(c=>c.state==2)? upd : updateRooms;
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
  statusMsg.innerText = " | "+str;
  await new Promise(r=>setTimeout(r, 0));
}


// https://github.com/Templarian/MaterialDesign/blob/master/LICENSE https://www.apache.org/licenses/LICENSE-2.0
var arrow = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M11 17v-5h5v8h5V7H11V2l-7 7.5z" fill="#aaaaaa"></path></svg>'

async function loadSE(path, name, roomid, next) {
  await showStatus(name+": Downloading history...");
  let req = new XMLHttpRequest();
  req.onload = async () => {
    await showStatus(name+": Parsing JSON...")
    let j = req.responseText.split('\n');
    j.pop();
    j = j.map(c=>JSON.parse(c));
    
    await showStatus(name+": Preparing data...")
    j.forEach(c => {
      c.userLower = c.username.toLowerCase();
      c.htmlLower = c.html.toLowerCase();
      c.textLower = c.text.toLowerCase();
      if (c.replyID!=-1) {
        c.html = `<a href="https://chat.stackexchange.com/transcript/${roomid}?m=${c.replyID}#${c.replyID}" class="reply">${arrow}</a>${c.html}`
        c.htmlLower = `:${c.replyID} ${c.htmlLower}`;
        c.textLower = `:${c.replyID} ${c.textLower}`;
      }
      c.date = new Date(c.time*1000);
    });
    await showStatus(name+": Sorting...")
    j.sort((a,b)=>b.date-a.date);
    let room = {
      data: j,
      filterUsers: (prev, val) => {
        if (/^[0-9-]+$/.test(val)) {
          let test = +val;
          return prev.filter(c=>c.userID == test);
        } else {
          let test = val.toLowerCase();
          return prev.filter(c=>c.userLower.includes(test));
        }
      },
      msgHas: (msg, txt) => {
        return msg.textLower.includes(txt) || msg.htmlLower.includes(txt);
      },
      html: (m) => `
<div class="msg">
 <div class="user"><a href="https://chat.stackexchange.com/users/${m.userID}">${m.username}</a></div>
 <div class="mcont fr${me_se==m.userID?" me":""}">
  <div class="fc"><a class="opt" href="https://chat.stackexchange.com/transcript/${roomid}?m=${m.msgID}#${m.msgID}"></a></div>
  <div class="fc" style="width:100%;max-width:98%;min-width:98%"><div>
   <div class="time" title="${m.date}">${df(m.date)}</div>
   <div class="src">${m.html==""? '<span class="removed">(removed)</span>' : m.html}</div>
  </div></div>
 </div>
</div>`,
    };
    j.forEach(c => c.room = room);
    await showStatus(name+": Loaded");
    next(room);
  };
  req.open("GET", path);
  req.send();
}


async function loadMx(path, name, roomid, next) {
  showStatus(name+": Downloading history...");
  let req = new XMLHttpRequest();
  req.onload = async () => {
    showStatus(name+": Parsing JSON...")
    let j = req.responseText.split('\n');
    j.pop();
    j.pop();
    let nameMap = JSON.parse(j.shift());
    j = j.map(c=>JSON.parse(c));
    
    showStatus(name+": Preparing data...")
    
    let newJ = [];
    let msgMap = {};
    asdasd = j
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
    
    j.forEach(m => {
      let ct = m.content;
      m.text = ct.body;
      m.html = ct.format=="org.matrix.custom.html"? ct.formatted_body : escapeHTML(m.text);
      m.username = nameMap[m.sender];
      if (!m.username) m.username = m.sender.split(':')[0].substring(1);
      m.userLower = m.username.toLowerCase()
      m.htmlLower = m.html.toLowerCase()
      m.textLower = m.text.toLowerCase()
      if (ct["m.relates_to"] && ct["m.relates_to"]["m.in_reply_to"]) {
        m.replyID = ct["m.relates_to"]["m.in_reply_to"].event_id;
        let endIdx = m.html.indexOf("</mx-reply>");
        m.html = `<a href="https://matrix.to/#/${roomid}/${m.replyID}" class="reply">${arrow}</a>${endIdx==-1? m.html : m.html.substring(endIdx+11)}`;
      }
      m.date = new Date(m.origin_server_ts);
    });
    showStatus(name+": Sorting...");
    j.sort((a,b)=>b.date-a.date);
    let room = {
      data: j,
      filterUsers: (prev, val) => {
        let test = val.toLowerCase();
        return test[0]=='@'? prev.filter(c=>c.sender.includes(test)) : prev.filter(c=>c.userLower.includes(test));
      },
      msgHas: (msg, txt) => {
        return msg.textLower.includes(txt) || msg.htmlLower.includes(txt);
      },
      html: (m) => `
<div class="msg">
 <div class="user"><a href="https://matrix.to/#/${m.sender}">${m.username}</a></div>
 <div class="mcont fr${me_mx==m.sender?" me":""}">
  <div class="fc"><a class="opt" href="https://matrix.to/#/${roomid}/${m.event_id}"></a></div>
  <div class="fc" style="width:100%;max-width:98%;min-width:98%"><div>
   <div class="time" title="${m.date}">${df(m.date)}</div>
   <div class="src">${m.html}</div>
  </div></div>
 </div>
</div>`,
    };
    j.forEach(c => c.room = room);
    showStatus(name+": Loaded");
    next(room);
  };
  req.open("GET", path);
  req.send();
}

var matched;
function upd() {
  matched = currRooms.flatMap(room => {
    let leftMsgs = room.data;
    
    if (usr.value) leftMsgs = room.filterUsers(leftMsgs, usr.value);
    
    if (txt.value) { // a&b|c&d
      let exp = txt.value.toLowerCase();
      if (exp[0]==' ') {
        exp = exp.substring(1);
        leftMsgs = leftMsgs.filter(c => room.msgHas(c, exp));
      } else {
        let ands = [];
        let ors = [];
        let curr = "";
        let i = 0;
        while (i<exp.length) {
          let c = exp[i++];
          if (c=='\\') curr+= exp[i++];
          else if (c=='&') { ands.push(curr); curr=""; }
          else if (c=='|') { ands.push(curr); curr=""; ors.push(ands); ands = []; }
          else curr+= c;
        }
        ands.push(curr); ors.push(ands);
        ors = ors.filter(c=>c.length).map(c=>c.filter(k=>k.length));
        leftMsgs = leftMsgs.filter(c=>ors.some(ands => ands.every(k => room.msgHas(c, k))));
      }
    }
    
    return leftMsgs;
  })
  if (currRooms.length > 1) matched.sort((a,b)=>b.date-a.date);
  pam = ((matched.length-1)/psz|0)+1;
  page = 0;
  render();
}

var page = 0;
var psz = 100;
var pam = 0;
function render() {
  let arrows = `<div style="padding:8px 0px 5px 0px">
  <a class="arr" href="javascript:0" onclick="p(-9e9)">«</a>
  <a class="arr" href="javascript:0" onclick="p(  -1)">&lt;</a>
  <a class="arr" href="javascript:0" onclick="p(   1)">&gt;</a>
  <a class="arr" href="javascript:0" onclick="p( 9e9)">»</a></div>`;
  let res = `${arrows}Page ${page+1} of ${pam}; ${matched.length} found <span style="width:30px"></div>`;
  for (let i = page*psz; i < Math.min((page+1)*psz, matched.length); i++) {
    let m = matched[i];
    res+= m.room.html(m);
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