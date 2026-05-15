# Outsource Pro | Project & Assignment Management System

A premium enterprise SaaS application for managing outsourcing projects, student assignments, subjects, and financial analytics.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Framer Motion, Zustand, ShadCN UI, Recharts.
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM.
- **Database**: PostgreSQL.

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/project_management"
   JWT_SECRET="your_secret_key"
   ```
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database:
   ```bash
   npx prisma db seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- **Premium Dashboard**: KPI cards, revenue analytics, and deadline tracking.
- **Subject Management**: Complete tracking of subjects, students, and revenue.
- **Student Directory**: Profile management and assignment history.
- **Outsourcing Hub**: Vendor performance, project assignments, and cost tracking.
- **Finance Dashboard**: Revenue vs Profit analytics with multi-currency support (INR/GBP).
- **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile.
- **Dark Mode**: Seamless transition between light and dark themes.

## Architecture

The project follows a clean, modular architecture:
- **Frontend**: Component-based UI with centralized state management (Zustand) and dedicated layouts for authenticated routes.
- **Backend**: RESTful API with controllers, middleware (Auth, Validation), and Prisma for type-safe database interactions.
