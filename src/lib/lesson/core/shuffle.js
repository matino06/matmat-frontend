// Ponovljivo miješanje (iste opcije uvijek istim redom za isti spec): poredak ne skače pri ponovnom
// iscrtavanju, a točan odgovor ipak nije uvijek prvi.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle(items, seed) {
  let s = hash(String(seed)) || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // poredak različit od zadanog kad god je moguće
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift());
  return out;
}
