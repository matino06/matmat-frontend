// Content for the logged-in app preview on the landing page. The three tasks are
// real ones from the database (ids 223, 72 and 103), text and explanation exactly
// as stored, so they render through the same MathJax path as on /tasks (old tasks,
// id <= 335). Their AI replies (hint, why, explain — one per "## N." step of the
// explanation) are written for the demo. Everything else is made up but shaped
// like the real pages: the fields and their weights match
// pointsDistributionByCourse for the A level, the review intervals match the
// RatingPicker.

export const DEMO_TASKS = [
  {
    id: 223,
    objective: "Kompleksni brojevi",
    text: String.raw`Za kompleksni broj:
$$z = \frac{4 i \left(\sqrt{3} + i\right)}{i^{2025}}$$
Prikažite \(z\) u Gaussovoj ravnini, odredite njegov modul i konjugirani kompleksni broj te zapišite njegov trigonometrijski zapis.`,
    explanation: String.raw`## 1.

Da bismo riješili ovaj zadatak, prvo \(z\) moramo svesti na oblik $$z = x + yi$$ gdje \(x\) predstavlja realni dio kompleksnog broja, a \(y\) imaginarni dio. To ćemo učiniti najlakše tako da izraz $$\frac{4 i \left(\sqrt{3} + i\right)}{i^{2025}}$$ upišemo u kalkulator. Upute za to nalaze se na slici ispod.

<img src="https://api.matmat.online/api/image/kalkulator_complex.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />

## 2.

Uz pomoć kalkulatora dobili smo da je $$z = 4 \sqrt{3} + 4 i$$
Realni dio od \(z\): $$\text{Re}(z) = 4 \sqrt{3}$$
Imaginarni dio od \(z\): $$\text{Im}(z) = 4$$
Realni dio kompleksnog broja predstavlja \(x\)-koordinatu, a imaginarni dio predstavlja \(y\)-koordinatu u Gaussovoj ravnini.
Tako se u našem slučaju radi o točki \((4 \sqrt{3}, 4)\).

<img src="https://api.matmat.online/api/image/kompleksni_gauss_4 sqrt{3} + 4 i.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />

## 3.

Modul od \(z\) je udaljenost točke \(z\) u Gaussovoj ravnini od ishodišta (\(0, 0\)). Ako pogledamo sliku ispod, primjećujemo da nas to podsjeća na pravokutni trokut, pa ćemo, da bismo izračunali modul od \(z\), jednostavno primijeniti Pitagorin poučak.
$$\textcolor{green}{|z|} = \sqrt{(\textcolor{red}{4 \sqrt{3}})^2 + \textcolor{blue}{4}^2} = \textcolor{green}{8}$$

<img src="https://api.matmat.online/api/image/kompleksni_gauss_pitagora_4 sqrt{3} + 4 i.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />

## 4.

Konjugirani kompleksni broj je kompleksan broj kojemu je promijenjen predznak imaginarnog dijela, dok realni dio ostaje isti. $$z = 4 \sqrt{3} + 4 i$$ $$\bar{z} = 4 \sqrt{3} - 4 i$$ \(\bar{z}\) predstavlja konjugirani kompleksni broj \(z\).

## 5.

Formula za trigonometrijski zapis kompleksnog broja (**nalazi se u knjižici s formulama**):  $$z = r \left( \cos \varphi + i \sin \varphi \right), \quad \varphi \in \left[0, 2\pi\right> \tag{formule str. 2}$$ Da bismo zapisali \(z\) u trigonometrijskom obliku, trebamo odrediti \(r\) i \(\varphi\), a to ćemo najlakše učiniti pomoću kalkulatora (u kalkulator unosite \(z\), upute na slici ispod). $$r = 8 \quad \varphi = \frac{\pi}{6}$$ Sada samo uvrstimo \(r\) i \(\varphi\) u formulu (primijeti da su \(r\) i \(|z|\) jednaki). $$z = 8 \left( \cos \frac{\pi}{6} + i \sin \frac{\pi}{6} \right)$$

<img src="https://api.matmat.online/api/image/kalkulator_complex_trig.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />`,
    hint: "Prvo pojednostavni $i^{2025}$. Potencije od $i$ ponavljaju se svaka četiri koraka, a $2025 = 4 \\cdot 506 + 1$. Kad $z$ svedeš na oblik $x + yi$, modul, konjugirani broj i trigonometrijski zapis idu redom.",
    why: "Trigonometrijski zapis $z = r(\\cos\\varphi + i\\sin\\varphi)$ opisuje broj udaljenošću od ishodišta $r$ i kutom $\\varphi$, umjesto koordinatama $x$ i $y$. S njim se kompleksni brojevi puno lakše množe i potenciraju, zato ga matura traži.",
    explain: [
      "Kompleksni broj u obliku $x + yi$ odmah daje točku $(x, y)$ u Gaussovoj ravnini. Kalkulator to izračuna izravno, a ručno ide ovako: $i^{2025} = i$, pa je $z = \\frac{4i(\\sqrt{3} + i)}{i} = 4\\sqrt{3} + 4i$.",
      "Realni dio je dio bez $i$, a imaginarni je broj uz $i$. Za $z = 4\\sqrt{3} + 4i$ to su $4\\sqrt{3}$ i $4$, pa je $z$ točka $(4\\sqrt{3}, 4)$, otprilike $(6.93, 4)$.",
      "Modul je udaljenost točke od ishodišta. Koordinate su katete pravokutnog trokuta, pa je $|z| = \\sqrt{(4\\sqrt{3})^2 + 4^2} = \\sqrt{48 + 16} = \\sqrt{64} = 8$.",
      "Konjugirani broj ima isti realni dio i suprotan imaginarni: $\\bar{z} = 4\\sqrt{3} - 4i$. U Gaussovoj ravnini to je zrcalna slika od $z$ preko realne osi.",
      "Treba nam $r = |z| = 8$ i kut $\\varphi$ za koji je $\\tan\\varphi = \\frac{4}{4\\sqrt{3}} = \\frac{1}{\\sqrt{3}}$. Točka je u prvom kvadrantu, pa je $\\varphi = \\frac{\\pi}{6}$ i $z = 8\\left(\\cos\\frac{\\pi}{6} + i\\sin\\frac{\\pi}{6}\\right)$.",
    ],
  },
  {
    id: 72,
    objective: "Logaritmi",
    text: String.raw`Izrazite \(b\) iz jednakosti \(\log_{2}{b} = \log_{8}{a^9} + \log_{2}{a}\) i rješenje zapišite bez logaritma.`,
    explanation: String.raw`## 1.

Iskoristimo pravilo
$$\log_{\textcolor{red}{b}}{\textcolor{green}{x}^\textcolor{blue}{y}} = \textcolor{blue}{y}\log_{\textcolor{red}{b}}{\textcolor{green}{x}} \tag{formule str. 2}$$
i primijenimo ga na \(\log_{8}{a^9}\).
$$\log_{\textcolor{red}{8}}{\textcolor{green}{{a}}^{\textcolor{blue}{9}}} = \textcolor{blue}{9}\log_{\textcolor{red}{8}}{\textcolor{green}{a}}$$
Sada zamijenimo to u jednadžbi:
\begin{align*}
\log_{2}{b} &= \log_{8}{a^9} + \log_{2}{a} \\
\log_{2}{b} &= 9\log_{8}{a} + \log_{2}{a}
\end{align*}


## 2.

Znamo da je \(8\) isto što i \(2^3\) pa primjećujemo da se \(9\log_{8}{a}\) može zapisati kao \(9\log_{2^3}{a}\) pa dobijemo sljedeće.
\begin{align*}
\log_{2}{b} &= 9\log_{8}{a} + \log_{2}{a} \\
\log_{2}{b} &= 9\log_{2^3}{a} + \log_{2}{a}
\end{align*}
Sada uzmimo pravilo
$$\log_{\textcolor{red}{b}^\textcolor{blue}{y}}{\textcolor{green}{x}} = \frac{1}{\textcolor{blue}{y}}\log_{\textcolor{red}{b}}{\textcolor{green}{x}}$$
i iskoristimo ga na \(9\log_{2^3}{a}\).
$$9\log_{\textcolor{red}{2}^{\textcolor{blue}{3}}}{\textcolor{green}{{a}}} = 9 \frac{1}{\textcolor{blue}{3}}\log_{\textcolor{red}{2}}{\textcolor{green}{a}}$$
Zamijenimo to u jednadžbi:
\begin{align*}
\log_{2}{b} &= 9\log_{8}{a} + \log_{2}{a} \\
\log_{2}{b} &= 9\frac{1}{3}\log_{2}{a} + \log_{2}{a} \\
\log_{2}{b} &= 3\log_{2}{a} + \log_{2}{a} \\
\log_{2}{b} &= 4\log_{2}{a} 
\end{align*}


## 3.

Primijenit ćemo sljedeće pravilo.
$$\log_{\textcolor{red}{b}}{\textcolor{green}{{a}}} = \textcolor{blue}{x} \iff \textcolor{green}{a} = \textcolor{red}{b}^\textcolor{blue}{x} \tag{formule str. 2}$$
Izvucimo sada iz jednakosti 
$$\log_{\textcolor{red}{2}}{\textcolor{green}{b}} = \textcolor{blue}{4\log_{2}{a}}$$ 
varijable \(\textcolor{red}{b}\), \(\textcolor{green}{a}\) i \(\textcolor{blue}{x}\).
$$\textcolor{red}{b} = 2$$
$$\textcolor{green}{a} = b$$
$$\textcolor{blue}{x} = 4\log_{2}{a}$$
Sada zapišimo u obliku \(\textcolor{green}{a} = \textcolor{red}{b}^\textcolor{blue}{x}\).
$$b = 2^{4\log_{2}{a}} $$


## 4.

Izrazili smo \(b\) sada nam je još ostalo da se riješimo logaritma u eksponentu. Iskoristimo opet pravilo
$$\log_{\textcolor{red}{b}}{\textcolor{green}{x}^\textcolor{blue}{y}} = \textcolor{blue}{y}\log_{\textcolor{red}{b}}{\textcolor{green}{x}} \tag{formule str. 2}$$
i primijenimo ga na \(4\log_{2}{a}\).
$$\textcolor{blue}{4}\log_{\textcolor{red}{2}}{\textcolor{green}{{a}}} = \log_{\textcolor{red}{2}}{\textcolor{green}{{a}}^{\textcolor{blue}{4}}}$$
Sada imamo
$$b = 2^{\log_{2}{a^4}} $$
pa na izraz \(2^{\log_{2}{a^4}}\) možemo primijeniti sljedeće pravilo.
$$\textcolor{red}{b}^{\log_{\textcolor{red}{b}}{\textcolor{blue}{x}}} = \textcolor{blue}{x} \tag{formule str. 2}$$
Tako vrijedi
$$\textcolor{red}{2}^{\log_{\textcolor{red}{2}}{\textcolor{blue}{a^4}}} = \textcolor{blue}{a^4} $$
pa sada imamo:
\begin{align*}
b &= 2^{\log_{2}{a^4}} \\
b &= a^4 
\end{align*}




\(=> b = a^4 \)`,
    hint: "Logaritmi su u različitim bazama, 8 i 2. Napiši $8$ kao $2^3$ i svedi sve na bazu 2. Kad je s desne strane samo jedan logaritam s bazom 2, lako se riješiš logaritma.",
    why: "Pravilo $\\log_{b^y} x = \\frac{1}{y}\\log_b x$ treba nam jer jednadžba miješa baze 8 i 2. Tek kad su svi logaritmi u istoj bazi, možemo ih zbrojiti i zatim se riješiti logaritma.",
    explain: [
      "Eksponent 9 iz $\\log_8 a^9$ izlazi ispred logaritma: $\\log_8 a^9 = 9\\log_8 a$. Tako u jednadžbi ostaju samo logaritmi od $a$.",
      "Budući da je $8 = 2^3$, vrijedi $\\log_8 a = \\frac{1}{3}\\log_2 a$. Onda je $9\\log_8 a = 3\\log_2 a$, a zajedno s $\\log_2 a$ to daje $4\\log_2 a$.",
      "Logaritam je eksponent: ako je $\\log_2 b = 4\\log_2 a$, onda je $b$ broj $2$ podignut na taj eksponent, $b = 2^{4\\log_2 a}$.",
      "Četvorku vratimo u logaritam kao eksponent, $4\\log_2 a = \\log_2 a^4$. Tada je $b = 2^{\\log_2 a^4}$, a potencija i logaritam iste baze se poništavaju, pa je $b = a^4$.",
    ],
  },
  {
    id: 103,
    objective: "Funkcije i graf funkcije",
    text: String.raw`Objasni što je funkcija i graf funkcije. Koja je veza između \(x\)-a i \(y\)-a u funkciji? Kako se ta veza prikazuje grafički?`,
    explanation: String.raw`## 1.

Funkcija je kao poseban stroj koji uzima jedan broj (zovemo ga \(x\)) i pretvara ga u drugi broj (zovemo ga \(y\)).

Kada \(x\) ubacimo u funkciju, kao rezultat dobijemo \(y\). To zapisujemo kao

$$
\textcolor{green}{y} = f(\textcolor{blue}{x})
$$

gdje je:

- \(f\) ime funkcije
- \(x\) ulaz funkcije (argument)
- \(y\) izlaz funkcije (vrijednost funkcije)

Na primjer, ako je funkcija

$$
f(\textcolor{blue}{x}) = 2\textcolor{blue}{x} + 1
$$

onda:

$$
\text{Za } \textcolor{blue}{x} = \textcolor{blue}{3}
\implies
\textcolor{green}{y} = f(\textcolor{blue}{3}) = 2 \cdot \textcolor{blue}{3} + 1 = \textcolor{green}{7}
$$

$$
\text{Za } \textcolor{blue}{x} = \textcolor{blue}{0}
\implies
\textcolor{green}{y} = f(\textcolor{blue}{0}) = 2 \cdot \textcolor{blue}{0} + 1 = \textcolor{green}{1}
$$

Važno:

- \(f(x)\) znači da računamo vrijednost \(y\) iz \(x\) pomoću funkcije \(f\)
- funkcija se ne mora uvijek zvati \(f\)

Često se koriste i nazivi:

- \(g(x)\)
- \(h(x)\)

---

## 2.

Odaberimo nekoliko vrijednosti za \(x\) i ubacimo ih u funkciju \(y = f(x)\).

Za svaki odabrani \(x\) dobijemo određeni \(y\).  
Na taj način dobivamo **točke \((x,y)\)** koje možemo nacrtati na grafu.

Primjer za funkciju

$$
f(x) = x^2 - 1
$$

\begin{array}{c|c|c} \textcolor{blue}{x} & \textcolor{green}{y} = f(\textcolor{blue}{x}) & (\textcolor{blue}{x}, \textcolor{green}{y}) \\ \hline \textcolor{blue}{-3} & \textcolor{blue}{(-3)}^2 - 1 = \textcolor{green}{8} & (\textcolor{blue}{-3}, \textcolor{green}{8}) \\ \hline \textcolor{blue}{-2} & \textcolor{blue}{(-2)}^2 - 1 = \textcolor{green}{3} & (\textcolor{blue}{-2}, \textcolor{green}{3}) \\ \hline \textcolor{blue}{-1} & \textcolor{blue}{(-1)}^2 - 1 = \textcolor{green}{0} & (\textcolor{blue}{-1}, \textcolor{green}{0}) \\ \hline \textcolor{blue}{0} & \textcolor{blue}{0}^2 - 1 = \textcolor{green}{-1} & (\textcolor{blue}{0}, \textcolor{green}{-1}) \\ \hline \textcolor{blue}{1} & \textcolor{blue}{1}^2 - 1 = \textcolor{green}{0} & (\textcolor{blue}{1}, \textcolor{green}{0}) \\ \hline \textcolor{blue}{2} & \textcolor{blue}{2}^2 - 1 = \textcolor{green}{3} & (\textcolor{blue}{2}, \textcolor{green}{3}) \\ \hline \textcolor{blue}{3} & \textcolor{blue}{3}^2 - 1 = \textcolor{green}{8} & (\textcolor{blue}{3}, \textcolor{green}{8}) \end{array}

Sada te točke možemo prikazati na grafu.

<img src="https://api.matmat.online/api/image/f(x)isxpower2-1___Tocke.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />

---

## 3.

Ako uzmemo **još više vrijednosti za \(x\)**, dobit ćemo još više točaka.

\begin{array}{c|c|c} \textcolor{blue}{x} & \textcolor{green}{y} = f(\textcolor{blue}{x}) & (\textcolor{blue}{x}, \textcolor{green}{y}) \\ \hline... & ... & ... \\ \hline \textcolor{blue}{-1.0} & \textcolor{blue}{(-1.0)}^2 - 1 = \textcolor{green}{-0.0} & (\textcolor{blue}{-1.0}, \textcolor{green}{-0.0}) \\ \hline \textcolor{blue}{-0.8} & \textcolor{blue}{(-0.85)}^2 - 1 = \textcolor{green}{-0.3} & (\textcolor{blue}{-0.8}, \textcolor{green}{-0.3}) \\ \hline \textcolor{blue}{-0.7} & \textcolor{blue}{(-0.7)}^2 - 1 = \textcolor{green}{-0.5} & (\textcolor{blue}{-0.7}, \textcolor{green}{-0.5}) \\ \hline \textcolor{blue}{-0.5} & \textcolor{blue}{(-0.55)}^2 - 1 = \textcolor{green}{-0.7} & (\textcolor{blue}{-0.5}, \textcolor{green}{-0.7}) \\ \hline \textcolor{blue}{-0.4} & \textcolor{blue}{(-0.4)}^2 - 1 = \textcolor{green}{-0.8} & (\textcolor{blue}{-0.4}, \textcolor{green}{-0.8}) \\ \hline \textcolor{blue}{-0.2} & \textcolor{blue}{(-0.25)}^2 - 1 = \textcolor{green}{-0.9} & (\textcolor{blue}{-0.2}, \textcolor{green}{-0.9}) \\ \hline \textcolor{blue}{-0.1} & \textcolor{blue}{(-0.1)}^2 - 1 = \textcolor{green}{-1.0} & (\textcolor{blue}{-0.1}, \textcolor{green}{-1.0}) \\ \hline \textcolor{blue}{0.1} & \textcolor{blue}{0.05}^2 - 1 = \textcolor{green}{-1.0} & (\textcolor{blue}{0.1}, \textcolor{green}{-1.0}) \\ \hline \textcolor{blue}{0.2} & \textcolor{blue}{0.2}^2 - 1 = \textcolor{green}{-1.0} & (\textcolor{blue}{0.2}, \textcolor{green}{-1.0}) \\ \hline \textcolor{blue}{0.4} & \textcolor{blue}{0.35}^2 - 1 = \textcolor{green}{-0.9} & (\textcolor{blue}{0.4}, \textcolor{green}{-0.9}) \\ \hline \textcolor{blue}{0.5} & \textcolor{blue}{0.5}^2 - 1 = \textcolor{green}{-0.7} & (\textcolor{blue}{0.5}, \textcolor{green}{-0.7}) \\ \hline \textcolor{blue}{0.7} & \textcolor{blue}{0.65}^2 - 1 = \textcolor{green}{-0.6} & (\textcolor{blue}{0.7}, \textcolor{green}{-0.6}) \\ \hline \textcolor{blue}{0.8} & \textcolor{blue}{0.8}^2 - 1 = \textcolor{green}{-0.4} & (\textcolor{blue}{0.8}, \textcolor{green}{-0.4}) \\ \hline \textcolor{blue}{1.0} & \textcolor{blue}{0.95}^2 - 1 = \textcolor{green}{-0.1} & (\textcolor{blue}{1.0}, \textcolor{green}{-0.1}) \\ \hline... & ... & ... \end{array}

<img src="https://api.matmat.online/api/image/f(x)=xpower2-1___More_Dots.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />

---

## 4.

Primjećujemo da kako **povećavamo broj točaka**, graf sve više nalikuje pravom obliku funkcije.

Zato možemo zaključiti:

Graf funkcije \(f(x)\) je **skup svih točaka \((x,y)\)** koje zadovoljavaju tu funkciju.

<img src="https://api.matmat.online/api/image/$f(x)=xpower2-1$.png" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />`,
    hint: "Zamisli funkciju kao stroj: što ubaciš, a što dobiješ? Zatim za $f(x) = x^2 - 1$ izračunaj nekoliko parova $(x, y)$ i zamisli ih kao točke u koordinatnom sustavu.",
    why: "Zapis $y = f(x)$ kaže da se $y$ računa iz $x$. Svaki par $(x, f(x))$ je jedna točka, a graf je skup svih tih točaka. Zato iz formule funkcije uvijek možeš nacrtati graf: uvrštavaš $x$ i crtaš točke.",
    explain: [
      "Za svaki ulaz $x$ funkcija daje točno jedan izlaz $y$. Za $f(x) = 2x + 1$: kad je $x = 3$, dobiješ $y = 7$, a kad je $x = 0$, dobiješ $y = 1$.",
      "Svaki odabrani $x$ i njegov $y$ čine par $(x, y)$, a to je točka u koordinatnom sustavu. Za $f(x) = x^2 - 1$ i $x = 2$ dobiješ $y = 3$, odnosno točku $(2, 3)$.",
      "Što više vrijednosti za $x$ uzmeš, to su točke gušće. Razmaci među njima se smanjuju i počinje se nazirati krivulja.",
      "Kad bismo uzeli baš sve $x$, točke bi se spojile u neprekinutu krivulju. Ta krivulja, skup svih točaka $(x, f(x))$, je graf funkcije. Za $x^2 - 1$ to je parabola s tjemenom u $(0, -1)$.",
    ],
  },
];

