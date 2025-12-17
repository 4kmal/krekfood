import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { 
  Star, MapPin, ArrowRight, Sparkles, Moon, Sun, Menu, X, 
  MessageSquare, Map, Bookmark, Zap, Users, Search,
  PenLine, ListTodo, Workflow, Check, Navigation,
  TrendingUp, Activity, Utensils
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

// Demo conversation data
const DEMO_CONVERSATION = [
  { type: 'user', text: 'Burger paling besar kat Bangi' },
  { type: 'assistant', text: 'Pergh! betul-betul lapar ni sat aku cari' },
  { 
    type: 'result', 
    name: 'Warung Kak Lin',
    rating: 4.5,
    area: 'Bangi Gateway',
    signature: 'Nasi Lemak Ayam Goreng',
    price: '$$',
    image: '🍗'
  },
  { 
    type: 'result', 
    name: 'White Town Coffee',
    rating: 4.3,
    area: 'Teras Jernang',
    signature: 'Nasi Lemak Special',
    price: '$',
    image: '☕️'
  },
  { 
    type: 'result', 
    name: 'Burger Bros',
    rating: 4.7,
    area: 'Seksyen 7',
    signature: 'Double Smash Burger',
    price: '$$',
    image: '🍔'
  },
  { 
    type: 'result', 
    name: 'Nasi Kandar Pelita',
    rating: 4.4,
    area: 'Seksyen 9',
    signature: 'Ayam Goreng Berempah',
    price: '$$',
    image: '🍛'
  },
];

const MENU_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
] as const;

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat Recommendations',
    description: 'Chat naturally in Bahasa or English. Our AI understands local food cravings.',
  },
  {
    icon: Map,
    title: 'Interactive Map',
    description: 'See all recommended spots on a beautiful map with real-time directions.',
  },
  {
    icon: Bookmark,
    title: 'Save Your Favorites',
    description: 'Bookmark the best kedai and build your personal food list.',
  },
  {
    icon: Zap,
    title: 'Real Google Reviews',
    description: 'Get genuine ratings and reviews from actual Google Maps data.',
  },
];

const steps = [
  {
    icon: PenLine,
    title: 'Sign up for free',
    description: 'Create your account in under 30 seconds. No credit card needed.',
  },
  {
    icon: ListTodo,
    title: 'Tell us what you crave',
    description: 'Chat with our AI about your mood, cuisine, budget, or location.',
  },
  {
    icon: Workflow,
    title: 'Discover & enjoy',
    description: 'Get personalized recommendations and start your makan adventure!',
  },
];

const faqs = [
  {
    question: "Is Kracked Food free to use?",
    answer: "Yes! We offer a free tier with essential features to help you discover great food spots. Premium features coming soon!",
  },
  {
    question: "How does the AI recommendation work?",
    answer: "Our AI understands natural language queries in Bahasa or English. It considers your preferences, location, budget, and real Google reviews to suggest the perfect makan spots.",
  },
  {
    question: "Does it work outside of KL?",
    answer: "Currently we focus on the Klang Valley area, but we're expanding to Penang, JB, and other Malaysian cities soon!",
  },
  {
    question: "Can I save my favorite spots?",
    answer: "Absolutely! You can bookmark any kedai and access your saved list anytime. Perfect for building your go-to food guide.",
  },
];

