# MedEcho - Talk. Diagnose. Heal.

MedEcho is an advanced health ecosystem that integrates AI-driven symptom analysis, multilingual support, and a comprehensive doctor-patient appointment management system.

## Project Structure

- **`/` (Root)**: Frontend React application.
- **`/server`**: Backend Node.js service with PostgreSQL & Prisma.
- **`/ml_service`**: FastAPI service for AI Chat, Disease Prediction, and Speech-to-Text.

---

## Getting Started

### 1. ML Service (Python)
The ML Service handles the "Talk" part of the ecosystem using FastAPI.
```bash
cd ml_service
# pip install -r requirements.txt
python -m pip install -r requirements.txt
pip install -r requirements.txt
python main.py
```
*Runs on `http://localhost:8000`*

### 2. Backend Server (Node.js)
The core logic for users, schedules, and appointments.
```bash
cd server
npm install
```
**Setup Environment**: Create a `.env` file in `/server` with your `DATABASE_URL` (PostgreSQL).
```bash
# Update database schema
npx prisma db push

# Seed the database with doctors and demo users
npx prisma db seed

# Start server
npm run dev
```
*Runs on `http://localhost:5000`*

### 3. Frontend App (React)
The modern UI for patients and clinical staff.
```bash
# In the root directory
npm install
npm run dev
```
*Runs on `http://localhost:3000`*

---

## Key Features
- **Multi-Slot Weekly Hours**: Doctors can define multiple availability segments per day (e.g., Morning/Evening shifts).
- **Dynamic Slot Freezing**: Block specific time ranges (ranges, not just slots) with reasons to prevent bookings during emergencies or surgeries.
- **Bulk Apply Tool**: Create a schedule template and apply it to multiple days of the week instantly.
- **Multilingual AI Chat**: Diagnose symptoms using voice or text in multiple languages with real-time translation.
- **Intelligent Booking**: Automated conflict detection ensures zero double-bookings.

---

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Doctor | `sarah@medecho.com` | `123456` |
| Patient | `patient@medecho.com` | `123456` |
