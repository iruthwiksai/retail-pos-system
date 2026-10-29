// Product Translation Engine for Grocery & Retail POS
// Supported Modes:
// 1. 'en'    - English (Original)
// 2. 'te'    - Telugu (Using Telugu letters: కందిపప్పు, ఉప్పు, పంచదార...)
// 3. 'hi_en' - Hindi (Using English letters: Arhar Dal, Namak, Cheeni...)

export const EXACT_PRODUCT_TRANSLATIONS = {
  // Seeded Catalog Items
  'aashirvaad superior shudh chakki atta 5kg': {
    te: 'ఆశీర్వాద్ చక్కి గోధుమ పిండి 5kg',
    hi_en: 'Aashirvaad Chakki Gehun Ka Atta 5kg'
  },
  'amul butter pasteurised 500g': {
    te: 'అమూల్ వెన్న 500g',
    hi_en: 'Amul Makkhan 500g'
  },
  'tata salt vacuum evaporated 1kg': {
    te: 'టాటా ఉప్పు 1kg',
    hi_en: 'Tata Namak 1kg'
  },
  'maggi 2-minute masala instant noodles 4-pack (280g)': {
    te: 'మ్యాగీ మసాలా నూడుల్స్ (280g)',
    hi_en: 'Maggi Masala Instant Noodles (280g)'
  },
  'fortune sunlite refined sunflower oil 1l pouch': {
    te: 'ఫార్చ్యూన్ సన్‌ఫ్లవర్ నూనె 1L',
    hi_en: 'Fortune Sunflower Tel 1L'
  },
  'surf excel easy wash detergent powder 1kg': {
    te: 'సర్ఫ్ ఎక్సెల్ సర్ఫు పొడి 1kg',
    hi_en: 'Surf Excel Dhulai Powder 1kg'
  },
  'daawat rozana super basmati rice 1kg': {
    te: 'దావత్ రోజానా బాస్మతి బియ్యం 1kg',
    hi_en: 'Daawat Basmati Chawal 1kg'
  },
  'cadbury dairy milk silk chocolate 60g': {
    te: 'క్యాడ్‌బరీ డెయిరీ మిల్క్ సిల్క్ చాక్లెట్ 60g',
    hi_en: 'Cadbury Dairy Milk Silk Chocolate 60g'
  },
  'parle-g gold glucose biscuits 1kg family pack': {
    te: 'పార్లే-జి గోల్డ్ గ్లూకోజ్ బిస్కెట్లు 1kg',
    hi_en: 'Parle-G Glucose Biscuit 1kg Family Pack'
  },
  'dettol original germ protection liquid handwash refill 675ml': {
    te: 'డెట్టాల్ లిక్విడ్ హ్యాండ్‌వాష్ 675ml',
    hi_en: 'Dettol Liquid Handwash Refill 675ml'
  },
  'red label strong blend tea 500g': {
    te: 'రెడ్ లేబుల్ టీ పొడి 500g',
    hi_en: 'Red Label Chai Patti 500g'
  },
  'haldiram nagpur aloo bhujia 400g': {
    te: 'హల్దీరామ్ ఆలూ భుజియా 400g',
    hi_en: 'Haldiram Aloo Bhujia Namkeen 400g'
  },
  'fresh red onion (nashik quality)': {
    te: 'తాజా ఎర్ర ఉల్లిపాయలు (ఉల్లిగడ్డ)',
    hi_en: 'Taaza Laal Pyaaz (Onion)'
  },
  'fresh jyoti potato': {
    te: 'తాజా బంగాళాదుంపలు (ఆలూ)',
    hi_en: 'Taaza Aloo (Potato)'
  },
  'premium madhur crystal sugar': {
    te: 'మధుర్ క్రిస్టల్ పంచదార (చక్కెర)',
    hi_en: 'Madhur Crystal Cheeni / Shakkar'
  },
  'unpolished desi toor dal': {
    te: 'నాటు కందిపప్పు (కంది పప్పు)',
    hi_en: 'Unpolished Desi Arhar / Tuvar Dal'
  }
};

