package libMx;

import org.json.JSONObject;

public class MxFmted {
  public final String body;
  public final String html;
  
  public MxFmted(JSONObject o) {
    if (!o.has("body")) {
      body = "(deleted)";
      html = "(deleted)";
      return;
    }
    body = o.getString("body");
    String h;
    if ("org.matrix.custom.html".equals(o.optString("format"))) h = o.getString("formatted_body");
    else h = Tools.toHTML(body);
    html = h;
  }
  
  public MxFmted(String body, String html) {
    this.body = body;
    this.html = html;
  }
}