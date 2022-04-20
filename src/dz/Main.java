package dz;

import libMx.*;
import org.json.*;

import org.json.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.*;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

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
  };
  
  // StackExchange config
  public static final int SE_BATCH = 9999; // SE limits to 500 but ¯\_(ツ)_/¯
  public static final int SE_SLEEP = 1000; // sleep time between API calls
  public static final String[][] seRooms = {
    {"52405", "SE_orchard"},
    {"90748", "SE_thektree"},
  };
  
  
  public static void main(String[] args) throws IOException {
    updateSE();
    updateMatrix();
  }
  
  
  public static void updateMatrix() throws IOException {
    MxServer s = MxServer.of(Paths.get("mxToken"));
  
    System.out.println("Syncing...");
    JSONObject sync = s.sync(1);
    String lastToken = sync.getString("next_batch");
    JSONObject syncRooms = sync.getJSONObject("rooms").getJSONObject("join");
    
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
      ArrayList<JSONObject> newEvents = new ArrayList<>();
      while (true) {
        Tools.sleep(timeout);
        timeout = Math.min(timeout+MX_SLEEP_INC, MX_SLEEP_MAX);
        MxRoom.Chunk c = r.beforeTok(currTok, endTok, MX_BATCH);
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
        JSONObject c = newEvents.get(i);
        lns.add(c.toString(-1));
      }
  
      JSONArray arr = syncRooms.getJSONObject(roomID).getJSONObject("state").getJSONArray("events");
      JSONObject nameMap = new JSONObject();
      for (Object c : arr) {
        JSONObject o = (JSONObject) c;
        String type = o.getString("type");
        if (type.equals("m.room.member")) {
          JSONObject ct = o.getJSONObject("content");
          if (ct.getString("membership").equals("join")) {
            String sender = o.getString("sender");
            nameMap.put(sender, ct.optString("displayname", sender.split(":")[0].substring(1)));
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
  public static void updateSERoom(String roomid, String filename) throws IOException {
    System.out.println("Updating SE room "+filename);
    Path path = LOG_PATH.resolve(filename);
    List<String> lines;
    int lastId;
    if (Files.exists(path)) {
      lines = Files.readAllLines(path);
      lastId = new JSONObject(lines.get(lines.size()-1)).getInt("msgID");
    } else {
      lines = new ArrayList<>();
      lastId = -1;
    }
    
    
    int currId = new JSONObject(Tools.post("https://chat.stackexchange.com/chats/"+roomid+"/events?mode=Messages&msgCount=1", new byte[0])).getJSONArray("events").getJSONObject(0).getInt("message_id");
    
    System.out.println("Goal: "+currId+"→"+lastId);
    ArrayList<String> reverse = new ArrayList<>();
    while (currId > lastId) {
      Tools.sleep(SE_SLEEP);
      String p = Tools.post("https://chat.stackexchange.com/chats/"+roomid+"/events?before="+currId+"&mode=Messages&msgCount="+SE_BATCH, new byte[0]);
      JSONObject o = new JSONObject(p);
      JSONArray e = o.getJSONArray("events");
      if (e.isEmpty()) break;
      int newId = e.getJSONObject(0).getInt("message_id");
      System.out.println(currId+"→"+newId+": "+e.length()+" messages");
      currId = newId;
      for (int i = e.length()-1; i>=0; i--) {
        JSONObject m = e.getJSONObject(i);
        
        int ts = m.optInt("time_stamp", -1);
        int messageID = m.optInt("message_id", -1);
        if (messageID<=lastId) continue;
        int replyID = m.optInt("parent_id", -1);
        boolean isReply = m.optBoolean("show_parent");
        String username = m.optString("user_name", "-999");
        int userID = m.optInt("user_id", -1);
        int starCount = m.optInt("message_stars", 0);
        boolean edited = m.optInt("message_edits", 0)>0;
        String html = m.optString("content", "");
        Element body = Jsoup.parse(html).body();
        String text = body.text();
        boolean partial = body.childrenSize()>0 && body.child(0).hasClass("partial");
        if (partial) {
          System.out.println("getting full source of "+messageID);
          Tools.sleep(SE_SLEEP);
          text = Tools.get("https://chat.stackexchange.com/messages/"+roomid+"/"+messageID);
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
    return JSONObject.quote(k)+": "+JSONObject.quote(v);
  }
  static String jk(String k, int v) {
    return JSONObject.quote(k)+": "+v;
  }
  static String jk(String k, boolean v) {
    return JSONObject.quote(k)+": "+v;
  }
}
