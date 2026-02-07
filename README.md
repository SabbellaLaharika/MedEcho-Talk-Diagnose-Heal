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

1. **Start PostgreSQL (Windows):**
   Open PowerShell as Administrator and run:
   ```powershell
   Start-Service -Name "postgresql-x64-18"
   ```
   *Note: Adjust the service name if your version differs (e.g., `postgresql-x64-16`)*

2. **Navigate to the backend:**
   ```bash
   cd backend
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Configure Environment:**
   - Ensure a `.env` file exists in `backend/` with your `DATABASE_URL` and `JWT_SECRET`.
   - Example .env:
     ```env
     DATABASE_URL="postgresql://postgres:password@localhost:5432/medecho?schema=public"
     JWT_SECRET="your_secret_key"
     PORT=5000
     ```

5. **Initialize Database:**
   ```bash
   # Sync schema directly (recommended for dev)
   npx prisma db push
   
   # OR generate connection client
   npx prisma generate
   ```

6. **Seed Initial Data:**
   (Run this to populate doctors, departments, and default users)
   ```bash
   node seed.js
   ```

7. **Verify Database Content (Optional):**
   ```bash
   node verify_db.js
   ```

8. **Start the Backend Server:**
   ```bash
   npm run start
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
   # If 'pip' is not recognized, try:
   python -m pip install -r requirements.txt
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

---

## 🔧 Troubleshooting

### 1. Database Connection Failed
**Error:** `Can't reach database server at localhost:5432`
**Fix:**
- Ensure PostgreSQL service is running.
- **Windows:** Run `Get-Service *postgres*` in PowerShell. If stopped, run `Start-Service -Name "postgresql-x64-18"` (Admin).
- Check your `.env` file `DATABASE_URL` credentials.

### 2. Prisma Migration/Seed Errors
**Error:** `Unique constraint failed` or `Migration drift detected`
**Fix:**
- Reset the database (Warning: Deletes all data):
  ```bash
  cd backend
  npx prisma migrate reset --force
  ```
- Or force-push the schema:
  ```bash
  npx prisma db push
  ```

### 3. "EPERM: operation not permitted"
**Error:** File locking issues in `node_modules/.prisma`
**Fix:**
- Stop the server (Ctrl+C).
- Close other terminals/VS Code instances if necessary.
- Run `npm install` inside `backend/` to refresh dependencies.

