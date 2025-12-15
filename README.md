# 👨🏻‍💻🍔☕️🥤 KrekFood for Hungry Devs

> Your AI-powered food Recommendation System plug for krackeddevs to fill their fuel after a late night coding session

A modern, conversational food recommendation app that helps you find authentic Malaysian restaurants using AI and real Google Maps reviews.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🤖 AI-powered chat recommendations using Google Gemini
- 📍 Location-based restaurant search
- 🗺️ Interactive Google Maps with pins and directions
- 🔍 Real Google Maps reviews via SerpAPI
- 💰 Budget & cuisine filters
- 📌 Custom start location pin for directions
- 🎯 Distance calculation and routing
- ⭐ AI-powered vibe analysis
- 🖼️ AI-generated food images
- 🔖 Save favorite spots
- 🌙 Dark mode support
- 📱 Fully responsive design with three-column layout

## 🚀 Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** Google Gemini 2.0 Flash
- **APIs:** SerpAPI (Google Maps search & reviews)
- **UI:** shadcn/ui components

## 🛠️ Quick Start

1. **Install dependencies:**
```bash
bun install
```

2. **Set up environment variables:**
Create `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

3. **Set Supabase secrets:**
- `GEMINI_API_KEY` - Google Gemini API key
- `SERPAPI_KEY` - SerpAPI key
- `GOOGLE_MAPS_API_KEY` - Google Maps JavaScript API key (for interactive map)

4. **Deploy Edge Functions:**
```bash
supabase functions deploy
```

5. **Run dev server:**
```bash
bun run dev
```

## 📁 Project Structure

```
makanmana/
├── src/
│   ├── components/     # UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom hooks
│   └── integrations/   # Supabase client
├── supabase/
│   ├── functions/     # Edge Functions
│   └── migrations/    # Database migrations
└── public/            # Static assets
```

## 🔧 Edge Functions

- **`chat`** - Main AI chat assistant (Gemini 2.0 Flash)
- **`vibecheck`** - Restaurant vibe analysis (Gemini 2.0 Flash)
- **`generate-food-image`** - AI food image generation (Gemini 2.0 Flash)
- **`generate-comment`** - Manglish comments generator

## 🗄️ Database

- `profiles` - User profiles
- `bookmarks` - Saved restaurants
- All tables have Row Level Security (RLS) enabled

## 🎨 Design

Malaysian hawker center vibes with:
- **Sambal Red** - Primary color
- **Pandan Green** - Secondary accents
- **Nasi Cream** - Warm backgrounds
- **Poppins** font - Casual, friendly typography

## 🐛 Troubleshooting

**Edge Function errors?**
- Check Supabase Dashboard → Edge Functions → Logs
- Verify API keys in Secrets
- Check rate limits

**Database errors?**
- Ensure migrations are applied
- Check RLS policies
- Verify user authentication

## 📦 Deployment

Recommended: **Vercel** or **Netlify**

Set environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

Build command: `bun run build`
Output: `dist/`

## 👥 Features
- Supabase Edge Functions development
- Google Gemini API integration
- SerpAPI integration for Google Maps
- AI prompt engineering
- Frontend & AI Groq Integration
- React application architecture
- UI/UX design & implementation
- Responsive design & theming

Built together for **krackeddev.com** Bounty #4 https://krackeddevs.com/code/bounty/viral-food-directory-map

## 📄 License

MIT License

## 🙏 Acknowledgments
- a fork of Github Repo : https://github.com/hackathon-girls/orked that acts as Base Foundation
- Powered by [Google Gemini](https://ai.google.dev/), [SerpAPI](https://serpapi.com/), and [Supabase](https://supabase.com/)
- Design inspired by Malaysian hawker centers

---

Made with ❤️ in Malaysia
