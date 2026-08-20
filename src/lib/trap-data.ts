// Trap Generator Data Library
// Artists, moods, topics, BPM vibes, and song structures

export interface Artist {
  id: string;
  name: string;
  style: string;
  origin: string;
  defaultSpanglish?: number; // suggested spanglish ratio for this artist
  adlibs?: string[]; // signature ad-libs for authentic flavor
  beatTags?: string[]; // suggested Suno/Udio-style beat tags
}

export interface ArtistGroup {
  label: string;
  artists: Artist[];
}

export const ARTISTS_DATA: ArtistGroup[] = [
  {
    label: "🇺🇸 Atlanta / US Trap & Rage",
    artists: [
      { id: "future", name: "Future", origin: "Atlanta", style: "Voz melódica con autotune pesado, flow arrastrado por el lean, dolor emocional en cada ad-lib (Brrr, Yeah). Metáforas de codeína, alienación y dinero oscuro.", defaultSpanglish: 95, adlibs: ["Brrr", "Yeah", "Perkys", "Codeine", "Sippin'"], beatTags: ["heavy 808s", "dark synth pad", "slow trap", "auto-tune vocal", "melancholic piano", "codeine lean vibe"] },
      { id: "young_thug", name: "Young Thug", origin: "Atlanta", style: "Voz aguda impredecible, melodías caóticas tipo slime, palabras arrastradas, ad-libs excitados de tono elevado. Flow que rompe la métrica tradicional.", defaultSpanglish: 95, adlibs: ["Slime", "œuh", "Brrr", "Yeah", "Woo"], beatTags: ["slime synth", "high-pitched melodic", "bouncy 808", "playful pluck", "stutter hi-hat"] },
      { id: "21_savage", name: "21 Savage", origin: "Atlanta/London", style: "Susurro frío y monótono, amenazas deadpan, brutalmente honesto. Ad-libs cortos (Woah, Sheesh). Letras de calle crudas sin emoción.", defaultSpanglish: 95, adlibs: ["Woah", "Sheesh", "Savage", "Grrah"], beatTags: ["dark piano loop", "minimal 808", "drill hi-hat", "cold atmosphere", "booming sub-bass"] },
      { id: "playboi_carti", name: "Playboi Carti", origin: "Atlanta", style: "Vamp de tono agudo, gritos caóticos, baby voice, ad-libs repetitivos obsesivos (œuh, slatt). Letras mínimas, vibe sobre narrativa.", defaultSpanglish: 95, adlibs: ["œuh", "Slatt", "What", "Vamp", "Yeah"], beatTags: ["vamp synth", "heavy distorted 808", "repetitive bell", "rage beat", "chaotic ad-libs"] },
      { id: "yeat", name: "Yeat", origin: "Portland/LA", style: "Tonka flow, distorsión pesada, lenguaje inventado (twizzy, lüh geek), campanas y 808s masivos. Energía rage pura.", defaultSpanglish: 95, adlibs: ["Twizzy", "Lüh geek", "Tonka", "Yeah", "Brrr"], beatTags: ["rage synth", "heavy distorted 808", "bells", "tonka beat", "hyperpop trap"] },
      { id: "gunna", name: "Gunna", origin: "Atlanta", style: "Slide melódico suave, drip effortless, tono elevado. Flow de pago fluido. Ad-libs (Wun, Slime). Letras de moda, joyería y mujeres.", defaultSpanglish: 95, adlibs: ["Wun", "Slime", "Drip", "Yeah", "Oh"], beatTags: ["plugg synth", "smooth 808 slide", "clean hi-hat", "melodic flute", "luxury vibe"] },
      { id: "lil_baby", name: "Lil Baby", origin: "Atlanta", style: "Melodía rapid fire, confesiones emocionales, flow breathless con voz strained. Ad-libs (Yeah, Wee). Calle + vulnerabilidad.", defaultSpanglish: 95, adlibs: ["Yeah", "Wee", "Real", "Talk", "No cap"], beatTags: ["emotional piano", "fast hi-hat", "melodic 808", "syncopated kick", "introspective vibe"] },
      { id: "travis_scott", name: "Travis Scott", origin: "Houston", style: "Voz con autotune psicodélico, flow atmosférico y oscuro, ad-libs catastróficos (It's lit!, Straight up!). Energy de moshpit y rage.", defaultSpanglish: 95, adlibs: ["It's lit!", "Straight up!", "Yeah!", "La Flame", "Sicko mode"], beatTags: ["psychedelic synth", "heavy reverb 808", "atmospheric pad", "rage beat", "wall of sound"] },
      { id: "asap_rocky", name: "A$AP Rocky", origin: "Harlem/NYC", style: "Flow elegante y psicodélico, moda alta costura, cadencia arrastrada con acento de Harlem. Vibe cloud rap.", defaultSpanglish: 95, adlibs: ["Flacko!", "A$AP", "Yeah", "Lord", "Uh"], beatTags: ["cloud rap synth", "chopped and screwed", "luxury 808", "psychedelic sample", "harlem bounce"] },
      { id: "trippie_redd", name: "Trippie Redd", origin: "Canton/Ohio", style: "Gritos melódicos desgarradores, falsetes emo y sintes rage futuristas. Mezcla de dolor y energía de moshpit.", defaultSpanglish: 95, adlibs: ["14!", "Yeah", "Big 14", "Woo", "Oh"], beatTags: ["rage synth", "emo guitar loop", "distorted 808", "hyperpop lead", "moshpit energy"] },
      { id: "lil_uzi", name: "Lil Uzi Vert", origin: "Philadelphia", style: "Flow energético con tono agudo, melodías pegadizas, ad-libs hiperactivos (Yeah, Aye). Emo rap y rage.", defaultSpanglish: 95, adlibs: ["Yeah", "Aye", "Woo", "Slatt", "1700"], beatTags: ["emo guitar loop", "bouncy 808", "bright synth", "rage-ready", "melodic bell"] },
      { id: "lil_tecca", name: "Lil Tecca", origin: "Queens/NYC", style: "Melodías ultra pegadizas, flow ligero y rebotado, letras juveniles de flex y romance moderno.", defaultSpanglish: 90, adlibs: ["Tecca", "Yeah", "Ooh", "Bands", "Ay"], beatTags: ["plugg synth", "bouncy 808", "cheerful melody", "clean trap drums", "summer vibe"] },
      { id: "ken_carson", name: "Ken Carson", origin: "Atlanta", style: "Opium sound: distorsión extrema, estética de caos juvenil, staccato crudo y 808s saturados.", defaultSpanglish: 95, adlibs: ["X!", "Yeah", "Chaos", "Huh", "00"], beatTags: ["distorted rage lead", "overblown 808", "fast hi-hat rolls", "dark moshpit", "opium vibe"] },
      { id: "destroy_lonely", name: "Destroy Lonely", origin: "Atlanta", style: "Opium sound: ambient trap oscuro, letras de diseñador de lujo, flow relajado y voz de falsete susurrado.", defaultSpanglish: 95, adlibs: ["Lone", "Yeah", "Top floor", "Look", "No stylist"], beatTags: ["ambient synth pad", "reverb 808", "dark luxury", "guitar loop", "hypnotic bounce"] },
      { id: "drake", name: "Drake", origin: "Toronto", style: "Flow versátil entre melódico emocional y rap técnico. Confesiones, arrepentimientos, flex sutil.", defaultSpanglish: 92, adlibs: ["Yeah", "Oh", "Way", "6", "Alright"], beatTags: ["clean R&B synth", "soft 808", "ambient pad", "introspective piano", "Toronto vibe"] },
      { id: "don_tolver", name: "Don Toliver", origin: "Houston", style: "Voz aguda melódica con falseteo, tono R&B trap sedoso. Ad-libs etéreos y flow cantado.", defaultSpanglish: 95, adlibs: ["Oh", "Yeah", "Ah", "No", "Better"], beatTags: ["R&B trap synth", "smooth 808", "ethereal pad", "falsetto-friendly", "late-night vibe"] },
      { id: "gucci_mane", name: "Gucci Mane", origin: "Atlanta", style: "Pionero del trap de Atlanta, flow grave pausado con ad-libs icónicos (Brrr, It's Gucci).", defaultSpanglish: 95, adlibs: ["Brrr", "It's Gucci", "Yeah", "Gucci", "So icy"], beatTags: ["classic trap 808", "zaytoven piano", "brass hit", "atlanta bounce", "street synth"] },
      { id: "quavo", name: "Quavo", origin: "Atlanta", style: "Tercio de Migos. Triplet flow melódico, voz autotuneada aguda, hooks ultra pegadizos.", defaultSpanglish: 95, adlibs: ["Mama!", "Skrrt", "Quavo", "Yeah", "Ice"], beatTags: ["migos triplet", "melodic 808", "syncopated hi-hat", "atlanta bounce", "hook synth"] },
      { id: "offset", name: "Offset", origin: "Atlanta", style: "Tercio de Migos. Flow agresivo y técnico con triplet flow, voz cortante y punchlines de calle.", defaultSpanglish: 95, adlibs: ["Whoa", "Offset", "Slatt", "Hey", "Bow"], beatTags: ["migos triplet", "aggressive 808", "rapid hi-hat", "dark synth", "street piano"] },
      { id: "takeoff", name: "Takeoff (RIP)", origin: "Atlanta", style: "Tercio de Migos (QEPD). Flow técnico denso, rimas internas complejas, flow metronómico perfecto.", defaultSpanglish: 95, adlibs: ["Mama!", "Yeah", "Take", "Alright", "Qua"], beatTags: ["migos triplet", "technical flow beat", "dense 808", "syncopated trap", "atlanta underground"] },
      { id: "lil_yachty", name: "Lil Yachty", origin: "Atlanta", style: "Flow alegre y burlón, voz nasal aguda, vamps coloridos y experimentación sonora.", defaultSpanglish: 95, adlibs: ["Lil Boat", "Yeah", "Yachty", "Sailing", "Woo"], beatTags: ["bubblegum trap", "bright synth", "playful bell", "bouncy 808", "happy melody"] },
    ],
  },
  {
    label: "🌎 Latin Trap & Spanglish Kings",
    artists: [
      { id: "eladio_carrion", name: "Eladio Carrión", origin: "Puerto Rico/MD", style: "El rey del Latin Trap y Spanglish. Flow americano en español, punchlines de baloncesto/cultura pop, barras crudas y métrica perfecta.", defaultSpanglish: 45, adlibs: ["Sauce!", "3MEN2", "Yeah", "S-S-Sauce", "Wuh"], beatTags: ["hard latin trap", "sliding 808", "dark piano loop", "atlanta drums", "sauce vibe"] },
      { id: "bad_bunny", name: "Bad Bunny", origin: "Puerto Rico", style: "Voz rasposa y profunda, Spanglish fluido, flow versátil entre melódico, trap oscuro y perreo.", defaultSpanglish: 30, adlibs: ["Yeh", "Eh", "Bunny", "Ah", "Boricua"], beatTags: ["reggaeton", "dembow", "latin trap", "playful synth", "island vibe"] },
      { id: "anuel_aa", name: "Anuel AA", origin: "Puerto Rico", style: "Voz grave y autotuneada, Spanglish agresivo constante, letras de calle boricua y lealtad.", defaultSpanglish: 35, adlibs: ["Brrr", "Real Hasta La Muerte", "Anuel", "Ah", "Bebe"], beatTags: ["latin trap", "reggaeton 808", "dembow beat", "auto-tune vocal", "boricua vibe"] },
      { id: "duki", name: "Duki", origin: "Argentina", style: "El pionero del trap argentino. Flow cargado de autotune rítmico, jerga porteña (modo diablo, goteo), versos acelerados y energía de estadio.", defaultSpanglish: 20, adlibs: ["Duko!", "Skrrt", "Modo Diablo", "Yeah", "Goteo"], beatTags: ["argentina trap", "hard 808", "dark synth lead", "bouncy kick", "rock trap energy"] },
      { id: "young_miko", name: "Young Miko", origin: "Puerto Rico", style: "Flow relajado y seguro con Spanglish constante, barras inteligentes de flex femenino, voz suave y atractiva.", defaultSpanglish: 40, adlibs: ["Miko!", "Wiggy", "Yeah", "Baby Miko", "Uh"], beatTags: ["smooth latin trap", "clean 808", "r&b trap chords", "bouncy bounce", "stylish drums"] },
      { id: "mora", name: "Mora", origin: "Puerto Rico", style: "Trap melódico y reggaeton atmosférico oscuro. Letras confesionales de desamor, noche y drogas.", defaultSpanglish: 15, adlibs: ["Mora", "Yeah", "Oh-oh", "Baby", "Sube"], beatTags: ["melancholic synth pad", "smooth 808", "reggaeton trap", "spacey vocal", "late night"] },
      { id: "yovngchimi", name: "Yovngchimi", origin: "Puerto Rico", style: "Glizzy Gang: violencia cruda de drill PR, Spanglish agresivo constante, voz endemoniada.", defaultSpanglish: 40, adlibs: ["Grrah", "Bow", "Glizzy", "Chimi", "Free"], beatTags: ["drill beat", "sliding 808", "dark piano", "aggressive hi-hat", "glizzy gang vibe"] },
      { id: "myke_towers", name: "Myke Towers", origin: "Puerto Rico", style: "Flow técnico boricua, Spanglish balanceado, flex con elegancia y métrica impecable.", defaultSpanglish: 25, adlibs: ["Towers", "Young", "Easy Money", "Yeah", "Prrr"], beatTags: ["crisp trap", "latin bounce", "clean 808", "bright brass", "smooth flow"] },
    ],
  },
  {
    label: "🇪🇸 Trap & Rap Español",
    artists: [
      { id: "yung_beef", name: "Yung Beef", origin: "Granada/Barcelona", style: "Flow crudo de la calle, pionero del trap en España, estética A.D.R.M, actitud punk y underground.", defaultSpanglish: 10, adlibs: ["Seco!", "Prrr", "Beef", "ADRM", "Ah"], beatTags: ["dark plugg", "lo-fi 808", "distorted bass", "barrio vibe", "raw vocal"] },
      { id: "cruz_cafune", name: "Cruz Cafuné", origin: "Tenerife", style: "Flow melódico canario, storytelling de lujo y melancolía isleña, referencias profundas.", defaultSpanglish: 15, adlibs: ["Pana", "Nene", "Ah", "Canarias", "Muevo con Dios"], beatTags: ["melodic trap", "warm synth", "island vibe", "smooth 808", "reflective pad"] },
      { id: "delaossa", name: "Delaossa", origin: "Málaga", style: "Rap y trap narrativo con acento andaluz, historias de barrio crudas y poéticas de Space Hammu.", defaultSpanglish: 5, adlibs: ["El Palo!", "Space Hammu", "Yeah", "Dela", "Ah"], beatTags: ["boom bap trap", "andalusian guitar loop", "warm vinyl", "storytelling 808", "raw delivery"] },
      { id: "natos_y_waor", name: "Natos y Waor", origin: "Madrid", style: "Barras bravas madrileñas, rap de asfalto sin censura, temática de cicatrices, excesos y supervivencia.", defaultSpanglish: 2, adlibs: ["Natos!", "Waor!", "Hijos de la ruina", "Yeah", "Madrid"], beatTags: ["dark street rap", "heavy drum kick", "menacing piano", "underground boom bap", "raw energy"] },
      { id: "recycled_j", name: "Recycled J", origin: "Madrid", style: "Flow técnico y literario, rimas multisilábicas elaboradas, mezcla de pop urbano y trap elegante.", defaultSpanglish: 10, adlibs: ["J", "Yeah", "Recycled", "Ah", "Madrid"], beatTags: ["boom bap trap", "lo-fi piano", "crisp hi-hat", "storytelling beat", "introspective vibe"] },
      { id: "hard_gz", name: "Hard GZ", origin: "Galicia/Madrid", style: "Flow oscuro y combativo, letras de supervivencia obrera y calle pura.", defaultSpanglish: 5, adlibs: ["Gz", "Prrr", "Ah", "Dinamita", "Real"], beatTags: ["dark drill", "heavy 808", "menacing synth", "madrid barrio vibe", "cold atmosphere"] },
      { id: "quevedo", name: "Quevedo", origin: "Canarias/Madrid", style: "Flow melódico con voz grave y pegadiza, estribillos masivos de pop trap y fiesta.", defaultSpanglish: 20, adlibs: ["Prrr", "Ah", "Yeah", "Qvevo", "Nene"], beatTags: ["pop trap", "catchy synth", "bouncy 808", "summer vibe", "danceable"] },
      { id: "beny_jr", name: "Beny Jr", origin: "Hospitalet/Marruecos", style: "Flow crudo con influencia magrebí, slang de barrio multinacional, voz rasposa y lealtad.", defaultSpanglish: 8, adlibs: ["Ah", "Prrr", "Beny", "LF", "Calle"], beatTags: ["magreb trap", "oriental synth", "hard 808", "barcelona vibe", "raw energy"] },
      { id: "agnus_tris", name: "Almighty Gz", origin: "Madrid", style: "Flow oscuro drill madrileño, pasamontañas, voz grave y territorio.", defaultSpanglish: 5, adlibs: ["Grrah", "Bow", "Gz", "Madrid", "Free"], beatTags: ["uk drill", "sliding 808", "dark piano", "madrid drill", "menacing vibe"] },
      { id: "kidd_keo", name: "Kidd Keo", origin: "Alicante/US", style: "Spanglish duro estilo US, trap americano en español, flow Rockport oscuro y flex internacional.", defaultSpanglish: 50, adlibs: ["Keo", "Prrr", "Rockport", "Ah", "Yeah"], beatTags: ["dark trap", "heavy 808", "distorted synth", "spanglish vibe", "street energy"] },
      { id: "morad", name: "Morad", origin: "Hospitalet/Madrid", style: "Flow M.D.L.R crudo y sincero, historias de exclusión, policía y barrio sin artificios.", defaultSpanglish: 15, adlibs: ["Am", "Sí", "M.D.L.R", "La Florida", "Oye"], beatTags: ["french drill", "afro trap beat", "fast synth", "street acoustic guitar", "raw rhythm"] },
    ],
  },
  {
    label: "🎤 Lyrical Legends",
    artists: [
      { id: "eminem", name: "Eminem", origin: "Detroit", style: "Flow técnico agresivo con multi-silábicas internas, voz nasal enérgica y métrica de alta velocidad.", defaultSpanglish: 95, adlibs: ["Yeah", "Oops", "Slim", "Shady", "Marshall"], beatTags: ["boom bap", "heavy drum", "aggressive synth", "lyrical beat", "minimal sample"] },
      { id: "j_cole", name: "J. Cole", origin: "Fayetteville", style: "Flow conversacional consciente, storytelling natural, letras introspectivas y sociales.", defaultSpanglish: 95, adlibs: ["Yeah", "Cole", "Real", "Truth", "Fayettenam"], beatTags: ["boom bap", "soul sample", "lo-fi piano", "conscious beat", "warm vinyl"] },
      { id: "kendrick", name: "Kendrick Lamar", origin: "Compton", style: "Flow versátil dinámico, cambios rítmicos constantes, voces de personaje y comentario social.", defaultSpanglish: 95, adlibs: ["Yeah", "Kung Fu Kenny", "Alright", "PTB", "Hiiiipower"], beatTags: ["west coast", "jazz influence", " funk bass", "dynamic beat", "conscious rap"] },
    ],
  },
  {
    label: "🇬🇧 UK Drill / London Scene",
    artists: [
      { id: "central_cee", name: "Central Cee", origin: "London", style: "Flow UK drill rápido con acento londinense, slang británico y rimas inteligentes.", defaultSpanglish: 90, adlibs: ["Grrt", "Bow", "Mandem", "Yeah", "Cench"], beatTags: ["uk drill", "sliding 808", "dark piano", "british accent", "fast flow"] },
      { id: "digga_d", name: "Digga D", origin: "West London", style: "Pionero del UK drill agresivo (CGM), juego de palabras visual, flow cortante y barras de calle.", defaultSpanglish: 90, adlibs: ["Woi!", "Pyrex", "Bow", "Digga", "Gang"], beatTags: ["heavy uk drill 808", "gliding bass", "haunting piano", "rapid hi-hats", "london street"] },
      { id: "headie_one", name: "Headie One", origin: "Tottenham", style: "El rey del UK drill de Tottenham. Flow arrastrado 'turn turn', acentos sincopados y barras de experiencia.", defaultSpanglish: 90, adlibs: ["Turn!", "Told me turn", "One", "Shh", "Yeah"], beatTags: ["minimalist uk drill", "dark ambient pad", "sliding sub-bass", "drill swing", "tottenham vibe"] },
    ],
  },
  {
    label: "🗽 NY & Chicago Drill",
    artists: [
      { id: "pop_smoke", name: "Pop Smoke (RIP)", origin: "Brooklyn", style: "Voz grave y rasposa inconfundible, Brooklyn drill amenazante y pausas dramáticas.", defaultSpanglish: 95, adlibs: ["Woo!", "Grrt", "Bow!", "Woo Back", "Smoke"], beatTags: ["brooklyn drill", "sliding 808", "dark piano", "raspy vocal", "menacing drill"] },
      { id: "fivio_foreign", name: "Fivio Foreign", origin: "Brooklyn", style: "Flow melodic drill enérgico, acentos off-beat y ad-libs de fondo memorables (Baow!).", defaultSpanglish: 95, adlibs: ["Gang!", "Bow!", "Fivio", "Yeah", "Slide"], beatTags: ["ny drill", "melodic drill", "808 slide", "dark synth", "brooklyn bounce"] },
      { id: "chief_keef", name: "Chief Keef", origin: "Chicago", style: "Flow perezoso arrastrado detrás del beat, pionero indiscutible del drill de Chicago.", defaultSpanglish: 95, adlibs: ["Bang!", "Sosa", "Yeah", "Glo Gang", "Aye"], beatTags: ["chicago drill", "dark beat", "808 slide", "lazy flow", "young sosa"] },
      { id: "lil_durk", name: "Lil Durk", origin: "Chicago", style: "Flow melódico con autotune emotivo, dolor de calle, lealtad y tributos sentidos.", defaultSpanglish: 95, adlibs: ["Yeah", "Durk", "O Block", "No DJ", "Von"], beatTags: ["melodic drill", "auto-tune", "emotional 808", "chicago street", "dark piano"] },
      { id: "polo_g", name: "Polo G", origin: "Chicago", style: "Flow melódico introspectivo sobre trauma, supervivencia y superación personal.", defaultSpanglish: 95, adlibs: ["Yeah", "Polo", "No Cap", "Real", "Gang"], beatTags: ["melodic trap", "emotional piano", "smooth 808", "introspective", "chicago vibe"] },
    ],
  },
  {
    label: "🌴 Florida / SoundCloud & Emo",
    artists: [
      { id: "kodak_black", name: "Kodak Black", origin: "Pompano Beach", style: "Flow nasal arrastrado con acento floridiano, voz única y street crudo.", defaultSpanglish: 95, adlibs: ["Yeah", "Kodak", "Project Baby", "Sniper Gang", "Ah"], beatTags: ["florida trap", "nasal vocal", "dark 808", "street piano", "raw delivery"] },
      { id: "xxxtentacion", name: "XXXTentacion (RIP)", origin: "Plantation", style: "De susurros melancólicos a gritos punk desgarradores. Emocional, crudo y vulnerable.", defaultSpanglish: 95, adlibs: ["Yeah", "X", "Revenge", "Grrah", "Ah"], beatTags: ["emo trap", "distorted guitar", "lo-fi 808", "emotional", "chaotic energy"] },
      { id: "juice_wrld", name: "Juice WRLD (RIP)", origin: "Chicago", style: "Melodías cantadas conmovedoras, desamor, dolor y adicción. Improvisación melódica pura.", defaultSpanglish: 95, adlibs: ["Yeah", "Uh", "Oh", "Juice", "999"], beatTags: ["emo rap", "melodic trap", "guitar loop", "emotional 808", "auto-tune light"] },
      { id: "lil_pump", name: "Lil Pump", origin: "Miami", style: "Flow staccato gritado, repetitivo, festivo y con energía de moshpit.", defaultSpanglish: 95, adlibs: ["Ooh!", "Esskeetit!", "Pump", "Yeah", "Brrr"], beatTags: ["rage trap", "distorted 808", "hype beat", "chaotic", "miami bass"] },
    ],
  },
  {
    label: "🎸 South / West / Detroit",
    artists: [
      { id: "key_glock", name: "Key Glock", origin: "Memphis", style: "Flow staccato de Memphis, sílabas duras, acento sureño agresivo y sin prisa.", defaultSpanglish: 95, adlibs: ["Yeah", "Glock", "Paper Route", "Memphis", "Brrr"], beatTags: ["memphis trap", "dark 808", "aggressive synth", "southern drawl", "street piano"] },
      { id: "young_dolph", name: "Young Dolph (RIP)", origin: "Memphis", style: "Flow grave pausado, voz profunda y amenazante, flex independiente de Memphis.", defaultSpanglish: 95, adlibs: ["Yeah", "Dolph", "PRE", "Memphis", "Boss"], beatTags: ["memphis trap", "heavy 808", "dark piano", "southern flow", "street flex"] },
      { id: "babyface_ray", name: "Babyface Ray", origin: "Detroit", style: "Flow conversacional relajado de Detroit, historias de hustle y scam sin esfuerzo.", defaultSpanglish: 95, adlibs: ["Yeah", "Ray", "Detroit", "Wavy", "Talk"], beatTags: ["detroit rap", "boom bap trap", "raw beat", "conversational", "midwest street"] },
      { id: "roddy_ricch", name: "Roddy Ricch", origin: "Compton", style: "Flow melódico con bounce de la costa oeste, rimas pegadizas con calle.", defaultSpanglish: 95, adlibs: ["Yeah", "Eh", "Roddy", "Ooh", "Compton"], beatTags: ["west coast melodic", "bounce 808", "catchy synth", "smooth vocal", "cali vibe"] },
      { id: "blueface", name: "Blueface", origin: "Los Angeles", style: "Flow off-beat intencional y rítmico, timing impredecible de West Coast.", defaultSpanglish: 95, adlibs: ["Yeah", "Bleed", "Respect", "Crip", "West"], beatTags: ["west coast bounce", "off-beat flow", "bouncy 808", "california", "hyphy"] },
    ],
  },
  {
    label: "🇫🇷 Trap Français",
    artists: [
      { id: "pnl", name: "PNL", origin: "Paris", style: "Cloud rap melancólico y atmosférico, autotune pesado, soledad y éxito amargo.", defaultSpanglish: 2, adlibs: ["Ah", "Ouais", "PNL", "Dans", "Sombre"], beatTags: ["cloud rap", "atmospheric pad", "heavy auto-tune", "melancholic synth", "reverb-drenched"] },
      { id: "booba", name: "Booba", origin: "Paris", style: "Flow técnico francés, ego imponente, punchlines cortantes y autoridad callejera.", defaultSpanglish: 3, adlibs: ["Bakel", "Ouais", "92i", "Gros", "Oklm"], beatTags: ["hard french rap", "heavy 808", "orchestral horns", "dark synth", "paris street"] },
      { id: "ninho", name: "Ninho", origin: "Paris", style: "Flow melódico versátil, flex sutil, letras sobre éxito y superación en el barrio.", defaultSpanglish: 2, adlibs: ["Binks", "Ouais", "Jefe", "Hé", "MILS"], beatTags: ["french trap", "melodic piano", "punchy 808", "smooth vocals", "binks vibe"] },
    ],
  },
];