// Testimonials Data & Components
const restaurantStories = [
  {
    id: "warung-kak-lin",
    name: "Warung Kak Lin",
    logo: <span className="text-3xl">🍗</span>,
    title: "Warung Kak Lin saw a 300% increase in lunch hour footfall.",
    features: ["Footfall Tracking", "Customer Sentiment", "Menu Optimization"],
    quote: "The AI recommendations bring in exactly the right customers who are looking for authentic nasi lemak.",
    attribution: "Kak Lin, Owner of Warung Kak Lin",
    accentColor: "#16b364",
    stats: [
      { label: "Lunch Visits", value: "+300%", color: "text-green-600" },
      { label: "Rating", value: "4.8/5", color: "text-yellow-500" },
      { label: "Viral Reach", value: "High", color: "text-purple-600" }
    ]
  },
  {
    id: "white-town",
    name: "White Town Coffee",
    logo: <span className="text-3xl">☕️</span>,
    title: "White Town Coffee streamlined their customer feedback loop.",
    features: ["Review Aggregation", "Trend Analysis", "Competitor Benchmarking"],
    quote: "We used to ignore online reviews. Now we use them to improve our daily specials. It's a game changer.",
    attribution: "Mr. Lee, Manager at White Town Coffee",
    accentColor: "#3b82f6",
    stats: [
      { label: "Feedback", value: "+150%", color: "text-blue-600" },
      { label: "Response Time", value: "<1h", color: "text-green-600" },
      { label: "Retention", value: "92%", color: "text-purple-600" }
    ]
  },
  {
    id: "burger-bros",
    name: "Burger Bros",
    logo: <span className="text-3xl">🍔</span>,
    title: "Burger Bros became the #1 viral spot in Bangi within a month.",
    features: ["Viral Reach", "Location SEO", "Community Engagement"],
    quote: "Kracked Food put us on the map. The interactive map feature literally drives traffic to our door.",
    attribution: "Amir, Co-founder of Burger Bros",
    accentColor: "#f59e0b",
    stats: [
      { label: "Map Views", value: "50k+", color: "text-orange-600" },
      { label: "Conversions", value: "12%", color: "text-green-600" },
      { label: "Ranking", value: "#1", color: "text-yellow-500" }
    ]
  }
];

const FeatureBadge = ({ name }: { name: string }) => (
  <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
    <Check className="w-3.5 h-3.5 text-primary" />
    {name}
  </div>
);