// Matura fields with their share of the A level exam points.
export const DEMO_FIELDS = [
  { name: "Algebra i funkcije", weight: 50, pct: 58 },
  { name: "Mjerenje", weight: 20, pct: 71 },
  { name: "Oblik i prostor", weight: 15, pct: 44 },
  { name: "Brojevi", weight: 10, pct: 86 },
  { name: "Podatci, statistika i vjerojatnost", weight: 5, pct: 30 },
];

// status: mastered | learning | scheduled, dots: last rating out of 5.
export const DEMO_OBJECTIVES = [
  { name: "Kompleksni brojevi", status: "learning", dots: 2, when: "danas" },
  { name: "Logaritmi", status: "scheduled", dots: 3, when: "sutra" },
  { name: "Funkcije i graf funkcije", status: "scheduled", dots: 4, when: "za 6 dana" },
  { name: "Trigonometrijske jednadžbe", status: "learning", dots: 1, when: "danas" },
  { name: "Kvadratna funkcija", status: "mastered", dots: 5, when: "za 32 dana" },
  { name: "Volumen i oplošje tijela", status: "scheduled", dots: 3, when: "za 3 dana" },
];

// The demo exam: three multiple-choice questions, one point each.
export const DEMO_EXAM_QUESTIONS = [
  {
    text: "Koliko je $\\sqrt{50} - \\sqrt{18}$?",
    options: ["$2\\sqrt{2}$", "$\\sqrt{32}$", "$4$", "$8\\sqrt{2}$"],
    correct: "A",
  },
  {
    text: "Za koji $x$ vrijedi $3^{x+1} = 27$?",
    options: ["$1$", "$2$", "$3$", "$9$"],
    correct: "B",
  },
  {
    text: "Koliko je $\\sin 150^\\circ$?",
    options: ["$-\\dfrac{1}{2}$", "$\\dfrac{\\sqrt{3}}{2}$", "$\\dfrac{1}{2}$", "$-\\dfrac{\\sqrt{3}}{2}$"],
    correct: "C",
  },
];

export const DEMO_EXAMS = [
  { title: "ljetni rok", year: 2025, term: "Ljeto" },
  { title: "jesenski rok", year: 2024, term: "Jesen" },
  { title: "ljetni rok", year: 2024, term: "Ljeto" },
];

// Last five weeks, Monday first. 0 = no tasks that day, 3 = the most.
export const DEMO_ACTIVITY = [
  1, 2, 3, 2, 1, 0, 0,
  2, 3, 3, 1, 2, 1, 0,
  3, 2, 0, 2, 3, 2, 1,
  2, 3, 3, 3, 2, 1, 2,
  3, 3, 2, 3, 2,
];