export interface Mood {
  id: string;
  label: string;
  description: string;
}

export const MOODS: Mood[] = [
  { id: "agresivo", label: "🔥 Agresivo / Disstrack", description: "Tono de confrontación directa, amenazas, ego desbordado. Punchlines cortantes. Energía de pelea." },
  { id: "melancolico", label: "💔 Melancólico / Pain", description: "Dolor emocional, traición, soledad. Tono introspectivo y triste. Metáforas de vacío interior." },
  { id: "flex", label: "💰 Flex / Hustle", description: "Presumir dinero, joyas, coches, éxito. Energía de victoria. Ego positivo y ostentoso." },
  { id: "fiesta", label: "🎉 Fiesta / Club", description: "Energía de discoteca, mujeres, alcohol, bailar. Tono festivo y rítmico. Letras ligeras y pegadizas." },
  { id: "introspectivo", label: "🧠 Introspectivo / Reflexivo", description: "Pensamientos profundos, arrepentimiento, filosofía de vida. Tono contemplativo y maduro." },
  { id: "oscuro", label: "🌑 Oscuro / Demonic", description: "Vibras siniestras, paranoia, violencia implícita. Tono amenazante y opresivo. Imaginería gótica." },
  { id: "romantico", label: "💘 Romántico / R&B Trap", description: "Amor, desamor, relaciones tóxicas. Tono melódico y emocional. Confesiones del corazón." },
  { id: "calle", label: "🔪 Calle / Real", description: "Vida del barrio, supervivencia, lealtad. Tono crudo y testimonial. Realismo sin filtros." },
  { id: "menacing", label: "😈 Menacing / Siniestro", description: "Tono amenazante, oscuro, intimidante. Presencia siniestra que domina el beat." },
  { id: "dreamy", label: "💭 Dreamy / Soñador", description: "Etereo, flotante, psicodélico sutil. Tono onírico que viaja por la mente." },
  { id: "nostalgic", label: "📼 Nostalgic / Nostálgico", description: "Recuerdos, ayer, añoranza. Tono que mira hacia atrás con mezcla de dulzor y tristeza." },
  { id: "confident", label: "💪 Confident / Seguro", description: "Ego controlado, seguridad absoluta. No necesita gritar, su presencia basta. Tono dominante." },
];

