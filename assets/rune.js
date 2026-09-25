// Comportamento condiviso del sito RuneGuardians: il reveal delle sezioni,
// le braci dell'abisso e il conto alla rovescia. Caricato con defer da ogni
// pagina generata; il comportamento specifico di una singola pagina resta
// nel suo <script> inline.

// Le scene e i divisori entrano quando li raggiungi (una volta sola).
var occhio = new IntersectionObserver(function (voci) {
  voci.forEach(function (v) {
    if (v.isIntersecting) { v.target.classList.add("visto"); occhio.unobserve(v.target); }
  });
}, { threshold: 0.22 });
document.querySelectorAll(".scena, .runa-divisore").forEach(function (n) { occhio.observe(n); });

// Globale condivisa: la leggono anche gli script inline delle singole
// pagine (es. l'inclinazione dell'albo in index.html). Chi la legge da
// li' deve aspettare "DOMContentLoaded", perche' questo file e' deferred
// e uno script inline senza defer gira prima, quando "fermo" non esiste
// ancora.
var fermo = matchMedia("(prefers-reduced-motion: reduce)").matches;

// L'hero della home: ogni 6 secondi la classe "viva" passa alla slide
// successiva, cosi' il CSS fa dissolvere l'una nell'altra. Ferma del tutto
// con prefers-reduced-motion (resta la prima, statica: nessun timer parte)
// e in pausa quando la scheda non e' visibile. Sulle pagine senza hero
// (es. /lancio/) .hero-slide non c'e': esce subito, non lancia nulla.
(function () {
  var contenitore = document.querySelector(".hero-slide");
  if (!contenitore) return;
  var slide = contenitore.querySelectorAll(".slide");
  if (slide.length < 2 || fermo) return;
  var indice = 0;
  var ciclo = null;
  function avanti() {
    slide[indice].classList.remove("viva");
    slide[indice].setAttribute("aria-hidden", "true");
    indice = (indice + 1) % slide.length;
    slide[indice].classList.add("viva");
    slide[indice].removeAttribute("aria-hidden");
  }
  function avvia() {
    if (ciclo) return;
    ciclo = setInterval(avanti, 6000);
  }
  function ferma() {
    clearInterval(ciclo);
    ciclo = null;
  }
  if (!document.hidden) avvia();
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) ferma(); else avvia();
  });
})();

// Le braci dell'abisso: poche, lente, dorate. Si fermano fuori schermo.
// Solo la home ha il canvas .hero-braci: sulle altre pagine generate
// questo blocco deve semplicemente non fare nulla, non lanciare — un
// errore qui fermerebbe anche il countdown e il burger piu' sotto,
// perche' sono istruzioni successive dello stesso script.
(function () {
  if (fermo) return;
  var tela = document.querySelector(".hero-braci");
  if (!tela) return;
  var ctx = tela.getContext("2d");
  var braci = [], W, H, viva = true;
  function misura() {
    W = tela.width = tela.offsetWidth;
    H = tela.height = tela.offsetHeight;
  }
  misura(); addEventListener("resize", misura);
  for (var i = 0; i < 42; i++) {
    braci.push({ x: Math.random(), y: Math.random(),
                 r: .8 + Math.random() * 1.9,
                 vx: (Math.random() - .3) * .00012,
                 vy: -.00005 - Math.random() * .00019,
                 a: .12 + Math.random() * .4,
                 f: 2 + Math.random() * 4, t: Math.random() * 7 });
  }
  new IntersectionObserver(function (v) { viva = v[0].isIntersecting; },
                           { threshold: 0 }).observe(tela);
  (function disegna(ora) {
    requestAnimationFrame(disegna);
    if (!viva) return;
    ctx.clearRect(0, 0, W, H);
    braci.forEach(function (b) {
      b.x += b.vx * W / 16; b.y += b.vy * H / 16; b.t += .016;
      if (b.y < -.02) { b.y = 1.02; b.x = Math.random(); }
      if (b.x < -.02 || b.x > 1.02) b.x = (b.x + 1.04) % 1.04 - .02;
      var alone = b.a * (0.6 + 0.4 * Math.sin(b.t * b.f));
      ctx.beginPath();
      ctx.arc(b.x * W, b.y * H, b.r, 0, 7);
      ctx.fillStyle = "rgba(227, 201, 143, " + alone.toFixed(3) + ")";
      ctx.shadowColor = "rgba(201, 163, 90, .8)";
      ctx.shadowBlur = 8;
      ctx.fill();
    });
  })();
})();

