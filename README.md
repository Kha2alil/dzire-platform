# Dzire Platform - E-Learning Platform

## Features
- User authentication (Signup with email verification)
- Role-based access (Student, Teacher)
- Gamification system
- Course management

## Tech Stack
- Node.js + Express.js
- MySQL
- JWT Authentication
- Nodemailer (Email verification)

## Setup Instructions
1. Clone repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run database migrations
5. Start server: `npm start`

## API Endpoints
- POST /api/auth/signup - User registration
- GET /api/auth/verify-email - Email verification