export interface Topic {
  id: string;
  label: string;
}

export const TOPICS: Topic[] = [
  { id: "t_dinero", label: "Dinero & Hustle" },
  { id: "t_traicion", label: "Traición" },
  { id: "t_mujeres", label: "Mujeres" },
  { id: "t_calle", label: "Vida de Calle" },
  { id: "t_drogas", label: "Drogas & Lean" },
  { id: "t_éxito", label: "Éxito & Fama" },
  { id: "t_enemigos", label: "Enemigos & Beef" },
  { id: "t_joyas", label: "Joyería & Flex" },
  { id: "t_noche", label: "Noche & Discoteca" },
  { id: "t_muerte", label: "Muerte & Violencia" },
  { id: "t_amor", label: "Amor Tóxico" },
  { id: "t_lean", label: "Codeína & Adicción" },
  { id: "t_coches", label: "Coches & Velocidad" },
  { id: "t_realeza", label: "Realeza del Trap" },
  { id: "t_infancia", label: "Infancia Perdida" },
  { id: "t_venganza", label: "Venganza" },
  { id: "t_depression", label: "Depresión & Ansiedad" },
  { id: "t_lealtad", label: "Lealtad & Crew" },
  { id: "t_fama", label: "Fama & Envidia" },
  { id: "t_exceso", label: "Exceso & Lujo" },
  { id: "t_legal", label: "Problemas Legales" },
  { id: "t_revenge", label: "Sangre & Deuda" },
  { id: "t_chains", label: "Joyería & Hielo" },
  { id: "t_whips", label: "Coches & Rides" },
  { id: "t_mansions", label: "Mansiones & Props" },
  { id: "t_designer", label: "Ropa de Diseño" },
  { id: "t_stripper", label: "Strippers & Club" },
  { id: "t_violence", label: "Violencia Explícita" },
  { id: "t_opp", label: "Opps & Beef" },
  { id: "t_glock", label: "Armas & Fuego" },
  { id: "t_snitch", label: "Soplonas & Traición" },
  { id: "t_territory", label: "Territorio & Bloque" },
  { id: "t_toxic", label: "Amor Tóxico" },
  { id: "t_ex", label: "Ex Novia" },
  { id: "t_heartbreak", label: "Corazón Roto" },
  { id: "t_groupies", label: "Groupies & Fans" },
  { id: "t_pills", label: "Pastillas & Xanax" },
  { id: "t_smoke", label: "Hierba & Humo" },
  { id: "t_coke", label: "Coca & Polvo" },
  { id: "t_drunk", label: "Borracho & Fiestas" },
  { id: "t_feds", label: "Policía & Federales" },
  { id: "t_jail", label: "Cárcel & Libertad" },
  { id: "t_paranoia", label: "Paranoia & Ansiedad" },
  { id: "t_snake", label: "Serpientes & Falsos" },
  { id: "t_court", label: "Corte & Legal" },
  { id: "t_anxiety", label: "Ansiedad & Pánico" },
  { id: "t_therapy", label: "Terapia & Trauma" },
  { id: "t_reality", label: "Realidad & Calle" },
  { id: "t_legacy", label: "Legado & Historia" },
  { id: "t_comeback", label: "Regreso & Venganza" },
  { id: "t_signed", label: "Contratos & Discos" },
  { id: "t_independent", label: "Independiente & DIY" },
  { id: "t_haters", label: "Haters & Envidia" },
  { id: "t_basketball", label: "Baloncesto & Deporte" },
  { id: "t_gambling", label: "Apuestas & Casino" },
  { id: "t_stripclub", label: "Strip Club" },
  { id: "t_phones", label: "Teléfonos & Connect" },
  { id: "t_safehouse", label: "Casa de Seguridad" },
];

