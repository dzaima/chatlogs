package libMx;

import org.json.JSONObject;

import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
/*
https://example.org
@username:example.org
password
(token or end of file)
 */
public class MxServer {
  public static int SYNC_TIMEOUT = 85000;
  public final String url;
  public String gToken;
  public MxLogin primaryLogin;
  
  public MxServer(String url, String id, String gToken) {
    this.url = url;
    setG(new MxLogin(this, id, gToken));
  }
  
  MxServer(String url) {
    this.url = url;
  }
  
  public void setG(MxLogin l) {
    gToken = l.token;
    primaryLogin = l;
  }
  
  public static MxServer of(Path loginInfo) {
    try {
      List<String> lns = Files.readAllLines(loginInfo);
      MxServer s = new MxServer(lns.get(0));
      MxLogin l = s.login(loginInfo, lns);
      if (l==null) return (MxServer) Tools.qnull;
      s.setG(l);
      return s;
    } catch (IOException e) {
      System.err.println("Failed to read login info file "+loginInfo.toAbsolutePath()+":"); e.printStackTrace(); System.exit(1); return null;
    }
  }
  
  public MxLogin login(Path loginInfo) {
    try {
      List<String> lns = Files.readAllLines(loginInfo);
      return login(loginInfo, lns);
    } catch (IOException e) {
      System.err.println("Failed to read login info file"+loginInfo.toAbsolutePath()+":"); e.printStackTrace(); System.exit(1); return null;
    }
  }
  public MxLogin login(Path loginInfo, List<String> lns) {
    if (lns.size()>=4) {
      MxLogin l = new MxLogin(this, lns.get(1), lns.get(3));
      if (l.valid()) return l;
    }
    
    MxLogin l = login(lns.get(1), lns.get(2));
    if (l==null) return null;
    
    Tools.write(loginInfo, lns.get(0)+"\n"+lns.get(1)+"\n"+lns.get(2)+"\n"+l.token);
    return l;
  }
  public MxLogin login(String uid, String passwd) {
    JSONObject j = postJ("_matrix/client/r0/login",
      "{" +
        "\"user\":"+Tools.toJSON(uid)+"," +
        "\"password\":"+Tools.toJSON(passwd)+"," +
        "\"type\":\"m.login.password\"" +
        "}");
    if (j.has("errcode")) {
      warn("failed to log in");
      return null;
    }
    return new MxLogin(this, uid, j.getString("access_token"));
  }
  
  public static JSONObject parseJSONObject(String s) {
    try {
      return new JSONObject(s);
    } catch (Throwable e) {
      System.err.println("Failed parsing JSON: ```");
      System.err.println(s);
      System.err.println("```");
      e.printStackTrace();
      return null;
    }
  }
  public JSONObject getJ(String path) {
    int failTime = 1;
    while (true) {
      int retryTime = failTime;
      try {
        JSONObject r = parseJSONObject(getRaw(path)); // TODO catch parse error and try to parse out an HTML error code and throw a custom exception on all parseJSONObject
        if (r!=null && !"M_LIMIT_EXCEEDED".equals(r.optString("errcode"))) return r;
        
        if (r.has("retry_after_ms")) retryTime = Math.max(failTime, r.getInt("retry_after_ms")/1000 + 2);
      } catch (RuntimeException e) { e.printStackTrace(); }
      log("mxq", "Retrying in "+retryTime+"s");
      Tools.sleep(retryTime*1000);
      failTime = Math.min(Math.max(failTime*2, 1), 180);
    }
  }
  public JSONObject postJ(String path, String data) {
    int failTime = 1;
    while (true) {
      int retryTime = failTime;
      try {
        JSONObject r = parseJSONObject(postRaw(path, data));
        if (r!=null && !"M_LIMIT_EXCEEDED".equals(r.optString("errcode"))) return r;
        
        if (r.has("retry_after_ms")) retryTime = Math.max(failTime, r.getInt("retry_after_ms")/1000 + 2);
      } catch (RuntimeException e) { e.printStackTrace(); }
      log("mxq", "Retrying in "+retryTime+"s");
      Tools.sleep(retryTime*1000);
      failTime = Math.min(Math.max(failTime*2, 1), 180);
    }
  }
  public JSONObject putJ(String path, String data) {
    int failTime = 1;
    while (true) {
      int retryTime = failTime;
      try {
        JSONObject r = parseJSONObject(putRaw(path, data));
        if (r!=null && !"M_LIMIT_EXCEEDED".equals(r.optString("errcode"))) return r;
        
        if (r.has("retry_after_ms")) retryTime = Math.max(failTime, r.getInt("retry_after_ms")/1000 + 2);
      } catch (RuntimeException e) { e.printStackTrace(); }
      log("mxq", "Retrying in "+retryTime+"s");
      Tools.sleep(retryTime*1000);
      failTime = Math.min(Math.max(failTime*2, 1), 180);
    }
  }
  private String postRaw(String path, String data) {
    log("POST", path, data);
    return Tools.post(url+"/"+path, data.getBytes(StandardCharsets.UTF_8));
  }
  public String getRaw(String path) {
    log("GET", path, null);
    return Tools.get(url+"/"+path);
  }
  public String putRaw(String path, String data) {
    log("PUT", path, data);
    return Tools.put(url+"/"+path, data.getBytes(StandardCharsets.UTF_8));
  }
  
