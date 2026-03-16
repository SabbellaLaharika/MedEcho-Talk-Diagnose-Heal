# MedEcho Setup Guide

## Getting Started

### 1. Gemini AI API Key

To use the AI chat features, you need a Google Gemini API Key:

**Steps:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key" 
3. Create a new API key for your project
4. Copy the API key

**Add to .env file:**
```
VITE_GEMINI_API_KEY=your_api_key_here
```

### 2. Backend Server

Ensure the backend server is running:

```bash
cd server
npm install
npm run dev
```

Server will run on: `http://localhost:5000`

### 3. Frontend Development

Start the frontend dev server:

```bash
npm install
npm run dev
```

Frontend will run on: `http://localhost:3000` (or next available port)

### 4. Troubleshooting

**Error: "Gemini API not configured"**
- Make sure `VITE_GEMINI_API_KEY` is set in `.env` file
- Restart the dev server after adding the env variable

**Error: "Cannot reach server"**
- Ensure backend is running on port 5000
- Check: `http://localhost:5000` in browser
- Run: `cd server && npm run dev`

**Error: "Network error"**
- Check your internet connection
- Verify backend is accessible
- Check CORS settings in backend

## Environment Variables

All frontend variables must start with `VITE_`:

```
VITE_API_URL=http://localhost:5000/api
VITE_GEMINI_API_KEY=your_key_here
VITE_APP_NAME=MedEcho
VITE_PORT=3000
```

## Services

- **Frontend**: React + Vite (port 3000)
- **Backend**: Express.js (port 5000)
- **AI**: Google Gemini API
- **Database**: Prisma + SQLite (or configured DB)

