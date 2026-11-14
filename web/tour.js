// Guided tour: a scripted story through the app. It is also the script of the 30-second video and a
// safe demo for the pitch. Open the site with ?tour=1 to start it automatically (for screen recording).
// Edit the story here; numbers are read live from the data so captions never go stale.

const STEP_MS = 6500;                    // auto-play time per step
const DOHA = { lat: 25.2854, lng: 51.531 }; // pitch venue (NASA Space Apps Doha)

function steps(api) {
  const v = api.validation()?.bodies?.mars;
  const jez = api.candidate("jezero", 1);
  const gale = api.candidate("gale", 1);
  const galeKm = gale ? Math.round(api.distanceKm(DOHA.lat, DOHA.lng, gale.lat, gale.lng) / 5) * 5 : null;
  const g = api.target("gale")?.limits?.gravity_ms2?.value;
  const p = api.target("gale")?.limits?.pressure_pa?.value;
  const n = api.landCount().toLocaleString("en-US");

  return [
    {
      title: "Practise on Earth first",
      text: "Before astronauts land on Mars or the Moon, they practise on Earth. But where is Earth most like a real landing site?",
      run() { api.closePlace(); api.closeFolds(); api.labels([]); api.selectTarget("jezero"); api.flyTo(20, 30, 2.6, 1500); setTimeout(() => api.rotate(true), 1600); },
    },
    {
      title: "Pick a site on Mars",
      text: `Jezero crater, where NASA's Perseverance rover landed. We compared ${n} places on Earth with it, using NASA satellite data.`,
      run() { api.rotate(false); api.selectTarget("jezero"); api.flyTo(18, 25, 2.2, 1800); },
    },
    {
      title: "Earth lights up",
      text: "The glow shows where Earth is most like Jezero: landscape, temperature, rock type, dust and more. The redder, the closer.",
      run() { api.flyTo(25, 52, 1.5, 2000); },
    },
    jez && {
      title: "A new find",
      text: "Our top match: the Makran coast of Iran and Pakistan. A first literature search found no study using it as a Mars analog.",
      run() { api.flyTo(jez.lat, jez.lng, 0.9, 2000); setTimeout(() => api.showCandidate(jez), 1200); },
    },
    gale && {
      title: "Closer than you think",
      text: `For Curiosity's Gale crater, the best match is among the salt domes of southern Iran, about ${galeKm} km from Doha. Salt glaciers have been compared with Mars before, but we found no field study here yet.`,
      run() {
        api.closePlace(); api.selectTarget("gale");
        api.labels([{ ...DOHA, text: "Doha" }]);
        api.flyTo((gale.lat + DOHA.lat) / 2, (gale.lng + DOHA.lng) / 2, 0.75, 2000);
        setTimeout(() => api.showCandidate(gale), 1400);
      },
    },
    v && {
      title: "Does it work?",
      text: `We tested it: places scientists already use for Mars rank above plain desert (${Math.round(v.known_percentile_median * 100)}th vs ${Math.round(v.random_barren_median * 100)}th percentile of Earth's land). Modest evidence, and we say so.`,
      run() { api.closePlace(); api.labels([]); api.flyTo(25, 40, 2.3, 1500); api.openFold("trust"); },
    },
    {
      title: "What Earth can't copy",
      text: g && p
        ? `No place on Earth has Mars's ${Math.round((100 * g) / 9.81)}% gravity, its air at ${(100 * p / 101325).toFixed(1)}% of Earth's pressure, or its radiation. Analogs help with everything else.`
        : "No place on Earth copies the gravity, thin air or radiation of Mars or the Moon. Analogs help with everything else.",
      run() { api.openFold("trust", false); api.openFold("site-more"); },
    },
    {
      title: "Your turn",
      text: "Pick any Mars or Moon site and click anywhere on Earth. Analog Atlas: Earth's best practice grounds for space.",
      run() { api.closeFolds(); api.flyTo(20, 30, 2.4, 1500); setTimeout(() => api.rotate(true), 1600); },
    },
  ].filter(Boolean);
}

export function initTour(api) {
  const box = document.getElementById("tour");
  const $ = (id) => document.getElementById(id);
  let list = [], idx = 0, timer = 0, playing = false;

  function render() {
    const s = list[idx];
    $("tour-count").textContent = `${idx + 1} / ${list.length}`;
    $("tour-title").textContent = s.title;
    $("tour-text").textContent = s.text;
    $("tour-dots").innerHTML = list.map((_, k) => `<span class="${k === idx ? "on" : ""}"></span>`).join("");
    $("tour-back").disabled = idx === 0;
    $("tour-next").textContent = idx === list.length - 1 ? "Finish" : "Next ▶";
    $("tour-play").textContent = playing ? "⏸" : "▶";
    $("tour-play").title = playing ? "Pause" : "Play";
    box.classList.remove("fade"); void box.offsetWidth; box.classList.add("fade"); // re-trigger the text fade
  }
  function schedule() {
    clearTimeout(timer);
    if (playing && idx < list.length - 1) timer = setTimeout(() => go(idx + 1), STEP_MS);
    else if (playing) timer = setTimeout(() => { playing = false; render(); }, STEP_MS);
  }
  function go(k) {
    idx = Math.max(0, Math.min(k, list.length - 1));
    list[idx].run();
    render();
    schedule();
  }
  function start() {
    list = steps(api);
    box.hidden = false;
    document.body.classList.add("touring");
    playing = true;
    go(0);
  }
  function stop() {
    clearTimeout(timer);
    playing = false;
    box.hidden = true;
    document.body.classList.remove("touring");
    api.labels([]);
    api.rotate(true);
  }

  $("tour-btn").addEventListener("click", start);
  $("tour-exit").addEventListener("click", stop);
  $("tour-back").addEventListener("click", () => go(idx - 1));
  $("tour-next").addEventListener("click", () => (idx === list.length - 1 ? stop() : go(idx + 1)));
  $("tour-play").addEventListener("click", () => { playing = !playing; render(); schedule(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "ArrowRight") go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
    else if (e.key === "Escape") stop();
    else if (e.key === " ") { e.preventDefault(); playing = !playing; render(); schedule(); }
  });

  if (new URLSearchParams(location.search).get("tour") === "1") setTimeout(start, 800);
}
