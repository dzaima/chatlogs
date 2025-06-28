package dzaima.utils;

import java.util.Objects;

public final class Pair<A, B> {
  public final A a;
  public final B b;
  
  public Pair(A a, B b) {
    this.a = a;
    this.b = b;
  }
  
  public boolean equals(Object o) {
    if (this==o) return true;
    if (!(o instanceof Pair<?, ?>)) return false;
    Pair<?,?> p = (Pair<?,?>) o;
    return Objects.equals(a, p.a) && Objects.equals(b, p.b);
  }
  
  public int hashCode() {
    return 31*Objects.hashCode(a) + Objects.hashCode(b);
  }
  
  public String toString() {
    return "("+a+";"+b+")";
  }
}