// Conto alla rovescia alla chiusura della campagna. La data viaggia nel
// data-chiusura della sezione (vedi sito_config.json): cambiarla vuol
// dire cambiare solo quel file, mai questo script.
(function () {
  var contenitore = document.getElementById("conto-cifre");
  if (!contenitore) return;
  var fine = new Date(contenitore.dataset.chiusura);
  var finita = document.getElementById("conto-finita");
  // Il pulsante dorato verso Kickstarter DENTRO QUESTA sezione: a campagna
  // chiusa deve sparire insieme alle cifre, non restare accanto a "La
  // campagna è conclusa." a invitare a sostenere qualcosa che non si puo'
  // piu' sostenere. Cercato dentro .closest(".conto"), non con un
  // document.querySelector(".conto-cta") globale: la classe ".conto-cta"
  // e' condivisa da altri due bottoni Kickstarter della home (l'invito
  // della Galleria e il blocco Kickstarter a fine pagina) che oggi
  // funziona solo perche' il conto alla rovescia e' il primo in ordine nel
  // documento — un riordino della home avrebbe nascosto il bottone
  // sbagliato (o nessuno) in silenzio.
  var cta = contenitore.closest(".conto").querySelector(".conto-cta");
  var cifre = {};
  contenitore.querySelectorAll(".numero").forEach(function (n) {
    cifre[n.dataset.u] = n;
  });
  function scrivi(cella, valore) {
    if (cella.textContent === valore) return;
    cella.textContent = valore;
    cella.classList.remove("battito");
    void cella.offsetWidth; // riavvia l'animazione
    cella.classList.add("battito");
  }
  function aggiorna() {
    var resto = fine - Date.now();
    if (resto <= 0) {
      contenitore.hidden = true;
      if (finita) finita.hidden = false;
      if (cta) cta.hidden = true;
      return true;
    }
    var s = Math.floor(resto / 1000);
    scrivi(cifre.g, String(Math.floor(s / 86400)));
    scrivi(cifre.h, String(Math.floor(s / 3600) % 24).padStart(2, "0"));
    scrivi(cifre.m, String(Math.floor(s / 60) % 60).padStart(2, "0"));
    scrivi(cifre.s, String(s % 60).padStart(2, "0"));
    return false;
  }
  if (aggiorna()) return;
  var battito = setInterval(function () {
    if (aggiorna()) clearInterval(battito);
  }, 1000);
})();