// Grocery Keyword Dictionary for general/custom grocery products
export const GROCERY_KEYWORD_MAP = [
  // Pulses & Dals
  { regex: /\b(toor|tuvar|arhar)\s*dal\b/i, te: 'కందిపప్పు', hi_en: 'Arhar / Tuvar Dal' },
  { regex: /\bmoong\s*dal\b/i, te: 'పెసరపప్పు', hi_en: 'Moong Dal' },
  { regex: /\burad\s*dal\b/i, te: 'మినపప్పు', hi_en: 'Urad Dal' },
  { regex: /\bchana\s*dal\b/i, te: 'శనగపప్పు', hi_en: 'Chana Dal' },
  { regex: /\bmasoor\s*dal\b/i, te: 'ఎర్ర కందిపప్పు', hi_en: 'Masoor Dal' },
  { regex: /\bdal\b/i, te: 'పప్పు', hi_en: 'Dal' },

  // Grains, Flours & Rice
  { regex: /\bbasmati\s*rice\b/i, te: 'బాస్మతి బియ్యం', hi_en: 'Basmati Chawal' },
  { regex: /\brice\b/i, te: 'బియ్యం', hi_en: 'Chawal' },
  { regex: /\batta|wheat\s*flour\b/i, te: 'గోధుమ పిండి', hi_en: 'Gehun Ka Atta' },
  { regex: /\bwheat\b/i, te: 'గోధుమలు', hi_en: 'Gehun' },
  { regex: /\bmaida\b/i, te: 'మైదా పిండి', hi_en: 'Maida' },
  { regex: /\bbesan|gram\s*flour\b/i, te: 'శనగపిండి', hi_en: 'Besan' },
  { regex: /\brava|sooji|suji\b/i, te: 'రవ్వ / సూజి', hi_en: 'Sooji / Rava' },
  { regex: /\bpoha|aval\b/i, te: 'అటుకులు', hi_en: 'Poha / Chivda' },

  // Sweeteners & Salts
  { regex: /\bsugar\b/i, te: 'పంచదార (చక్కెర)', hi_en: 'Cheeni / Shakkar' },
  { regex: /\bjaggery|gud\b/i, te: 'బెల్లం', hi_en: 'Gud / Jaggery' },
  { regex: /\bsalt\b/i, te: 'ఉప్పు', hi_en: 'Namak' },

  // Oils & Ghee
  { regex: /\bsunflower\s*oil\b/i, te: 'సన్‌ఫ్లవర్ నూనె', hi_en: 'Sunflower Tel' },
  { regex: /\bmustard\s*oil\b/i, te: 'ఆవాల నూనె', hi_en: 'Sarson Ka Tel' },
  { regex: /\bgroundnut\s*oil|peanut\s*oil\b/i, te: 'వేరుశెనగ నూనె', hi_en: 'Mungfali Ka Tel' },
  { regex: /\bcoconut\s*oil\b/i, te: 'కొబ్బరి నూనె', hi_en: 'Nariyal Ka Tel' },
  { regex: /\boil\b/i, te: 'వంట నూనె', hi_en: 'Tel' },
  { regex: /\bghee\b/i, te: 'నెయ్యి', hi_en: 'Desi Ghee' },
  { regex: /\bbutter\b/i, te: 'వెన్న', hi_en: 'Makkhan' },

  // Dairy
  { regex: /\bmilk\b/i, te: 'పాలు', hi_en: 'Doodh' },
  { regex: /\bcurd|yogurt|dahi\b/i, te: 'పెరుగు', hi_en: 'Dahi' },
  { regex: /\bpaneer\b/i, te: 'పన్నీర్', hi_en: 'Paneer' },
  { regex: /\bcheese\b/i, te: 'చీజ్', hi_en: 'Cheese' },

  // Beverages
  { regex: /\btea|chai\b/i, te: 'టీ పొడి', hi_en: 'Chai Patti' },
  { regex: /\bcoffee\b/i, te: 'కాఫీ పొడి', hi_en: 'Coffee Powder' },

  // Spices & Condiments
  { regex: /\bturmeric|haldi\b/i, te: 'పసుపు', hi_en: 'Haldi Powder' },
  { regex: /\bchilli\s*powder|mirchi\b/i, te: 'కారం పొడి', hi_en: 'Lal Mirch Powder' },
  { regex: /\bgreen\s*chilli\b/i, te: 'పచ్చి మిరపకాయలు', hi_en: 'Hari Mirch' },
  { regex: /\bcoriander\s*powder|dhaniya\b/i, te: 'ధనియాల పొడి', hi_en: 'Dhaniya Powder' },
  { regex: /\bcumin|jeera\b/i, te: 'జీలకర్ర', hi_en: 'Jeera' },
  { regex: /\bmustard\s*seeds|rai|aavalu\b/i, te: 'ఆవాలు', hi_en: 'Rai / Sarson' },
  { regex: /\bpepper|black\s*pepper\b/i, te: 'మిరియాలు', hi_en: 'Kali Mirch' },
  { regex: /\bgaram\s*masala\b/i, te: 'గరం మసాలా', hi_en: 'Garam Masala' },
  { regex: /\bclove|laung\b/i, te: 'లవంగాలు', hi_en: 'Laung' },
  { regex: /\bcardamom|elaichi\b/i, te: 'యాలకులు', hi_en: 'Elaichi' },
  { regex: /\bginger\b/i, te: 'అల్లం', hi_en: 'Adrak' },
  { regex: /\bgarlic\b/i, te: 'వెల్లుల్లి', hi_en: 'Lehsun' },

  // Vegetables
  { regex: /\bonion|onions\b/i, te: 'ఉల్లిపాయలు', hi_en: 'Pyaaz' },
  { regex: /\bpotato|potatoes\b/i, te: 'బంగాళాదుంపలు', hi_en: 'Aloo' },
  { regex: /\btomato|tomatoes\b/i, te: 'టమాటాలు', hi_en: 'Tamatar' },
  { regex: /\blemon|lemons\b/i, te: 'నిమ్మకాయలు', hi_en: 'Nimbu' },

  // Packaged Foods & Cleaning
  { regex: /\bnoodles\b/i, te: 'నూడుల్స్', hi_en: 'Noodles' },
  { regex: /\bbiscuits?|cookies?\b/i, te: 'బిస్కెట్లు', hi_en: 'Biscuit' },
  { regex: /\bchocolate|chocolates\b/i, te: 'చాక్లెట్', hi_en: 'Chocolate' },
  { regex: /\bdetergent|washing\s*powder|surf\b/i, te: 'సర్ఫు పొడి', hi_en: 'Dhulai Powder' },
  { regex: /\bsoap\b/i, te: 'సబ్బు', hi_en: 'Sabun' },
  { regex: /\bhandwash\b/i, te: 'హ్యాండ్‌వాష్', hi_en: 'Handwash' },
  { regex: /\btoothpaste\b/i, te: 'టూత్‌పేస్ట్', hi_en: 'Toothpaste' },
  { regex: /\bshampoo\b/i, te: 'షాంపూ', hi_en: 'Shampoo' }
];

