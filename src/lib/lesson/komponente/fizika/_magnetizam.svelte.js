// Pomoćni kod za magnetske widgete u pregledniku: sat za animacije (requestAnimationFrame, poštuje
// prefers-reduced-motion) i pretvorba položaja pokazivača u koordinate SVG-a.
import { prefersReducedMotion } from "svelte/motion";

export class Sat {
  t = $state(0);
  #id = 0;
  #zadnje = 0;

  // Pokreće sat; vraća funkciju za zaustavljanje (za $effect).
  pokreni() {
    if (this.#id || prefersReducedMotion.current) return () => {};
    this.#zadnje = performance.now();
    const tik = (sad) => {
      // nakon skrivene kartice ne skači naprijed
      this.t += Math.min(0.05, (sad - this.#zadnje) / 1000);
      this.#zadnje = sad;
      this.#id = requestAnimationFrame(tik);
    };
    this.#id = requestAnimationFrame(tik);
    return () => this.zaustavi();
  }
  zaustavi() {
    cancelAnimationFrame(this.#id);
    this.#id = 0;
  }
}

export const smanjenoGibanje = () => prefersReducedMotion.current;

export function svgTocka(svg, e) {
  const m = svg?.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}
