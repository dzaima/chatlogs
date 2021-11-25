package libMx;

import org.json.JSONObject;

import java.util.*;

public class MxRoom {
  public final MxServer s;
  public final String rid;
  
  public MxRoom(MxServer s, String rid) {
    this.s = s;
    this.rid = rid;
  }
  
  
  public MxMessage message(String id) {
    return new MxMessage(this, s.getJ("_matrix/client/r0/rooms/"+rid+"/event/"+id+"?access_token="+s.gToken));
  }
  
  public ArrayList<MxEvent> beforeMsg(String id, int am) {
    JSONObject o = s.getJ("_matrix/client/r0/rooms/"+rid+"/context/"+id+"?limit="+am+"&access_token="+s.gToken);
    ArrayList<MxEvent> res = new ArrayList<>();
    if (!o.has("events_before")) return null;
    for (Object c : o.getJSONArray("events_before")) {
      JSONObject jo = (JSONObject) c;
      res.add(new MxEvent(this, jo));
    }
    Collections.reverse(res);
    return res;
  }
  public static class Chunk {
    public final ArrayList<MxEvent> events;
    public final String sTok;
    public final String eTok;
  
    public Chunk(ArrayList<MxEvent> events, String sTok, String eTok) { this.events = events; this.sTok = sTok; this.eTok = eTok; }
  }
  public Chunk beforeTok(String from, int am) {
    return beforeTok(from, null, am);
  }
  public Chunk beforeTok(String from, String to, int am) {
    JSONObject o = s.getJ("_matrix/client/r0/rooms/"+rid+"/messages?limit="+am+"&from="+from+(to==null?"":"&to="+to)+"&dir=b&access_token="+s.gToken);
    ArrayList<MxEvent> res = new ArrayList<>();
    if (!o.has("chunk")) return null;
    for (Object c : o.getJSONArray("chunk")) {
      res.add(new MxEvent(this, (JSONObject) c));
    }
    Collections.reverse(res);
    return new Chunk(res, o.getString("start"), o.getString("end"));
  }
  
  @Deprecated
  public JSONObject messagesSince(String since, int timeout) {
    return s.messagesSince(since, timeout);
  }
  
  public void readTo(String id) {
    s.postJ("_matrix/client/r0/rooms/"+rid+"/receipt/m.read/"+id+"?access_token="+s.gToken, "{}");
  }
}