/**
 * Translate a product item name into Telugu or Hindi (English letters)
 * @param {string} originalName 
 * @param {'en' | 'te' | 'hi_en'} lang 
 * @returns {string} Translated product name or original if in English
 */
export function getTranslatedProductName(originalName, lang = 'en') {
  if (!originalName || lang === 'en') return originalName;

  const cleanKey = originalName.trim().toLowerCase();

  // 1. Direct exact catalog match
  if (EXACT_PRODUCT_TRANSLATIONS[cleanKey]) {
    const translation = EXACT_PRODUCT_TRANSLATIONS[cleanKey][lang];
    if (translation) return translation;
  }

  // 2. Keyword-based matching for grocery products
  for (const item of GROCERY_KEYWORD_MAP) {
    if (item.regex.test(cleanKey)) {
      const translatedWord = item[lang];
      if (translatedWord) {
        // Keep weight/pack info if present (e.g. "1kg", "500g", "1L")
        const weightMatch = originalName.match(/(\d+\s*(?:kg|g|gm|l|ml|pcs|pack|pouch)\b)/i);
        const weightSuffix = weightMatch ? ` ${weightMatch[0]}` : '';
        return `${translatedWord}${weightSuffix}`;
      }
    }
  }

  // Fallback to original
  return originalName;
}
