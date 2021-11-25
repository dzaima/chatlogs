package libMx;

import org.json.JSONObject;

import java.time.Instant;

public class MxEvent {
  public final JSONObject o, ct;
  public final MxRoom r;
  public final String uid;
  public final String id;
  
  public final String type;
  public final Instant time;
  
  public final MxMessage m;
  public MxEvent(MxRoom r, JSONObject o) {
    this.r = r;
    this.o = o;
    this.type = o.optString("type");
    this.uid = o.optString("sender");
    this.id = o.optString("event_id");
    this.ct = o.opt("content") instanceof JSONObject? o.getJSONObject("content") : new JSONObject();
    this.time = Instant.ofEpochMilli(o.optLong("origin_server_ts", 0));
    this.m = type.equals("m.room.message")? new MxMessage(r, o) : null;
  }
  public MxEvent(MxMessage m) { // fake event
    o = m.o;
    r = m.r;
    uid = m.uid;
    id = m.id;
    ct = m.ct;
    type = m.type;
    time = m.time;
    this.m = m;
  }
}