  public byte[] getB(String path) {
    log("GET bytes", path, null);
    return Tools.getB(url+"/"+path);
  }
  private HashMap<String, byte[]> getBCache;
  public byte[] getBCached(String path) {
    if (getBCache==null) getBCache = new HashMap<>();
    byte[] prev = getBCache.get(path);
    if (prev!=null) return prev;
    byte[] curr = getB(path);
    getBCache.put(path, curr);
    return curr;
  }
  
  private final HashMap<String, MxRoom> rooms = new HashMap<>();
  public MxRoom room(String rid) {
    MxRoom r = rooms.get(rid);
    if (r==null) {
      r = new MxRoom(this, rid);
      rooms.put(rid, r);
    }
    return r;
  }
  
  public MxUser user(String uid) {
    return new MxUser(this, uid);
  }
  
  
  public JSONObject sync(int count) {
    return getJ("_matrix/client/r0/sync?filter={\"room\":{\"timeline\":{\"limit\":"+count+"}}}&access_token="+gToken);
  }
  public String latestBatch() {
    return sync(1).getString("next_batch");
  }
  
  public MxLogin register(String id, String device, String passwd) {
    for (int i = 0; i < id.length(); i++) {
      if (!MxUser.nameChars.contains(String.valueOf(id.charAt(i)))) return null;
    }
    int i = 0;
    while (true) {
      String cid = i==0? id : id+i;
      JSONObject j = postJ("_matrix/client/r0/register?kind=user",
        "{" +
          "\"username\":" +Tools.toJSON(cid   )+"," +
          "\"password\":" +Tools.toJSON(passwd)+"," +
          "\"device_id\":"+Tools.toJSON(device)+"," +
          "\"auth\": {\"type\":\"m.login.dummy\"}" +
        "}");
      log("register: "+j.toString());
      String err = j.optString("errcode", null);
      if ("M_USER_IN_USE".equals(err)) {
        if (i>20) return null;
        i++;
        Tools.sleep(100);
        continue;
      }
      if (handleError(j, "register")) return null;
      return new MxLogin(this, j.getString("user_id"), j.getString("access_token"));
    }
  }
  
  
  public JSONObject messagesSince(String since, int timeout) {
    return getJ("_matrix/client/r0/sync?since="+since+"&timeout="+timeout+"&access_token="+gToken);
  }
  
  
  
  
  
  
  
  public static void log(String s) {
    log("mx", s);
  }
  private void log(String method, String uri, String data) {
    if (uri.startsWith("/")) System.err.println("!!!!!!!!!!!!! STARTING SLASH !!!!!!!!!!!!!");
    String df = data==null? "" : " "+(data.length()>100? "..." : data);
    log("mxq", method+" "+url+"/"+uri.replaceAll("access_token=[^&]+", "access_token=<redacted>")+df);
    // if (!uri.contains("_matrix/client/r0/sync?")) { // don't log sync spam
    //   log("mxq", method+" "+uri.replaceAll("access_token=[^&]+", "access_token=<redacted>")+df);
    // }
  }
  
  public boolean handleError(JSONObject j, String do_what) {
    if (!j.has("errcode")) return false;
    warn("Failed to "+do_what+": "+j.toString());
    return true;
  }
  
  public static void log(String id, String s) {
    if (LOG) System.out.println("["+LocalDateTime.now()+" "+id+"] "+s);
  }
  public static void warn(String s) {
    System.err.println("["+LocalDateTime.now()+" !!] "+s);
  }
  public static boolean LOG = true;
}
