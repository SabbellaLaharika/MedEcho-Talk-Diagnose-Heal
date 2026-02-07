# MedEcho - Talk, Diagnose, Heal

MedEcho is an integrated healthcare platform designed to bridge the gap between patients and medical care using AI-driven diagnosis and seamless appointment management.

## Prerequisites
- Be sure to have **Node.js** installed.
- Be sure to have **Python** (3.8+) installed.
- Be sure to have **PostgreSQL** installed and running.

---

## 🚀 Quick Start Guide

You will need to run 3 separate terminals for the full application.

### Terminal 1: Database & Backend Setup

1. **Navigate to the backend:**
   ```bash
   cd backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   - Ensure a `.env` file exists in `backend/` with your `DATABASE_URL` and `JWT_SECRET`.
   - Example .env:
     ```env
     DATABASE_URL="postgresql://postgres:password@localhost:5432/medecho?schema=public"
     JWT_SECRET="your_secret_key"
     PORT=5000
     ```

4. **Initialize Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed Initial Data:**
   (Run this only once to populate doctors and departments)
   ```bash
   node seed.js
   ```

6. **Start the Backend Server:**
   ```bash
   node server.js
   ```
   > The server will run on `http://localhost:5000`

---

### Terminal 2: ML Service (AI Diagnosis)

1. **Navigate to the service directory:**
   ```bash
   cd ml_service
   ```

2. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Train the Model (First Time Only):**
   ```bash
   python train_model.py
   ```

4. **Start the ML Service:**
   ```bash
   python app.py
   ```
   > The service will run on `http://localhost:5001`

---

### Terminal 3: Frontend Client

1. **Navigate to project root:**
   ```bash
   # If you are in backend/ or ml_service/, go back to root
   cd ..
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Application:**
   ```bash
   npm run dev
   ```
   > The application will open at `http://localhost:5173`

---

## 🛠 Project Structure

- **/src**: React Frontend code (Pages, Components, Context).
- **/backend**: Node.js Express server, Prisma ORM, Controllers, and Routes.
- **/ml_service**: Python Flask server for Disease Prediction model.
