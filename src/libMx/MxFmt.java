package libMx;

public class MxFmt {
  public StringBuilder body;
  public StringBuilder html;
  String replyId;
  
  public MxFmt() {
     body = new StringBuilder();
     html = new StringBuilder();
  }
  public MxFmt(String body, String html) {
    this.body = new StringBuilder(body);
    this.html = new StringBuilder(html);
  }
  
  public void reply(String mid) {
    assert replyId==null;
    replyId = mid;
  }
  
  public void txt(String text) {
    body.append(text);
    html.append(Tools.toHTML(text));
  }
  public void i(String text) {
    body.append("_").append(text).append("_");
    html.append("<em>").append(Tools.toHTML(text)).append("</em>");
  }
  public void b(String text) {
    body.append("**").append(text).append("**");
    html.append("<strong>").append(Tools.toHTML(text)).append("</strong>");
  }
  public void del(String text) {
    body.append("---").append(text).append("---");
    html.append("<del>").append(Tools.toHTML(text)).append("</del>");
  }
  public void raw(String f, String h) {
    body.append(f);
    html.append(h);
  }
  
  public void a(String text, String href) {
    body.append("[").append(text).append("](").append(href).append(")");
    html.append("<a href=\"").append(Tools.toHTML(href)).append("\">").append(Tools.toHTML(text)).append("</a>");
  }
  public void user(String uid, String nick) {
    body.append(nick);
    html.append("<a href=\"https://matrix.to/#/").append(Tools.toHTML(uid)).append("\">").append(Tools.toHTML(nick)).append("</a>");
  }
  
  public void c(String code) {
    body.append("`").append(code.replace("`","\\`")).append("`");
    html.append("<code>").append(Tools.toHTML(code)).append("</code>");
  }
  
  public void mc(String code, String lang) {
    if (body.length()!=0 && body.charAt(body.length()-1)!='\n') body.append("\n");
    body.append("```"); if (lang!=null) body.append(lang);
    body.append("\n").append(code);
    body.append("\n```\n");
    
    html.append("<pre><code");
    if (lang!=null) html.append(" class=\"language-").append(Tools.toHTML(lang)).append("\"");
    html.append(">").append(Tools.toHTML(code, false)).append("</code></pre>");
  }
  
  
  
  
  
  public void f(MxFmt f) {
    body.append(f.body);
    html.append(f.html);
  }
  
  
  public void i(MxFmt f) {
    body.append("_").append(f.body).append("_");
    html.append("<em>").append(f.html).append("</em>");
  }
  public void b(MxFmt f) {
    body.append("**").append(f.body).append("**");
    html.append("<strong>").append(f.html).append("</strong>");
  }
  public void del(MxFmt f) {
    body.append("---").append(f.body).append("---");
    html.append("<del>").append(f.html).append("</del>");
  }
  public void c(MxFmt f) {
    body.append("`").append(f.body).append("`");
    html.append("<code>").append(f.html).append("</code>");
  }
  public void a(MxFmt f, String href) {
    body.append("[").append(f.body).append("](").append(href).append(")");
    html.append("<a href=\"").append(Tools.toHTML(href)).append("\">").append(f.html).append("</a>");
  }
  
  
  public static MxFmt ftxt(String s) {
    MxFmt f = new MxFmt();
    f.txt(s);
    return f;
  }
}
