// Mission context: why a match matters and how the place could be used (plan.md, "How the app
// presents a match", idea 1). Text only; nothing here changes a score.

// One card per target: what is happening or planned there, and what teams must test on Earth first.
export const MISSIONS = {
  jezero: {
    mission: "NASA's Perseverance rover (landed 2021) is collecting rock samples in an ancient lake bed and river delta. A later mission is planned to bring them back to Earth.",
    tests: ["driving and drilling on crater-floor and delta rocks", "choosing which rocks may hold signs of ancient life", "keeping dust off solar panels and instruments"],
  },
  gale: {
    mission: "NASA's Curiosity rover (landed 2012) is climbing the layered rocks of Mount Sharp, reading billions of years of Mars climate history.",
    tests: ["rover driving on slopes and over sand", "reading rock layers from orbit and on the ground", "batteries and electronics through cold nights"],
  },
  utopia: {
    mission: "China's Zhurong rover (landed 2021) explored the northern plains, using radar to look for buried layers and water ice under the surface.",
    tests: ["ground-penetrating radar on flat, layered plains", "landing on wide, flat ground", "solar power through dust storms"],
  },
  arcadia: {
    mission: "A leading candidate for the first human landing on Mars: flat plains with water ice a few centimetres to metres below the surface, which crews could use for water and rocket fuel.",
    tests: ["landing large ships on flat, boulder-poor plains", "drilling for and extracting ice (the buried ice itself is not in our score)", "living and working in extreme cold"],
  },
  shackleton: {
    mission: "NASA's Artemis astronauts are planned to land in this south-pole region: ridges with almost constant sunlight next to permanently dark craters that trap ice.",
    tests: ["walking and driving on steep, rough slopes in low sunlight", "power and heating in extreme cold", "finding and drilling ice in the dark craters nearby (not in our score)"],
  },
  marius_hills: {
    mission: "A skylight into an intact lava tube: a natural cave that could shield a future Moon base from radiation, small meteorites and huge temperature swings.",
    tests: ["landing and driving on lava plains", "robots going down into pits and caves (the cave itself is not in our score)", "building on and with basalt rock"],
  },
};

// What a good match in each dimension lets a team practise.
export const USE = {
  terrain: "rover driving, landing hazards and astronaut walks",
  temperature: "batteries, materials and equipment in the cold",
  vegetation: "instruments that must see bare ground, with no plants in the way",
  aridity: "life-detection tests at the dry limit of life",
  albedo: "cameras, navigation and heat behaving as they would on the site",
  ice: "operations on frost-free ground, as at the site",
  dust: "dust on solar panels, seals and optics",
  geology: "instruments and rock-sample choice on the same kind of rock",
};
