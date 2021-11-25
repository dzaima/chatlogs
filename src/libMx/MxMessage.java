package libMx;

import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.time.Instant;

public final class MxMessage {
  public final MxRoom r;
  public final JSONObject o;
  public final JSONObject ct;
  public final String type;
  public final Instant time;
  
  public final String id;
  public final String uid;
  public final String editsId; // null if none
  public final int edit; // 0 - not edited; 1 - informing about edit; 2 - full edited message
  public final MxFmted fmt;
  public final String replyId; // null if none
  public MxMessage(MxRoom r, JSONObject o) { // TODO do sane things for evil inputs
    this.r = r;
    this.o = o;
    uid = o.getString("sender");
    id = o.getString("event_id");
    time = Instant.ofEpochMilli(o.getLong("origin_server_ts"));
    ct = o.getJSONObject("content");
    type = ct.optString("msgtype", "deleted");
    
    MxFmted fmtT = new MxFmted(ct);
    String editsId = null;
    int edit = 0;
    String replyId = null;
    if (ct.has("m.relates_to")) {
      JSONObject rel = ct.getJSONObject("m.relates_to");
      if ("m.replace".equals(rel.optString("rel_type"))) {
        editsId = rel.getString("event_id");
        edit = 1;
        if (ct.has("m.new_content")) fmtT = new MxFmted(ct.getJSONObject("m.new_content"));
      } else if (rel.has("m.in_reply_to")) {
        replyId = rel.getJSONObject("m.in_reply_to").getString("event_id");
        if (fmtT.html.startsWith("<mx-reply>")) {
          Document d = Jsoup.parse(fmtT.html);
          d.getElementsByTag("mx-reply").remove();
          fmtT = new MxFmted(fmtT.body, d.body().html());
          // fmtT = new MxFmted(fmtT.body, fmtT.html.substring(0, fmtT.html.indexOf("</mx-reply>")+11));
        }
      }
    }
    this.replyId = replyId;
    this.fmt = fmtT;
    if (editsId==null) {
      if (o.has("unsigned")) {
        JSONObject uns = o.getJSONObject("unsigned");
        if (uns.has("m.relations")) {
          JSONObject rel = uns.getJSONObject("m.relations");
          if (rel.has("m.replace")) {
            // i have no clue wtf this is
            // editsId = rel.getJSONObject("m.replace").getString("event_id");
            edit = 2;
          }
        }
      }
    }
    this.editsId = editsId;
    this.edit = edit;
  }
  
  private MxMessage edits;
  public MxMessage edits() {
    if (edit!=1) return null;
    if (edits == null) edits = r.message(editsId);
    return edits;
  }
  
  private boolean gotReply;
  private MxMessage reply;
  public MxMessage reply() {
    if (!gotReply) {
      MxMessage c = this;
      while(c.edit==1) c = c.edits();
      JSONObject rel = c.ct.optJSONObject("m.relates_to");
      if (rel != null) {
        JSONObject robj = rel.optJSONObject("m.in_reply_to");
        if (robj!=null) reply = r.message(robj.getString("event_id"));
      }
      gotReply = true;
    }
    return reply;
  }
  
  public boolean equals(Object o) {
    if (!(o instanceof MxMessage)) return false;
    return ((MxMessage) o).id.equals(id);
  }
  
  public int hashCode() {
    return id.hashCode();
  }
  
  public MxEvent fakeEvent() {
    return new MxEvent(this);
  }
}
