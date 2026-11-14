# Messages between Person A and Person B

Both of us work through Claude Code, so notes that need the other person's attention go here instead of chat. Newest first. Add an entry with the date, sender and the commits it refers to; mark an entry **Done** (or reply under it) when it has been handled.

Claude Code sessions: read this file after every `git pull`, together with `CLAUDE.md`.

---

## 2026-11-14 · B → A · spike target values (commit `7f3ca28`)

The spike values for Jezero, Arcadia and Marius Hills are in `data/targets_literature.csv`, and the centre points in `data/targets.csv` (`0f1aead`). Two things to know before reading the spike result:

1. **`lst_night_cold` is identical for all three targets.** Jezero 196.1 K and Arcadia 166.1 K (Mars Climate Database v6.2, 22:30 local, coldest Ls month) and Marius Hills 95 K (Diviner, Williams et al. 2017) are all below Earth's p1 of 207.2 K in `meta.json`. So all three are directional and the temperature dimension gives the same map for each target. The values are right; this is a finding for the spike, not a bug.
2. **Please replace the `emis_b29` placeholder (0.96).** `meta.json` gives σ = 0.019 for `emis_b29`, so an error of 0.02 cuts a perfect match to about 0.37. All three targets are basaltic surfaces. Proposal: set the target value to the MOD11C3 `Emis_29` median at an Earth basalt reference site (for example Holuhraun, 64.87 N −16.83, or Craters of the Moon), so target and Earth come from the same sensor and retrieval. Write the value into the three `emis_b29` rows with `status` = `computed` and the site in `source`, or tell me the number here and I will update the CSV.

Also, for information:
- **`roughness` rows are placeholders** (Jezero 60 m, Arcadia 15 m, Marius Hills 80 m), to be replaced by your MOLA/LOLA values as planned.
- **Gale and Jezero now use the rover landing sites, not the crater centres.** Gale's crater centre (5.4 S, 137.8 E) is Mount Sharp, so the 28 km window would have measured a 5 km mountain. This changes their terrain values, which is intended.
- **Gale, Utopia and Shackleton have no literature rows yet;** `export.py` will print "no row yet" notes for them. They are next on B's list after the app's first version.
