package libMx;

import org.json.*;

import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

public class MxLogin {
  public MxServer s;
  public final String uid;
  public final String uidURI;
  public String token;
  
  public MxLogin(MxServer s, String id, String mxToken) {
    this.s = s;
    this.uid = id;
    this.token = mxToken;
    uidURI = Tools.toURI(uid);
  }
  
  public boolean valid() {
    return !s.getJ("_matrix/client/r0/account/whoami?access_token="+token).has("errcode");
  }
  
  public MxUser user() {
    return s.user(uid);
  }
  public String sendMessage(MxRoom r, MxFmt msg) {
    JSONObject j = s.postJ(
      "_matrix/client/r0/rooms/"+r.rid+"/send/m.room.message?access_token="+token,
      "{" +
        (msg.replyId==null?"":"\"m.relates_to\":{\"m.in_reply_to\":{\"event_id\":"+ Tools.toJSON(msg.replyId)+"}},") +
        msg(msg.body.toString(), msg.html.toString()) +
        "}"
    );
    if (s.handleError(j, "send message")) return null;
    return j.getString("event_id");
  }
  public String sendContent(MxRoom r, String type, String content) {
    JSONObject j = s.postJ("_matrix/client/r0/rooms/"+r.rid+"/send/"+type+"?access_token="+token, content);
    if (s.handleError(j, "send message")) return null;
    return j.getString("event_id");
  }
  public String editMessage(MxRoom r, String pid, MxFmt msg) { // ignores msg reply as reply target cannot be edited
    String txt = msg.body.toString();
    String htm = msg.html.toString();
    JSONObject j = s.postJ(
      "_matrix/client/r0/rooms/"+r.rid+"/send/m.room.message?access_token="+token,
      "{" +
        msg("* "+txt, "* "+htm)+"," +
        "\"m.relates_to\":{\"rel_type\":\"m.replace\",\"event_id\":"+ Tools.toJSON(pid)+"}," +
        "\"m.new_content\":{"+msg(txt,htm)+"}" +
        "}"
    );
    if (s.handleError(j, "edit message")) return null;
    return j.getString("event_id");
  }
  private static AtomicLong txn = new AtomicLong(ThreadLocalRandom.current().nextLong());
  public void deleteMessage(MxRoom r, String pid) {
    JSONObject j = s.putJ("_matrix/client/r0/rooms/"+r.rid+"/redact/"+pid+"/"+txn.getAndIncrement()+"?access_token="+token, "{}");
    s.handleError(j, "delete message");
  }
  private String msg(String text, String html) {
    return "\"msgtype\":\"m.text\", \"body\":"+Tools.toJSON(text)+",\"format\":\"org.matrix.custom.html\",\"formatted_body\":"+Tools.toJSON(html);
  }
  
  
  public String event(MxRoom r, String type, String data) {
    JSONObject j = s.putJ("_matrix/client/r0/rooms/"+r.rid+"/state/"+type+"?access_token="+token, data);
    if (s.handleError(j, "send "+type)) return null;
    return j.getString("event_id");
  }
  
  
  public boolean join(MxRoom r) {
    JSONObject j = s.postJ("_matrix/client/r0/rooms/"+r.rid+"/join?access_token="+token, "{}");
    return !s.handleError(j, "join room");
  }
  
  private JSONArray deviceInfo;
  public JSONArray deviceInfo() {
    if (deviceInfo==null) deviceInfo = s.getJ("_matrix/client/r0/devices?access_token="+token).getJSONArray("devices");
    return deviceInfo;
  }
  
  public String device() {
    JSONArray ds = deviceInfo();
    return ds.length()==0? null : ds.getJSONObject(ds.length()-1).getString("device_id");
  }
  
  public void nick(String nick) {
    JSONObject j = s.putJ("_matrix/client/r0/profile/"+uidURI+"/displayname?access_token="+token, "{\"displayname\":"+Tools.toJSON(nick)+"}");
    s.handleError(j, "set nick");
  }
  
  public String nick(MxRoom r, String nick) {
    return event(r, "m.room.member/"+uidURI, "{\"membership\":\"join\", \"displayname\":"+Tools.toJSON(nick)+"}");
  }
}
