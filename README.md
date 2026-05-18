# RailTrace 🚆

AI-powered Indian Railways tracker — built with Next.js + Groq AI .


## Project Structure

```
railtrace/
├── pages/
│   ├── index.js        ← Full UI (3 tabs, search, results, follow-up chat)
│   └── api/
│       └── chat.js     ← API route — calls Gemini (FREE)
├── styles/
│   └── globals.css     ← All styles
├── .env.local          ← Your Gemini API key (never commit this!)
├── package.json
└── README.md
```

---
