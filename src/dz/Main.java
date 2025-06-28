package dz;

import dzaima.utils.JSON;
import dzaima.utils.JSON.*;
import libMx.*;

import org.jsoup.Jsoup;
import org.jsoup.nodes.*;

import java.io.IOException;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;

public class Main {
  // Matrix config
  public static final int MX_BATCH = 1000; // how many messages to accept at a time
  public static final int MX_SLEEP_MIN = 1000; // starting sleep time between API calls
  public static final int MX_SLEEP_INC = 500; // by how much to increase sleep time on each API call
  public static final int MX_SLEEP_MAX = 30000; // max sleep time
  public static final Path LOG_PATH = Paths.get("logs/");
  public static final String[][] mxRooms = {
    {"!EjsgbQQNuTfHXQoiax:matrix.org", "matrix_BQN"},
    {"!TobkTZMOkZJCvcSvwq:matrix.org", "matrix_APL"},
    {"!laJBzNwLcAOMAbAEeQ:matrix.org", "matrix_k"},
    {"!cxPCiPlsXnajakSrqd:matrix.org", "matrix_main"},
    {"!wypKDDiZJdzZRWebIG:matrix.org", "matrix_j"},
    {"!YbHrHUqZIKqlLlqkVS:matrix.org", "matrix_nial"},
    {"!qfXqAqUHneTxiUgfrZ:matrix.org", "matrix_offtopic"},
    {"!gtyUrNfDifinXDOAsD:matrix.org", "matrix_content"},
    {"!WpdazzauuDxyGNAiCr:matrix.org", "matrix_langdev"},
    {"!OFniHvZeRnzLtnCiWw:dhsdevelopments.com", "matrix_kap"},
  };
  