const RestaurantGrowthCard = ({ story }: { story: typeof restaurantStories[0] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    transition={{ duration: 0.5 }}
    className="absolute w-full max-w-md bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl"
  >
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border">
            {story.logo}
          </div>
          <div>
            <h4 className="font-bold text-foreground">{story.name}</h4>
            <p className="text-xs text-muted-foreground">Performance Metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Growing</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {story.stats.map((stat, idx) => (
          <div key={idx} className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Weekly Traffic</span>
          <span className="font-semibold text-foreground">+28%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: "78%" }} />
        </div>
      </div>
    </div>
  </motion.div>
);

const TestimonialsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const currentStory = restaurantStories[currentIndex];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % restaurantStories.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  return (
    <div 
      className="container mx-auto px-6 py-12"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Restaurant Owners</h2>
        <p className="text-lg text-muted-foreground">
          See how local businesses are growing with Kracked Food's AI-powered platform.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        {/* Left Content */}
        <div className="space-y-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStory.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-muted-foreground">
                {currentStory.logo}
                <span className="font-semibold text-foreground">{currentStory.name}</span>
              </div>

              <h3 className="text-3xl md:text-4xl font-medium leading-tight">
                {currentStory.title}
              </h3>

              <div className="flex flex-wrap gap-2">
                {currentStory.features.map((feature, idx) => (
                  <FeatureBadge key={idx} name={feature} />
                ))}
              </div>

              <blockquote className="border-l-4 border-primary pl-6 py-2 my-6">
                <p className="text-lg text-foreground/80 italic mb-4">
                  "{currentStory.quote}"
                </p>
                <footer className="text-sm font-medium text-muted-foreground">
                  — {currentStory.attribution}
                </footer>
              </blockquote>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Dots */}
          <div className="flex gap-2">
            {restaurantStories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Content - Visual Card */}
        <div className="relative h-[400px] flex items-center justify-center lg:justify-end">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-full blur-3xl opacity-20" />
          <AnimatePresence mode="wait">
            <RestaurantGrowthCard key={currentStory.id} story={currentStory} />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Mock Food Menu Data
const MOCK_FOOD_MENU = [
  {
    image: "https://img.freepik.com/free-photo/kebab-platter-with-tikka-lula-chicken-vegetable-kebabs_140725-256.jpg?w=740&t=st=1668405935~exp=1668406535~hmac=b500c3f4055b977bf9320659b2c41cf5bc3d726caad32853cef3dd035d98793f",
    title: "Signature Kebab Platter",
    description: "Mixed platter with tikka, lula, chicken and vegetable kebabs.",
    price: "RM 45.00"
  },
  {
    image: "https://img.freepik.com/free-photo/turkish-arabic-traditional-ramadan-mix-kebab-plate-kebab-adana-chicken-lamb-beef-lavash-bread-with-sauce-top-view_2829-6169.jpg?size=626&ext=jpg&ga=GA1.2.535861394.1668405923&semt=sph",
    title: "Royal Mix Grill",
    description: "Authentic mix kebab with Adana, chicken, lamb, and beef.",
    price: "RM 55.00"
  },
  {
    image: "https://img.freepik.com/free-photo/tortilla-wrap-with-falafel-fresh-salad-vegan-tacos-vegetarian-healthy-food_2829-6193.jpg?size=626&ext=jpg&ga=GA1.2.535861394.1668405923&semt=sph",
    title: "Falafel Wrap",
    description: "Fresh tortilla wrap with crispy falafel and salad.",
    price: "RM 18.00"
  },
  {
    image: "https://img.freepik.com/premium-photo/homemade-chicken-biryani-blue-surface_158388-221.jpg?size=626&ext=jpg&ga=GA1.2.535861394.1668405923&semt=sph",
    title: "Chicken Biryani",
    description: "Aromatic basmati rice cooked with spiced chicken.",
    price: "RM 22.00"
  },
  {
    image: "https://img.freepik.com/free-photo/penne-pasta-tomato-sauce-with-chicken-tomatoes-wooden-table_2829-19744.jpg?size=626&ext=jpg&ga=GA1.2.535861394.1668405923&semt=sph",
    title: "Penne Arrabbiata",
    description: "Spicy tomato pasta with grilled chicken breast.",
    price: "RM 20.00"
  },
  {
    image: "https://img.freepik.com/premium-photo/uzbek-family-table-from-different-dishes_127425-240.jpg?size=626&ext=jpg&ga=GA1.2.535861394.1668405923&semt=sph",
    title: "Family Feast Set",
    description: "Perfect sharing platter for the whole family.",
    price: "RM 120.00"
  },
  {
    image: "https://img.freepik.com/free-photo/beyti-wrapped-kebab-topped-with-tomato-sauce-served-with-tomato-pepper-yoghurt_140725-545.jpg?size=626&ext=jpg&ga=GA1.2.535861394.1668405923&semt=sph",
    title: "Beyti Kebab",
    description: "Wrapped kebab topped with tomato sauce and yogurt.",
    price: "RM 35.00"
  }
];

// Mock Map Component
const MockMapPanel = ({ selectedKedai, isVisible }: { selectedKedai: typeof DEMO_CONVERSATION[2] | null, isVisible: boolean }) => {
  if (!selectedKedai || selectedKedai.type !== 'result') return null;
  
  return (
    <div 
      className={`
        bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-8 scale-95'}
      `}
      style={{ width: '320px' }}
    >
      {/* Map Header */}
      <div className="bg-primary/10 px-4 py-3 border-b border-border flex items-center gap-2">
        <Map className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Location Preview</span>
      </div>
      
      {/* Mock Map View - Expanded to fill available space */}
      <div className="relative flex-1 bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
        {/* Grid pattern for map effect */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground/30"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Roads - Scaled up */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 right-0 h-4 bg-foreground/10 transform -translate-y-1/2" />
          <div className="absolute top-0 bottom-0 left-1/3 w-3 bg-foreground/10" />
          <div className="absolute top-0 bottom-0 right-1/4 w-4 bg-foreground/10" />
          <div className="absolute top-1/4 left-0 right-1/2 h-3 bg-foreground/10" />
        </div>
        
        {/* Animated pulse marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            {/* Main marker */}
            <div className="relative z-10 w-10 h-10 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full border-4 border-white shadow-xl flex items-center justify-center">
              <span className="text-lg">{selectedKedai.image}</span>
            </div>
            {/* Marker shadow */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black/20 rounded-full blur-sm" />
          </div>
        </div>
        
        {/* Distance indicator */}
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 text-sm font-medium text-foreground shadow-lg border border-border/50">
          📍 1.2 km away
        </div>
      </div>
      
      {/* Kedai Info Panel */}
      <div className="p-4 space-y-4 bg-card border-t border-border">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 border border-border/50">
            {selectedKedai.image}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base text-foreground truncate">{selectedKedai.name}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              <div className="flex items-center gap-0.5 text-amber-500 font-medium">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{selectedKedai.rating}</span>
              </div>
              <span>·</span>
              <span className="font-medium text-foreground/80">{selectedKedai.price}</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 -mr-1">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span className="leading-tight">{selectedKedai.area}</span>
        </div>
        
        <Button className="w-full font-semibold shadow-lg shadow-primary/20 h-11" size="lg">
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions
        </Button>
      </div>
    </div>
  );
};

// Mock Menu Component
const MockMenuPanel = ({ selectedKedai, isVisible }: { selectedKedai: typeof DEMO_CONVERSATION[2] | null, isVisible: boolean }) => {
  if (!selectedKedai || selectedKedai.type !== 'result') return null;
  
  return (
    <div 
      className={`
        bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full
        transition-all duration-500 ease-out ml-4
        ${isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-8 scale-95'}
      `}
      style={{ width: '320px', transitionDelay: '100ms' }}
    >
      {/* Menu Header */}
      <div className="bg-primary/10 px-4 py-3 border-b border-border flex items-center gap-2">
        <Utensils className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Food Menu</span>
      </div>
      
      {/* Menu List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30 scrollbar-hide">
        {MOCK_FOOD_MENU.map((item, idx) => (
          <div key={idx} className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
            <div className="aspect-video w-full overflow-hidden relative">
              <img 
                src={item.image} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
              <div className="absolute bottom-2 left-2 right-2 text-white font-medium text-sm drop-shadow-md">
                {item.price}
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-sm text-foreground line-clamp-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* View Full Menu Button */}
      <div className="p-4 border-t border-border bg-card">
        <Button className="w-full" variant="outline" size="sm">
          View Full Menu
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Connecting Line SVG Component
const ConnectingLine = ({ isVisible }: { isVisible: boolean }) => (
  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex items-center justify-center w-full ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
    <svg 
      width="60" 
      height="12" 
      viewBox="0 0 60 12" 
      className="overflow-visible"
    >
      <line 
        x1="0" 
        y1="6" 
        x2="60" 
        y2="6" 
        stroke="hsl(var(--primary))" 
        strokeWidth="2" 
        strokeDasharray="4 4"
        strokeLinecap="round"
        className="animate-dash"
      />
      <circle cx="0" cy="6" r="3" fill="hsl(var(--primary))" />
      <circle cx="60" cy="6" r="3" fill="hsl(var(--primary))" />
    </svg>
  </div>
);

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showMapPanel, setShowMapPanel] = useState(false);
  const [showMenuPanel, setShowMenuPanel] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/chat');
    }
  }, [user, navigate]);

  // Animate demo conversation
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (currentStep >= DEMO_CONVERSATION.length) {
      // We are at the end (step 4). Wait 15s then reset.
      timer = setTimeout(() => {
        setCurrentStep(0);
      }, 15000);
    } else {
      // Go to next step after 1.5s
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1500);
    }

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Auto-select first card after both result cards appear
  useEffect(() => {
    if (currentStep >= DEMO_CONVERSATION.length) {
      // Wait a moment then "click" the first card
      const clickTimer = setTimeout(() => {
        setSelectedCardIndex(0);
        // Show map panel after card click animation
        setTimeout(() => {
          setShowMapPanel(true);
          // Show menu panel after map panel appears
          setTimeout(() => setShowMenuPanel(true), 800);
        }, 300);
      }, 800);
      return () => clearTimeout(clickTimer);
    } else {
      setSelectedCardIndex(null);
      setShowMapPanel(false);
      setShowMenuPanel(false);
    }
  }, [currentStep]);

  // Typing animation for user message
  useEffect(() => {
    if (currentStep === 0) {
      setTypingText('');
      return;
    }
    
    const userMsg = DEMO_CONVERSATION[0];
    
    if (currentStep === 1) {
      if (typingText.length < userMsg.text.length) {
        const timer = setTimeout(() => {
          setTypingText(userMsg.text.slice(0, typingText.length + 1));
        }, 50);
        return () => clearTimeout(timer);
      } else if (typingText.length === 0) {
        setTypingText(userMsg.text.slice(0, 1));
      }
    } else if (currentStep > 1 && typingText.length < userMsg.text.length) {
      setTypingText(userMsg.text);
    }
  }, [currentStep, typingText]);

  // Cursor blink
  useEffect(() => {
    const timer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: '"Onest", sans-serif' }}>
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border py-3.5 md:py-4">
        <div className="container relative px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <span className="text-2xl shrink-0">👨🏻‍💻</span>
              <span className="text-2xl neon-text whitespace-nowrap">K<span>r</span>acked Foo<span>d</span></span>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-foreground hover:bg-muted"
              >
                {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                className="size-9 flex items-center justify-center"
                onClick={toggleMenu}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-row gap-5 w-full justify-end items-center">
            <div className="flex flex-row gap-1">
              {MENU_ITEMS.map(({ label, href }) => (
                <Button 
                  key={label} 
                  variant="ghost" 
                  onClick={() => scrollToSection(href)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground hover:bg-muted"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button onClick={() => navigate('/auth')} className="frutiger-aero-badge border-0 px-6">Get started</Button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden flex flex-col gap-5 w-full justify-end pb-2.5">
              <div className="flex flex-col gap-1">
                {MENU_ITEMS.map(({ label, href }) => (
                  <Button 
                    key={label} 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => scrollToSection(href)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Button className="w-full frutiger-aero-badge border-0" onClick={() => navigate('/auth')}>Get started</Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-muted pattern-1 py-16 lg:py-24" aria-labelledby="hero-heading">
        <div className="container px-6 flex flex-col items-center gap-12 lg:gap-16 mx-auto">
          <div className="flex gap-12 lg:gap-16 w-full">
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 w-full">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 frutiger-aero-badge text-sm px-4 py-1.5 mb-4 animate-fade-up">
                  <Sparkles className="w-4 h-4" />
                  Kracked AI Food Plug
                </div>
                <h1 id="hero-heading" className="text-foreground text-3xl lg:text-5xl font-bold">
                  Ask for the best <span className="text-primary">Kracked Foods</span> in Malaysia
                </h1>
              </div>
              <div className="flex-1 w-full flex flex-col gap-8">
                <p className="text-muted-foreground text-base lg:text-lg">
                  Kracked Devs need to eat Kracked Food. AI-powered recommendations for Malaysian cuisine lovers. Discover hidden gems with real Google reviews.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={() => navigate('/auth')} className="frutiger-aero-badge border-0">
                    Jom Makan
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => scrollToSection('#features')}>
                    Explore features
                    <ArrowRight className="ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Phone Mockup with Map Panel */}
          <div className="w-full flex justify-center items-center animate-fade-up">
            <div className="relative flex items-stretch gap-0 h-[600px]">
              {/* Phone Mockup */}
              <div className="w-[384px] shrink-0 h-full">
                <div className="bg-card border-2 border-border rounded-3xl p-3 shadow-2xl h-full flex flex-col">
                  {/* Phone Header */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border mb-3 shrink-0">
                    <span className="text-xl">👨🏻‍💻🍔🥤</span>
                    <span className="font-semibold text-sm text-foreground">Kracked Food</span>
                  </div>
                  
                  {/* Demo Chat */}
                  <div className="space-y-3 px-2 flex-1 overflow-y-auto scrollbar-hide">
                    {/* Welcome Message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">
                        👨🏻‍💻
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 max-w-[80%]">
                        <p className="text-sm text-foreground">Hi kracker, what do you want to eat?</p>
                      </div>
                    </div>

                    {/* User typing */}
                    {currentStep >= 1 && (
                      <div className="flex justify-end animate-fade-up">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-2 max-w-[80%]">
                          <p className="text-sm">
                            {typingText}
                            {typingText.length < DEMO_CONVERSATION[0].text.length && (
                              <span className={`${showCursor ? 'opacity-100' : 'opacity-0'}`}>|</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Assistant Response */}
                    {currentStep >= 2 && (
                      <div className="flex gap-2 animate-fade-up">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">
                          👨🏻‍💻
                        </div>
                        <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 max-w-[80%]">
                          <p className="text-sm text-foreground">{DEMO_CONVERSATION[1].text}</p>
                        </div>
                      </div>
                    )}

                    {/* Result Cards with Click Animation */}
                    {currentStep >= 3 && DEMO_CONVERSATION.slice(2).map((item, idx) => (
                      currentStep >= 3 + idx && item.type === 'result' && (
                        <div 
                          key={item.name} 
                          className={`
                            flex gap-2 p-2 bg-card border rounded-xl animate-fade-up cursor-pointer
                            transition-all duration-300 ease-out
                            ${selectedCardIndex === idx 
                              ? 'border-primary ring-2 ring-primary/20 scale-[1.02] shadow-lg bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                            }
                          `}
                          style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                          <div className={`
                            w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl
                            transition-transform duration-300
                            ${selectedCardIndex === idx ? 'scale-110' : ''}
                          `}>
                            {item.image}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">{item.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 fill-accent text-accent" />
                              <span>{item.rating}</span>
                              <span>·</span>
                              <span>{item.price}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{item.area}</span>
                            </div>
                          </div>
                          {/* Selection indicator */}
                          {selectedCardIndex === idx && (
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>

                  {/* Fake Input */}
                  <div className="mt-3 px-2">
                    <div className="bg-muted rounded-full px-4 py-2 text-sm text-muted-foreground">
                      What do you want to eat?
                    </div>
                  </div>
                </div>
              </div>

              {/* Connecting Line - Hidden on mobile */}
              <div className="hidden lg:block relative" style={{ width: '60px' }}>
                <ConnectingLine isVisible={showMapPanel} />
              </div>

              {/* Map Panel - Hidden on mobile */}
              <div className="hidden lg:block">
                <MockMapPanel 
                  selectedKedai={selectedCardIndex !== null ? DEMO_CONVERSATION[2 + selectedCardIndex] : null} 
                  isVisible={showMapPanel} 
                />
              </div>

              {/* Connecting Line 2 - Map to Menu */}
              <div className="hidden lg:block relative" style={{ width: '60px' }}>
                <ConnectingLine isVisible={showMenuPanel} />
              </div>

              {/* Menu Panel - Hidden on mobile */}
              <div className="hidden lg:block">
                <MockMenuPanel 
                  selectedKedai={selectedCardIndex !== null ? DEMO_CONVERSATION[2 + selectedCardIndex] : null} 
                  isVisible={showMenuPanel} 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-background py-16 md:py-24">
        <div className="container mx-auto px-6 flex flex-col gap-12 md:gap-16">
          <div className="flex flex-col gap-4 md:gap-5 max-w-xl mx-auto text-center">
            <p className="text-sm md:text-base font-semibold text-muted-foreground">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why choose Kracked Food?</h2>
            <p className="text-base text-muted-foreground">
              The smarter way to discover your next makan adventure:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex flex-col gap-5 items-center text-center">
                  <div className="flex justify-center items-center w-12 h-12 shrink-0 rounded-lg bg-primary/10 border border-primary/20 shadow-sm">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted py-16 md:py-24">
        <div className="container mx-auto px-6 flex flex-col lg:flex-row gap-12 md:gap-16 items-center">
          <div className="flex flex-col gap-8 flex-1">
            <div className="flex flex-col gap-4 md:gap-5">
              <p className="text-sm md:text-base font-semibold text-muted-foreground">How It Works</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Getting started is easy!</h2>
              <p className="text-base text-muted-foreground">In just 3 simple steps, you're ready to makan:</p>
            </div>
            <div className="flex flex-col gap-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                    <div className="flex justify-center items-center w-12 h-12 shrink-0 rounded-lg bg-background border shadow-sm">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button size="lg" className="w-fit" onClick={() => navigate('/auth')}>
              Get started now
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 w-full max-w-md">
            <div className="overflow-hidden rounded-2xl border bg-background shadow-xl p-8">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Try it now!</h3>
                  <p className="text-muted-foreground text-sm">
                    "Char kway teow sedap near Bangsar"
                  </p>
                </div>
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Finds restaurants in your area</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Shows real Google ratings</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Get directions instantly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-background">
        <TestimonialsCarousel />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-muted py-16 md:py-24" aria-labelledby="faq-heading">
        <div className="max-w-2xl gap-12 mx-auto px-6 flex flex-col">
          <div className="flex flex-col text-center gap-5">
            <p className="text-sm md:text-base text-muted-foreground font-semibold">FAQ</p>
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-foreground">
              Got questions? We've got answers.
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about Kracked Food. Can't find what you're looking for?{" "}
              <a href="mailto:hello@krackeddev.com" className="text-primary underline">
                Contact us.
              </a>
            </p>
          </div>

          <Accordion type="single" defaultValue="item-1" aria-label="FAQ items">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index + 1}`}>
                <AccordionTrigger className="text-base font-medium text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="bg-background/60 w-full rounded-xl p-6 md:p-8 flex flex-col items-center gap-6 border border-border">
            <div className="flex flex-col text-center gap-2">
              <h3 className="text-2xl font-bold text-foreground">Ready to find your next makan spot?</h3>
              <p className="text-base text-muted-foreground">
                Join thousands of foodies discovering hidden gems every day!
              </p>
            </div>
            <Button size="lg" onClick={() => navigate('/auth')} className="frutiger-aero-badge border-0 px-8">
              Get started free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 lg:py-16 border-t border-border" role="contentinfo">
        <div className="container px-6 mx-auto flex flex-col gap-8 lg:gap-12">
          <div className="flex flex-col lg:flex-row md:justify-between md:items-center gap-8">
            <div className="flex flex-col items-center lg:items-start lg:flex-row gap-8">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="text-2xl shrink-0">👨🏻‍💻🍔🥤</span>
                <span className="text-2xl neon-text whitespace-nowrap">K<span>r</span>acked Foo<span>d</span></span>
              </div>

              <nav className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center">
                {MENU_ITEMS.map(({ label, href }) => (
                  <button
                    key={label}
                    onClick={() => scrollToSection(href)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <Button onClick={() => navigate('/auth')} className="frutiger-aero-badge border-0 px-6">
              Get started
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 text-center">
            <p className="text-muted-foreground text-sm order-2 lg:order-1">
              © 2024 Kracked Food. Built with ❤️ by{" "}
              <a href="https://krackeddev.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
                Kracked Devs
              </a>
              {" "}• Bounty 4
            </p>

            <nav className="flex flex-col md:flex-row items-center gap-6 md:gap-8 order-1 lg:order-2 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