export interface BpmVibe {
  id: string;
  label: string;
  range: string;
  description: string;
  density: string;
}

export const BPM_VIBES: BpmVibe[] = [
  { id: "bpm_lofi", label: "Lo-Fi / Slow Loop", range: "70-85", description: "Boom Bap / Lo-fi. Flow lento, palabras alargadas, deja que el beat respire.", density: "Baja" },
  { id: "bpm_boombap", label: "Boom Bap Classic", range: "85-95", description: "East Coast clásico. Flow rítmico estable, rimas técnicas.", density: "Media-Baja" },
  { id: "bpm_trap_lento", label: "Trap Lento / R&B", range: "90-110", description: "R&B Trap melódico. Emoción sobre velocidad.", density: "Media" },
  { id: "bpm_reggaeton", label: "Reggaeton / Latin Trap", range: "90-110", description: "Dembow latino. Flow bailable con sabor caribeño.", density: "Media" },
  { id: "bpm_trap_groovy", label: "Trap Groovy / Plugg", range: "110-130", description: "Plugg / Groovy. Flow fluido y pegadizo.", density: "Media-Alta" },
  { id: "bpm_trap_standard", label: "Atlanta Standard", range: "130-145", description: "Trap clásico de Atlanta. Equilibrio entre ego y flow.", density: "Alta" },
  { id: "bpm_trap_fast", label: "Fast Trap / Drill", range: "145-160", description: "Drill / Fast Trap. Frases cortas, densas y agresivas.", density: "Muy Alta" },
  { id: "bpm_trap_rage", label: "Rage / Moshpit", range: "160-180", description: "Rage. Flow caótico, gritos, energía de moshpit.", density: "Extrema" },
  { id: "bpm_jersey", label: "Jersey Club", range: "115-130", description: "Jersey Club bouncy. Ritmo saltarín de club con chops vocales.", density: "Alta" },
  { id: "bpm_phonk", label: "Brazilian Phonk", range: "130-145", description: "Phonk brasileño distorsionado para drift. Cowbell agresivo.", density: "Alta" },
  { id: "bpm_rkt", label: "RKT / Turreo", range: "100-120", description: "Cumbia trap argentina. Energía de bailanta, ritmo frenético.", density: "Media-Alta" },
  { id: "bpm_afro", label: "Afro Trap", range: "95-110", description: "Afrobeats influence. Ritmos africanos con trap. Flow bailable y melódico.", density: "Media" },
];