// «Come nasce una tavola»: lo stadio vivo segue la frazione di scroll
// dentro la sezione, non la rotella o un timer — cosi' non si puo' mai
// "sentire" la pagina resistere allo scroll dell'utente (nessun
// preventDefault, nessuna riscrittura della posizione). Il calcolo gira
// dentro requestAnimationFrame per non intasare il thread a ogni evento di
// scroll, ed e' attivo/spento da un IntersectionObserver: il listener di
// scroll esiste solo mentre la sezione e' vicina allo schermo, come le
// braci qui sopra. Sotto reduced-motion, o su schermi stretti (dove il CSS
// tiene la sezione come lista statica: vedi rune.css), non c'e' niente da
// calcolare e il blocco esce subito.
(function () {
  var sezione = document.querySelector(".nascita");
  if (!sezione || fermo) return;
  var stadi = sezione.querySelectorAll(".nascita-stadio");
  if (stadi.length < 2) return;
  // Stessa soglia della barra e dell'hero (761px, non un numero a se':
  // rune.css lo spiega vicino a @media (min-width: 761px) dello
  // scroll-telling) — sotto, il CSS tiene .nascita-media "static" e
  // spostare classi "stadio-vivo" non farebbe comunque nulla di visibile.
  if (!matchMedia("(min-width: 761px)").matches) return;

  var vivo = -1;
  var richiesto = false;

  function aggiorna() {
    richiesto = false;
    var rettangolo = sezione.getBoundingClientRect();
    // Il palco (.nascita-media) e' sticky e resta appuntato solo finche'
    // la sezione ha ancora corsa residua oltre la sua stessa altezza: la
    // corsa vera di "stuck" e' altezza_sezione - altezza_palco, NON
    // altezza_sezione - innerHeight. Con l'innerHeight (sbagliato) lo
    // stadio 4 si accendeva troppo tardi rispetto a quando il palco
    // smette DAVVERO di essere appuntato, cosi' passava gran parte del
    // suo tempo "vivo" gia' in fuga verso l'alto, tagliato dalla barra —
    // proprio la tavola finale, il momento che l'intera sequenza prepara.
    // L'altezza del palco si legge dall'elemento (offsetHeight), non si
    // ricalcola qui "100vh - barra": un solo numero vero, quello che il
    // browser ha davvero disposto, che resta corretto anche se l'altezza
    // della barra cambia in futuro.
    var palco = sezione.querySelector(".nascita-media");
    var altezzaPalco = palco ? palco.offsetHeight : innerHeight;
    var distanza = Math.max(1, sezione.offsetHeight - altezzaPalco);
    // frazione 0 = l'inizio della sezione appena raggiunto (stadio 1),
    // frazione 1 = il palco ha appena smesso di essere appuntato (stadio
    // finale, tenuto fino all'ultimo istante utile)
    var frazione = -rettangolo.top / distanza;
    frazione = Math.min(1, Math.max(0, frazione));
    var indice = Math.min(stadi.length - 1, Math.floor(frazione * stadi.length));
    if (indice === vivo) return;
    vivo = indice;
    stadi.forEach(function (stadio, i) {
      stadio.classList.toggle("stadio-vivo", i === indice);
    });
  }
  function richiedi() {
    if (richiesto) return;
    richiesto = true;
    requestAnimationFrame(aggiorna);
  }

  new IntersectionObserver(function (voci) {
    if (voci[0].isIntersecting) {
      aggiorna();
      addEventListener("scroll", richiedi, { passive: true });
      addEventListener("resize", richiedi);
    } else {
      removeEventListener("scroll", richiedi);
      removeEventListener("resize", richiedi);
    }
  }, { rootMargin: "100% 0px 100% 0px" }).observe(sezione);
})();

// La barra: su mobile il menu si apre col burger.
(function () {
  var burger = document.querySelector(".barra-burger");
  var menu = document.querySelector(".barra-sito nav");
  if (!burger || !menu) return;
  burger.addEventListener("click", function () {
    var aperto = !menu.hidden;
    menu.hidden = aperto;
    burger.setAttribute("aria-expanded", String(!aperto));
  });
  // Da desktop il menu e' sempre visibile: niente hidden ereditato. Da
  // mobile torna chiuso: senza questo ramo, restringendo la finestra (o
  // ruotando un tablet da orizzontale a verticale) SENZA ricaricare la
  // pagina, il menu apertosi da desktop restava aperto sopra l'hero —
  // aria-expanded deve tornare "false" insieme, altrimenti annuncia uno
  // stato aperto su un bottone che in realta' apre un menu chiuso.
  var largo = matchMedia("(min-width: 761px)");
  function adegua() {
    if (largo.matches) {
      menu.hidden = false;
    } else {
      menu.hidden = true;
      burger.setAttribute("aria-expanded", "false");
    }
  }
  largo.addEventListener("change", adegua);
  adegua();
})();
