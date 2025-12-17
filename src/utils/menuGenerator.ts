// Procedural menu generator - generates consistent menu items based on kedai name
// Uses provided food images to save SerpAPI credits

const FOOD_IMAGES = [
  'https://img.freepik.com/free-photo/kebab-platter-with-tikka-lula-chicken-vegetable-kebabs_140725-256.jpg?w=740',
  'https://img.freepik.com/free-photo/turkish-arabic-traditional-ramadan-mix-kebab-plate-kebab-adana-chicken-lamb-beef-lavash-bread-with-sauce-top-view_2829-6169.jpg',
  'https://img.freepik.com/free-photo/tortilla-wrap-with-falafel-fresh-salad-vegan-tacos-vegetarian-healthy-food_2829-6193.jpg',
  'https://img.freepik.com/premium-photo/homemade-chicken-biryani-blue-surface_158388-221.jpg',
  'https://img.freepik.com/free-photo/penne-pasta-tomato-sauce-with-chicken-tomatoes-wooden-table_2829-19744.jpg',
  'https://img.freepik.com/premium-photo/uzbek-family-table-from-different-dishes_127425-240.jpg',
  'https://img.freepik.com/free-photo/beyti-wrapped-kebab-topped-with-tomato-sauce-served-with-tomato-pepper-yoghurt_140725-545.jpg',
];

// Malaysian-themed dish names for procedural generation
const DISH_PREFIXES = [
  'Special', 'Classic', 'House', 'Chef\'s', 'Traditional', 'Signature', 
  'Premium', 'Golden', 'Royal', 'Authentic', 'Homestyle', 'Grandma\'s'
];

const DISH_NAMES = [
  'Nasi Lemak', 'Rendang', 'Satay', 'Laksa', 'Char Kway Teow', 
  'Roti Canai', 'Mee Goreng', 'Nasi Goreng', 'Ayam Penyet', 
  'Curry Mee', 'Asam Pedas', 'Sambal Udang', 'Kangkung Belacan',
  'Tom Yam', 'Nasi Kerabu', 'Murtabak', 'Teh Tarik Set',
  'Cendol', 'Ais Kacang', 'Rojak', 'Sup Kambing', 'Nasi Biryani',
  'Ayam Goreng', 'Ikan Bakar', 'Sotong Goreng', 'Daging Masak Hitam'
];

const DISH_DESCRIPTIONS = [
  'A beloved favorite prepared with authentic spices and fresh ingredients',
  'Slow-cooked to perfection with our secret family recipe',
  'Bursting with flavors from locally sourced ingredients',
  'A harmonious blend of sweet, sour, and savory notes',
  'Freshly prepared daily with premium quality ingredients',
  'Traditional recipe passed down through generations',
  'A crowd favorite that keeps customers coming back',
  'Made with love and the finest Malaysian spices',
  'Perfect balance of textures and rich, bold flavors',
  'Aromatic and satisfying, just like home cooking',
];

// Simple seeded random number generator for consistency
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Generate a hash from string for seeding
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: 'main' | 'appetizer' | 'dessert' | 'beverage';
  isPopular?: boolean;
  isSpicy?: boolean;
}

export function generateMenu(kedaiName: string, signature?: string): MenuItem[] {
  const seed = hashString(kedaiName);
  const random = seededRandom(seed);
  
  // Generate 4-7 menu items based on the kedai
  const itemCount = Math.floor(random() * 4) + 4;
  const menu: MenuItem[] = [];
  
  // Track used indices to avoid duplicates
  const usedDishIndices = new Set<number>();
  const usedImageIndices = new Set<number>();
  
  for (let i = 0; i < itemCount; i++) {
    // Get unique dish
    let dishIndex = Math.floor(random() * DISH_NAMES.length);
    while (usedDishIndices.has(dishIndex) && usedDishIndices.size < DISH_NAMES.length) {
      dishIndex = (dishIndex + 1) % DISH_NAMES.length;
    }
    usedDishIndices.add(dishIndex);
    
    // Get image (can repeat if needed)
    let imageIndex = Math.floor(random() * FOOD_IMAGES.length);
    if (usedImageIndices.size < FOOD_IMAGES.length) {
      while (usedImageIndices.has(imageIndex)) {
        imageIndex = (imageIndex + 1) % FOOD_IMAGES.length;
      }
    }
    usedImageIndices.add(imageIndex);
    
    const prefixIndex = Math.floor(random() * DISH_PREFIXES.length);
    const descIndex = Math.floor(random() * DISH_DESCRIPTIONS.length);
    
    // Generate price (RM 8 - RM 45)
    const basePrice = Math.floor(random() * 37) + 8;
    const priceEnding = random() > 0.5 ? '.90' : '.00';
    
    // Determine category based on dish name
    let category: MenuItem['category'] = 'main';
    const dishName = DISH_NAMES[dishIndex].toLowerCase();
    if (dishName.includes('cendol') || dishName.includes('ais') || dishName.includes('rojak')) {
      category = 'dessert';
    } else if (dishName.includes('teh') || dishName.includes('set')) {
      category = 'beverage';
    } else if (dishName.includes('satay') || dishName.includes('rojak') || dishName.includes('sup')) {
      category = 'appetizer';
    }
    
    // First item should use signature if available
    const dishNameToUse = i === 0 && signature 
      ? signature.split(',')[0].trim() 
      : DISH_NAMES[dishIndex];
    
    const shouldHavePrefix = random() > 0.4;
    
    menu.push({
      id: `${kedaiName}-menu-${i}`,
      name: shouldHavePrefix && i !== 0 
        ? `${DISH_PREFIXES[prefixIndex]} ${dishNameToUse}`
        : dishNameToUse,
      description: DISH_DESCRIPTIONS[descIndex],
      price: `RM ${basePrice}${priceEnding}`,
      image: FOOD_IMAGES[imageIndex],
      category,
      isPopular: random() > 0.7,
      isSpicy: random() > 0.6 && (
        dishName.includes('sambal') || 
        dishName.includes('pedas') || 
        dishName.includes('tom yam') ||
        dishName.includes('laksa') ||
        random() > 0.8
      ),
    });
  }
  
  return menu;
}