export interface SongStructure {
  id: string;
  label: string;
  sections: { name: string; type: "verse" | "chorus" | "intro" | "outro" | "bridge" | "hook" }[];
}

export const STRUCTURES: SongStructure[] = [
  { id: "std_basic", label: "Estándar (V1-C-V2-C-B-C)", sections: [
    { name: "Intro", type: "intro" },
    { name: "Verse 1", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 2", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Bridge", type: "bridge" },
    { name: "Chorus", type: "chorus" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_short", label: "Corto (Intro-C-V-C-Outro)", sections: [
    { name: "Intro", type: "intro" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 1", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_feature", label: "Con Feature (V1-C-V2(Feat)-C)", sections: [
    { name: "Intro", type: "intro" },
    { name: "Verse 1", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 2 (Feature)", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_rage", label: "Rage (Intro-V1-V2-C-V3-C-Outro)", sections: [
    { name: "Intro", type: "intro" },
    { name: "Verse 1", type: "verse" },
    { name: "Verse 2", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 3", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_double_feature", label: "Doble Feature (V1-C-V2(F1)-C-V3(F2)-C)", sections: [
    { name: "Intro", type: "intro" },
    { name: "Verse 1", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 2 (Feature 1)", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 3 (Feature 2)", type: "verse" },
    { name: "Chorus", type: "chorus" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_epic", label: "Épico (Intro-V1-PreC-C-V2-PreC-C-Bridge-C-Outro)", sections: [
    { name: "Intro", type: "intro" },
    { name: "Verse 1", type: "verse" },
    { name: "Pre-Chorus", type: "bridge" },
    { name: "Chorus", type: "chorus" },
    { name: "Verse 2", type: "verse" },
    { name: "Pre-Chorus", type: "bridge" },
    { name: "Chorus", type: "chorus" },
    { name: "Bridge", type: "bridge" },
    { name: "Chorus", type: "chorus" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_pop_trap", label: "Pop Trap (Intro-C-V1-C-V2-C-Bridge-C-Outro)", sections: [
    { name: "Intro", type: "intro" }, { name: "Chorus", type: "chorus" }, { name: "Verse 1", type: "verse" },
    { name: "Chorus", type: "chorus" }, { name: "Verse 2", type: "verse" }, { name: "Chorus", type: "chorus" },
    { name: "Bridge", type: "bridge" }, { name: "Chorus", type: "chorus" }, { name: "Outro", type: "outro" },
  ]},
  { id: "std_anthem", label: "Anthem (Intro-V1-C-V2-C-Bridge-C-C-Outro)", sections: [
    { name: "Intro", type: "intro" }, { name: "Verse 1", type: "verse" }, { name: "Chorus", type: "chorus" },
    { name: "Verse 2", type: "verse" }, { name: "Chorus", type: "chorus" }, { name: "Bridge", type: "bridge" },
    { name: "Chorus", type: "chorus" }, { name: "Chorus", type: "chorus" }, { name: "Outro", type: "outro" },
  ]},
  { id: "std_pain_ballad", label: "Pain Ballad (Intro-V1-C-V2-C-Bridge-Outro)", sections: [
    { name: "Intro", type: "intro" }, { name: "Verse 1", type: "verse" }, { name: "Chorus", type: "chorus" },
    { name: "Verse 2", type: "verse" }, { name: "Chorus", type: "chorus" }, { name: "Bridge", type: "bridge" },
    { name: "Outro", type: "outro" },
  ]},
  { id: "std_cypher", label: "Cypher (Intro-V1-V2-V3-V4-Outro)", sections: [
    { name: "Intro", type: "intro" }, { name: "Verse 1", type: "verse" }, { name: "Verse 2", type: "verse" },
    { name: "Verse 3", type: "verse" }, { name: "Verse 4", type: "verse" }, { name: "Outro", type: "outro" },
  ]},
];

export interface Producer {
  id: string;
  name: string;
  tag: string;
  style: string;
}

export const PRODUCERS: Producer[] = [
  { id: "none", name: "Sin productor", tag: "", style: "" },
  { id: "metro_boomin", name: "Metro Boomin", tag: "If Metro don't trust you, I'm gon' shoot you", style: "808s pesados, hi-hats rápidos, melodías oscuras de piano/sintetizador. Patrón de trap clásico de Atlanta." },
  { id: "markoff", name: "Markoff", tag: "Markoff on the beat", style: "Productor español, beats de trap madrileño con influencia plugg y drill. 808s oscuros." },
  { id: "bizarrap", name: "Bizarrap", tag: "BZRP Music Sessions", style: "Productor argentino, beats minimalistas con crecimiento progresivo, énfasis en la voz del artista." },
  { id: "southside", name: "Southside", tag: "Southside on the track", style: "808 Mafia. 808s distorsionados agresivos, hi-hats muy rápidos, melodías oscuras." },
  { id: "wheezy", name: "Wheezy", tag: "Wheezy out of here", style: "Beats de trap slatt, 808s potentes, melodías simples pero pegadizas. Estilo Young Thug." },
  { id: "ovy_on_drums", name: "Ovy on the Drums", tag: "Ovy on the Drums", style: "Productor colombiano, reggaeton/trap latino con dembow, melodías tropicales." },
  { id: "lex_luger", name: "Lex Luger", tag: "Lex Luger!", style: "Pionero del trap agresivo, brass pesados, 808s rápidos y crudos. Estilo Waka Flocka." },
  { id: "pierre_bourne", name: "Pierre Bourne", tag: "Pierre!", style: "Beats melódicos y psicodélicos, sintetizadores brillosos, 808s suaves. Estilo Playboi Carti." },
  { id: "zaytovan", name: "Zaytoven", tag: "Zaytoven!", style: "Atlanta trap pionero, piano simple + 808, estilo Gucci Mane/Future." },
  { id: "tay_keith", name: "Tay Keith", tag: "Tay Keith, fuck these niggas up!", style: "Memphis trap agresivo, 808s pesados, estilo BlocBoy JB." },
  { id: "tm88", name: "TM88", tag: "808 Mafia", style: "808 Mafia, sintetizadores oscuros, 808s distorsionados." },
  { id: "dr_dre", name: "Dr. Dre", tag: "Dre", style: "West Coast G-Funk, sintetizadores lush, batería crujiente." },
  { id: "timbaland", name: "Timbaland", tag: "Timbo", style: "Beats innovadores, ritmos sincopados, influencia R&B." },
  { id: "pharrell", name: "Pharrell", tag: "P", style: "Neptunes, sintetizadores funk, ritmos minimalistas." },
  { id: "mike_dean", name: "Mike Dean", tag: "Mike Dean", style: "Sintetizadores psicodélicos, guitarra, mastering legend." },
  { id: "808_melo", name: "808 Melo", tag: "808 Melo", style: "UK drill, sliding 808, dark piano." },
  { id: "tainy", name: "Tainy", tag: "Tainy", style: "Reggaeton/trap latino, dembow moderno, Latin Grammy." },
  { id: "bnyx", name: "BNYX", tag: "BNYX!", style: "Rage beat, sintetizadores brillantes, 808 distorsionado." },
  { id: "f1lthy", name: "F1lthy", tag: "F1lthy", style: "Rage/vamp, sintetizadores caóticos, 808 pesado." },
  { id: "mustard", name: "Mustard", tag: "Mustard", style: "West Coast bounce, hyphy, ritmo bailable." },
  { id: "hit_boy", name: "Hit-Boy", tag: "Hit-Boy", style: "Versátil, boom bap moderno, producción limpia." },
  { id: "scott_storch", name: "Scott Storch", tag: "Storch", style: "Piano-driven, melodías elaboradas, hip-hop 2000s." },
  { id: "swizz_beatz", name: "Swizz Beatz", tag: "Swizzy", style: "Bangers energéticos, sintetizadores agresivos, brass." },
  { id: "just_blaze", name: "Just Blaze", tag: "Just Blaze", style: "Soul samples, batidoras pesadas, hip-hop clásico." },
  { id: "kanye_soul", name: "Kanye (Soul)", tag: "Ye", style: "Soul samples speed-up, drums pesados, chipmunk." },
  { id: "j_dilla", name: "J Dilla", tag: "Dilla", style: "Boom bap lo-fi, swing humano, samples jazz." },
  { id: "dj_premier", name: "DJ Premier", tag: "Primo", style: "Boom bap NYC, scratches, jazz samples." },
  { id: "alchemist", name: "Alchemist", tag: "Alc", style: "Lo-fi oscuro, samples raros, boom bap undergound." },
  { id: "whitearmor", name: "Whitearmor", tag: "Whitearmor", style: "Cloud rap sueco, sintetizadores etéreos, drain gang." },
  { id: "axl_beats", name: "AXL Beats", tag: "AXL", style: "UK drill, melodías oscuras, 808 deslizante." },
  { id: "cash_cobain", name: "Cash Cobain", tag: "Cash Cobain", style: "NY drill/sample drill, flip de R&B." },
  { id: "sonny_digital", name: "Sonny Digital", tag: "Sonny!", style: "Atlanta trap melódico, sintetizadores brillosos." },
  { id: "london_track", name: "London On Da Track", tag: "London on da track", style: "Atlanta trap con melodía, piano + 808." },
];

export interface NarrativeArc {
  id: string;
  label: string;
  description: string;
}

export const NARRATIVE_ARCS: NarrativeArc[] = [
  { id: "none", label: "Ninguno (lineal)", description: "" },
  { id: "arc_buildup", label: "Heroic Build-up", description: "Empieza frío y calmado con frases cortas. Aumenta progresivamente la arrogancia, verbosidad y agresividad, explotando en el último coro." },
  { id: "arc_madness", label: "Descenso a la Locura", description: "Empieza racional, pero introduce paranoia pesada progresivamente. El artista se vuelve más loco, las rimas más caóticas y los ad-libs más desquiciados hacia el final." },
  { id: "arc_regret", label: "Trauma Mask", description: "Empieza flexeando violento y egocéntrico. Tras el segundo coro, la máscara cae y el puente/verso final revelan vacío, dolor o arrepentimiento." },
  { id: "arc_story", label: "Storytelling en 3 actos", description: "Cuenta un evento cronológico. Verse 1: planteamiento del problema. Verse 2: nudo y decisión difícil. Verse 3: clímax, tiroteo, huida o resolución." },
];

// Helper: flatten artists
export function getAllArtists(): Artist[] {
  return ARTISTS_DATA.flatMap(g => g.artists);
}

export function getArtistById(id: string): Artist | undefined {
  return getAllArtists().find(a => a.id === id);
}

export function getProducerById(id: string): Producer | undefined {
  return PRODUCERS.find(p => p.id === id);
}

// ===== Rhyme Schemes =====
export interface RhymeScheme {
  id: string;
  label: string;
  pattern: string;
  description: string;
}

export const RHYME_SCHEMES: RhymeScheme[] = [
  { id: "rs_free", label: "Free (libre)", pattern: "—", description: "Sin esquema fijo. Rima donde sea natural, flow libre." },
  { id: "rs_aabb", label: "AABB", pattern: "AABB", description: "Pareados consecutivos. Dos líneas riman entre sí, las siguientes dos riman entre sí. Clásico y pegadizo." },
  { id: "rs_abab", label: "ABAB", pattern: "ABAB", description: "Rimas alternas. La 1ª rima con la 3ª, la 2ª con la 4ª. Más fluido y melódico." },
  { id: "rs_abba", label: "ABBA", pattern: "ABBA", description: "Rimas envolventes. La 1ª y 4ª riman, la 2ª y 3ª riman. Estructura cerrada." },
  { id: "rs_monorhyme", label: "AAAA (monorrima)", pattern: "AAAA", description: "Todas las líneas riman con la misma vocal. Estilo rage/carti, hipnótico." },
  { id: "rs_internal", label: "Rima interna", pattern: "Mixed", description: "Rimas dentro de la misma línea, no solo al final. Técnico y denso." },
  { id: "rs_triplets", label: "Triplet flow", pattern: "AAA BBB", description: "Grupos de tres líneas con la misma rima. Flow de Migos/trap staccato." },
];

export function getRhymeSchemeById(id: string): RhymeScheme | undefined {
  return RHYME_SCHEMES.find(r => r.id === id);
}

// ===== Beat Prompt Generator (Suno/Udio-style) =====
export interface BeatPrompt {
  styleTags: string;        // comma-separated tags for Suno/Udio
  description: string;      // textual description of the beat
  instruments: string[];    // key instruments
  energy: string;           // energy level descriptor
}

/**
 * Generates a Suno/Udio-style beat prompt from the selected artist + mood + BPM + producer.
 */
export function generateBeatPrompt(
  artistId: string,
  moodId: string,
  bpmVibeId: string,
  producerId: string,
): BeatPrompt {
  const artist = getArtistById(artistId);
  const mood = MOODS.find(m => m.id === moodId);
  const bpm = BPM_VIBES.find(b => b.id === bpmVibeId);
  const producer = producerId !== "none" ? getProducerById(producerId) : null;

  // Collect tags from artist + producer + bpm
  const tags: string[] = [];
  if (artist?.beatTags) tags.push(...artist.beatTags);
  if (producer?.style) tags.push(producer.style);
  if (bpm) {
    tags.push(`${bpm.range} BPM`);
    tags.push(bpm.density.toLowerCase() + " density");
  }

  // Mood-based energy
  const moodEnergyMap: Record<string, string> = {
    agresivo: "aggressive, hard-hitting, confrontational",
    melancolico: "melancholic, emotional, sad",
    flex: "confident, triumphant, luxurious",
    fiesta: "energetic, danceable, party",
    introspectivo: "introspective, contemplative, deep",
    oscuro: "dark, sinister, menacing",
    romantico: "romantic, smooth, sensual",
    calle: "raw, gritty, street",
  };
  const energy = moodEnergyMap[moodId] ?? "balanced";

  // Instruments based on BPM + mood
  const instruments: string[] = [];
  if (bpm) {
    if (bpm.id.includes("rage") || bpm.id.includes("fast")) {
      instruments.push("distorted 808", "aggressive hi-hat rolls", "screaming synth");
    } else if (bpm.id.includes("lofi") || bpm.id.includes("boombap")) {
      instruments.push("lo-fi piano", "vinyl crackle", "boom bap kick");
    } else if (bpm.id.includes("reggaeton")) {
      instruments.push("dembow rhythm", "latin percussion", "tropical synth");
    } else {
      instruments.push("808 bass", "trap hi-hats", "snare on beat 3");
    }
  }
  if (moodId === "oscuro" || moodId === "agresivo") instruments.push("dark piano loop", "menacing pad");
  if (moodId === "melancolico" || moodId === "introspectivo") instruments.push("emotional melody", "ambient pad");
  if (moodId === "flex") instruments.push("luxurious synth", "clean bass");

  const description = `${artist?.name ?? "Trap"} style beat at ${bpm?.range ?? "130-145"} BPM. ${mood?.description ?? ""} Producer: ${producer?.name ?? "auto"}. Energy: ${energy}. Key elements: ${instruments.join(", ")}.`;

  return {
    styleTags: tags.join(", "),
    description,
    instruments,
    energy,
  };
}

// ===== BEAT TYPES =====
export interface BeatType {
  id: string;
  label: string;
  description: string;
  sunoTags: string[];
}

export const BEAT_TYPES: BeatType[] = [
  { id: "bt_atlanta_standard", label: "Atlanta Standard Trap", description: "Trap clásico de Atlanta, 808s pesados, hi-hats rápidos", sunoTags: ["trap", "808", "hi-hat rolls", "dark piano", "atlanta"] },
  { id: "bt_dark_trap", label: "Dark Trap", description: "Trap oscuro y siniestro, melodías menores", sunoTags: ["dark trap", "distorted 808", "minor key", "menacing", "horror"] },
  { id: "bt_melodic_trap", label: "Melodic Trap", description: "Trap melódico con piano y sintetizadores", sunoTags: ["melodic trap", "piano melody", "auto-tune", "emotional", "smooth 808"] },
  { id: "bt_rage", label: "Rage / Hyperpop", description: "Rage beat energético con sintetizadores distorsionados", sunoTags: ["rage", "distorted synth", "hyperpop", "moshpit", "aggressive 808"] },
  { id: "bt_drill_uk", label: "UK Drill", description: "Drill británico con sliding 808s y piano oscuro", sunoTags: ["uk drill", "sliding 808", "dark piano", "brooklyn drill", "hi-hat rolls"] },
  { id: "bt_drill_chicago", label: "Chicago Drill", description: "Drill de Chicago crudo y agresivo", sunoTags: ["chicago drill", "dark beat", "808 slide", "aggressive", "street"] },
  { id: "bt_plugg", label: "Plugg / Cloud Rap", description: "Plugg suave con sintetizadores etéreos", sunoTags: ["plugg", "cloud rap", "ethereal synth", "smooth 808 slide", "dreamy"] },
  { id: "bt_boom_bap", label: "Boom Bap", description: "Boom bap clásico de los 90, jazz samples", sunoTags: ["boom bap", "jazz sample", "vinyl crackle", "90s hip hop", "lo-fi"] },
  { id: "bt_lofi", label: "Lo-Fi Hip-Hop", description: "Lo-fi relajado con samples vintage", sunoTags: ["lo-fi", "chillhop", "vinyl crackle", "jazz chords", "relaxed"] },
  { id: "bt_reggaeton", label: "Reggaeton / Latin Trap", description: "Dembow latino con sabor caribeño", sunoTags: ["reggaeton", "dembow", "latin trap", "tropical", "perreo"] },
  { id: "bt_g_funk", label: "G-Funk", description: "West Coast G-Funk con sintetizadores whiny", sunoTags: ["g-funk", "west coast", "moog synth", "funk bass", "90s"] },
  { id: "bt_phonk", label: "Brazilian Phonk", description: "Phonk brasileño distorsionado para drift", sunoTags: ["phonk", "drift phonk", "distorted 808", "cowbell", "aggressive"] },
  { id: "bt_jersey", label: "Jersey Club", description: "Jersey Club bouncy con chops", sunoTags: ["jersey club", "bounce", "chopped vocal", "club beat", "energetic"] },
];

export function getBeatTypeById(id: string): BeatType | undefined {
  return BEAT_TYPES.find(b => b.id === id);
}

// ===== FEATURE SIMS =====
export interface FeatureSim {
  id: string;
  label: string;
  description: string;
}

export const FEATURE_SIMS: FeatureSim[] = [
  { id: "solo", label: "Solo — sin feature", description: "Solo el artista principal, sin invitados" },
  { id: "contrast", label: "Contraste", description: "El feature contrasta con el estilo del principal (voz grave vs aguda, agresivo vs melódico)" },
  { id: "hype_man", label: "Hype Man", description: "El feature solo hace ad-libs y refuerzos, no rapea versos completos" },
  { id: "lyrical_assassin", label: "Lyrical Assassin", description: "El feature trae versos técnicos densos, showcase de rimas" },
  { id: "female_vocals", label: "Female Vocals", description: "Voz femenina para melodía/contraste en el hook" },
];

export function getFeatureSimById(id: string): FeatureSim | undefined {
  return FEATURE_SIMS.find(f => f.id === id);
}

// ===== PALETTE TAGS =====
export interface PaletteTag {
  name: string;
  desc: string;
  group: string;
}

export const PALETTE_TAGS: PaletteTag[] = [
  { name: "trap", desc: "Beat de trap estándar", group: "Trap" },
  { name: "dark trap", desc: "Trap oscuro siniestro", group: "Trap" },
  { name: "melodic trap", desc: "Trap melódico con piano", group: "Trap" },
  { name: "rage", desc: "Rage beat energético", group: "Trap" },
  { name: "drill", desc: "Drill beat con sliding 808", group: "Drill" },
  { name: "uk drill", desc: "Drill británico", group: "Drill" },
  { name: "boom bap", desc: "Boom bap clásico 90s", group: "Rap" },
  { name: "lo-fi", desc: "Lo-fi relajado", group: "Rap" },
  { name: "reggaeton", desc: "Dembow latino", group: "Global" },
  { name: "phonk", desc: "Phonk distorsionado", group: "Global" },
  { name: "heavy 808", desc: "808 pesado", group: "Instrumentos" },
  { name: "dark piano", desc: "Piano oscuro", group: "Instrumentos" },
  { name: "bell melody", desc: "Melodía de campana", group: "Instrumentos" },
  { name: "guitar loop", desc: "Loop de guitarra", group: "Instrumentos" },
  { name: "auto-tune", desc: "Auto-tune pesado", group: "FX" },
  { name: "reverb heavy", desc: "Reverb intenso", group: "FX" },
  { name: "distortion", desc: "Distorsión", group: "FX" },
  { name: "dark atmosphere", desc: "Atmósfera oscura", group: "Vibes" },
  { name: "aggressive energy", desc: "Energía agresiva", group: "Vibes" },
  { name: "melancholic mood", desc: "Tono melancólico", group: "Vibes" },
];

export const PALETTE_TAG_GROUPS = ["Trap", "Drill", "Rap", "Global", "Instrumentos", "FX", "Vibes"];

// ===== PRODUCER TAG ARCHETYPES =====
export interface ProducerTagArchetype {
  id: string;
  name: string;
  icon: string;
  vibe: string;
  referenceTag: string;
  description: string;
  color: string;
}

export const PRODUCER_TAG_ARCHETYPES: ProducerTagArchetype[] = [
  { id: "metro", name: "Metro Boomin", icon: "🗡️", vibe: "Oscuro & Amenazante", referenceTag: "If Metro don't trust you, I'm gon' shoot you", description: "Voz susurrada o sample amenazante, aura cinematográfica oscura", color: "#8b5cf6" },
  { id: "tay_keith", name: "Tay Keith", icon: "💣", vibe: "Hype & Agresivo", referenceTag: "Tay Keith, fuck these niggas up!", description: "Grito hype con energía cruda de Memphis / Drill", color: "#ef4444" },
  { id: "pierre", name: "Pi'erre Bourne", icon: "🍄", vibe: "Trippy & Chill", referenceTag: "Yo Pierre, you wanna come out here?", description: "Sample de sitcom/comedia con reverb psicodélico y melodía", color: "#ec4899" },
  { id: "southside", name: "Southside / 808 Mafia", icon: "🩸", vibe: "Seco & Directo", referenceTag: "Southside on the track / 808 Mafia", description: "Cadencia seca y amenazante con sirena de 808 Mafia", color: "#f97316" },
  { id: "f1lthy", name: "F1lthy / BNYX", icon: "⚡", vibe: "Rage & Caos", referenceTag: "Wake up F1lthy! / BNYX!", description: "Distorsión overblown, estética vamp/rage caótica", color: "#06b6d4" },
  { id: "wheezy", name: "Wheezy", icon: "🚀", vibe: "Wave & Slatt", referenceTag: "Wheezy outta here", description: "Flow espacial, casual y elegante de Atlanta", color: "#3b82f6" },
  { id: "murda", name: "Murda Beatz", icon: "💎", vibe: "Punchy & Clean", referenceTag: "Murda on the beat, so it's not nice", description: "Punchline memorable y sonido nítido de club", color: "#eab308" },
  { id: "bizarrap", name: "Bizarrap / Latin", icon: "🔌", vibe: "Music Sessions", referenceTag: "BZRP Music Sessions", description: "Sabor latino urbano moderno, directo e icónico", color: "#10b981" },
  { id: "smart", name: "Smart Contextual", icon: "🧠", vibe: "100% Letra", referenceTag: "Tag creado desde tus punchlines", description: "Extrae el concepto y rima central de tu canción", color: "#00ff41" },
];

export function getProducerTagArchetypeById(id: string): ProducerTagArchetype | undefined {
  return PRODUCER_TAG_ARCHETYPES.find(a => a.id === id);
}
