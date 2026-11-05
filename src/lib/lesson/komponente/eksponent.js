// use:eksponent na polju za broj: potencija se piše kao na papiru, „1,6·10^-19“ postaje „1,6·10⁻¹⁹“ već dok učenik
// tipka (core/number.js: eksponentUnosa). Polje dobiva novi „input“, pa bind:value vidi preoblikovan zapis; kursor
// ostaje gdje je bio, pomaknut za uklonjeni „^“.
import { eksponentUnosa } from "../core/number.js";

export function eksponent(el) {
  function upis() {
    const staro = el.value;
    const novo = eksponentUnosa(staro);
    if (novo === staro) return;
    const kursor = el.selectionStart ?? staro.length;
    const pos = kursor === staro.length ? novo.length : Math.max(0, kursor - (staro.length - novo.length));
    el.value = novo;
    el.setSelectionRange?.(pos, pos);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  el.addEventListener("input", upis);
  return { destroy: () => el.removeEventListener("input", upis) };
}