  // StackExchange config
  public static final int SE_BATCH = 9999; // SE limits to 500 but ¯\_(ツ)_/¯
  public static final int SE_SLEEP = 1000; // sleep time between API calls
  public static final String[][] seRooms = {
    {"52405", "SE_orchard"},
    // {"90748", "SE_thektree"},
  };
  
  
  public static void main(String[] args) throws IOException {
    updateSE();
    updateMatrix();
  }
  
  
  public static void updateMatrix() throws IOException {
    MxLoginMgr login = new MxLoginMgr.MxFileLogin(Paths.get("mxToken"));
    MxServer s = login.create();
    login.login(s);
    
    System.out.println("Syncing...");
    Obj sync = s.sync(MxServer.syncFilter(1, false, false));
    String lastToken = sync.str("next_batch");
    Obj syncRooms = sync.obj("rooms").obj("join");
    Obj rf = MxRoom.roomEventFilter(true);
    
    int timeout = MX_SLEEP_MIN;
    
    for (String[] room : mxRooms) {
      String roomID = room[0];
      Path path = LOG_PATH.resolve(room[1]);
      System.out.println("Updating Matrix room "+path);
      MxRoom r = s.room(roomID);
      String endTok;
      List<String> lns;
      if (Files.exists(path)) {
        lns = Files.readAllLines(path);
        endTok = lns.remove(lns.size()-1);
      } else {
        endTok = null;
        lns = new ArrayList<>();
        lns.add("{}");
      }
      
      String currTok = lastToken;
      ArrayList<Obj> newEvents = new ArrayList<>();
      while (true) {
        Utils.sleep(timeout);
        timeout = Math.min(timeout+MX_SLEEP_INC, MX_SLEEP_MAX);
        MxRoom.Chunk c = r.beforeTok(rf, currTok, endTok, MX_BATCH);
        if (c.events.size()==0) break;
        System.out.println("Got "+c.events.size()+" messages; first is at "+c.events.get(0).time);
        currTok = c.eTok;
        for (int i = c.events.size()-1; i>=0; i--) {
          MxEvent e = c.events.get(i);
          e.o.remove("age");
          e.o.remove("unsigned");
          e.o.remove("room_id");
          newEvents.add(e.o);
        }
        if (currTok.equals(endTok)) break;
      }
      System.out.println("Finished room");
      for (int i = newEvents.size()-1; i>=0; i--) {
        Obj c = newEvents.get(i);
        lns.add(c.toString(-1));
      }
  
      Arr arr = syncRooms.obj(roomID).obj("state").arr("events");
      Obj nameMap = new Obj();
      for (Object c : arr) {
        Obj o = (Obj) c;
        String type = o.str("type");
        if (type.equals("m.room.member")) {
          Obj ct = o.obj("content");
          if (ct.str("membership").equals("join")) {
            String sender = o.str("sender");
            nameMap.put(sender, new JSON.Str(ct.str("displayname", sender.split(":")[0].substring(1))));
          }
        }
      }
      lns.set(0, nameMap.toString(-1));
      
      lns.add(lastToken);
      Files.write(path, lns);
    }
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  public static void updateSE() throws IOException {
    for (String[] room : seRooms) {
      updateSERoom(room[0], room[1]);
    }
  }
  
  static Pattern FKEY_PATTERN = Pattern.compile("<input id=\"fkey\" name=\"fkey\" type=\"hidden\" value=\"([a-zA-Z0-9]+)\" />");
  public static void updateSERoom(String roomid, String filename) throws IOException {
    System.out.println("Updating SE room "+filename);
    Path path = LOG_PATH.resolve(filename);
    List<String> lines;
    int lastId;
    if (Files.exists(path)) {
      lines = Files.readAllLines(path);
      lastId = JSON.parseObj(lines.get(lines.size()-1)).getInt("msgID");
    } else {
      lines = new ArrayList<>();
      lastId = -1;
    }
    Utils.RequestParams p0 = new Utils.RequestParams(null);
    
    String res = Utils.post(p0, "https://chat.stackexchange.com/rooms/52405/the-apl-orchard", new byte[0]).okString();
    Matcher match = FKEY_PATTERN.matcher(res);
    match.find();
    byte[] fkey = ("fkey="+match.group(1)).getBytes(StandardCharsets.UTF_8);
    
    int currId = JSON.parseObj(Utils.post(p0, "https://chat.stackexchange.com/chats/"+roomid+"/events?mode=Messages&msgCount=1", fkey).okString()).arr("events").obj(0).getInt("message_id");
    
    System.out.println("Goal: "+currId+"→"+lastId);
    ArrayList<String> reverse = new ArrayList<>();
    while (currId > lastId) {
      Utils.sleep(SE_SLEEP);
      String p = Utils.post(p0, "https://chat.stackexchange.com/chats/"+roomid+"/events?before="+currId+"&mode=Messages&msgCount="+SE_BATCH, fkey).okString();
      Obj o = JSON.parseObj(p);
      Arr e = o.arr("events");
      if (e.size()==0) break;
      int newId = e.obj(0).getInt("message_id");
      System.out.println(currId+"→"+newId+": "+e.size()+" messages");
      currId = newId;
      for (int i = e.size()-1; i>=0; i--) {
        Obj m = e.obj(i);
        
        int ts = m.getInt("time_stamp", -1);
        int messageID = m.getInt("message_id", -1);
        if (messageID<=lastId) continue;
        int replyID = m.getInt("parent_id", -1);
        boolean isReply = m.bool("show_parent", false);
        String username = m.str("user_name", "-999");
        int userID = m.getInt("user_id", -1);
        int starCount = m.getInt("message_stars", 0);
        boolean edited = m.getInt("message_edits", 0)>0;
        String html = m.str("content", "");
        Element body = Jsoup.parse(html).body();
        String text = body.text();
        boolean partial = body.childrenSize()>0 && body.child(0).hasClass("partial");
        if (partial) {
          System.out.println("getting full source of "+messageID);
          Utils.sleep(SE_SLEEP);
          text = Utils.get(p0, "https://chat.stackexchange.com/messages/"+roomid+"/"+messageID).okString();
          html = Entities.escape(text);
        }
        
        reverse.add("{"+
          jk(    "time",        ts)+","+
          jk(   "msgID", messageID)+","+
          jk( "replyID",   replyID)+","+
          jk( "isReply",   isReply)+","+
          jk("username",  username)+","+
          jk(  "userID",    userID)+","+
          jk(   "stars", starCount)+","+
          jk(  "edited",    edited)+","+
          jk(    "html",      html)+","+
          jk(    "text",      text)+"}");
      }
    }
    System.out.println();
    System.out.println();
    for (int i = reverse.size()-1; i >= 0; i--) {
      lines.add(reverse.get(i));
    }
    Files.write(path, lines);
  }
  static String jk(String k, String v) {
    return JSON.quote(k)+": "+JSON.quote(v);
  }
  static String jk(String k, int v) {
    return JSON.quote(k)+": "+v;
  }
  static String jk(String k, boolean v) {
    return JSON.quote(k)+": "+v;
  }
}
