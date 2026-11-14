# Creative ideas: making the globe memorable

Proposal by Person B, for discussion. Nothing here is agreed yet.

## The problem

The science in `plan.md` is strong: scoring all of Earth, validating against known analogs and finding under-studied sites is more rigorous than most teams will manage. The **presentation** is the weak point. A spinning globe with a heat map and sliders is what many hackathon teams show, and a judge who has seen ten globes that day won't remember one more. Sliders also hand the work to the judge ("move these and see") instead of telling a story.

The idea: keep the globe and the science, and change **what the user does** with it.

## Ideas, cheapest first

### 1. Mission questions instead of sliders (cheap, big effect)

The app opens with a question instead of seven sliders: **"What do you want to prepare for?"**

| Mission question | Weights emphasised |
|---|---|
| Test a rover for Jezero | terrain, dust |
| Train astronauts for the lunar south pole | terrain, temperature (cold) |
| Test an ice drill for Arcadia Planitia | ice, temperature |
| Search for signs of life (Mars) | aridity, vegetation (barren) |

- Each answer is only a preset of the existing dimension weights and a target, so it needs no new data or contract change.
- It turns "a map" into "a tool for mission planners", which answers the challenge's "how could this help exploration" directly.
- The sliders stay, under an "Advanced" button.
- Cost: about 1 hour for Person B.

### 2. A "fingerprint" for each place (cheap)

Every place gets a small seven-sided radar chart, one axis per dimension. The Earth site's shape is drawn over the Mars or Moon target's shape.

- Shows "what matches and where it breaks down" at a glance instead of in text.
- Works in the side panel, the slides, the video and the report cover.
- Uses the per-dimension scores the app already computes.
- Cost: about 1–2 hours for Person B.

### 3. Tell the story from Mars (free)

The tour starts on Mars, not Earth: **"Perseverance is here. Where on Earth can we rehearse this?"** Then the camera turns to Earth and the map colours in.

- Same app, more memorable opening.
- Cost: part of the tour script.

### 4. "Earth on Mars" twin view (medium, stretch)

Fly to a found Earth site, cut out a patch of it, and lay it on the Mars globe at the target it matches, at the same scale.

- The moment "this piece of Earth sits inside Jezero" is the "surprise us" the challenge asks for, and a strong three-second shot for the video.
- Person B only: a texture patch on the second globe. Needs the deep-dive site images (Sentinel-2 or Worldview).
- Cost: about 2–3 hours. First stretch item for B after Checkpoint 2.

### 5. "Most Mars-like month" calendar (expensive for Person A, stretch)

Person A already has monthly data (36 months of temperature, snow and precipitation). The score could change by month: **"This valley is most Mars-like in January, the best month to send a test team."**

- No other team is likely to have a time dimension, and it gives practical advice for planning field campaigns.
- Needs monthly features in the pipeline and a change to `docs/contract.md`, so it only fits if A is ahead of schedule.

## Recommendation

- **Core:** ideas 1, 2 and 3. A few hours of B's time, none of A's, and they change how the whole project feels.
- **First stretch for B:** idea 4.
- **Only if A is ahead:** idea 5.

## Questions for Person A

1. Do ideas 1–3 in the core work for you? None of them changes the contract.
2. Is idea 5 realistic in your pipeline, or should it stay a "next steps" line in the write-up?
3. Should the mission-question presets be fixed in `targets.json`, or kept in the app (`web/`)? The app is simpler and needs no contract change.
