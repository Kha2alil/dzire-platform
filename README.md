# Dzire – E-Learning Platform

A modern, gamified learning management system focused on web development and programming skills. Combines structured courses, skill trees, badges, XP progression, and an AI layer for personalised learning experiences.

## Features

- User authentication with email verification
- Role-based access (Student, Teacher, Admin)
- Course management (video, PDF, and text lessons)
- Chapters, lessons, quizzes, and final exams
- Student onboarding with a placement test
- Skill tree with tiered progression (Beginner → Advanced)
- Badge system with 40+ achievement and skill badges
- XP, levels, and rank titles
- Global leaderboard
- Real-time notifications and badge celebrations
- Teacher dashboard with analytics (progress, failure points, engagement)
- Admin panel for user and course management

## AI Integration

Built on the GitHub Models API (GPT-4o / Claude — free, OpenAI-compatible). All features are orchestrated through a single `aiService.js`:

- **Idea 1 – Rule-Based Adaptive Learning:** After a quiz, simple rules recommend the next action (review, continue, or unlock advanced content)
- **Idea 2 – FAQ Chatbot:** A lightweight widget that matches student questions to a pre-defined knowledge base
- **Idea 3 – LLM Tutor:** A conversational assistant that gives quiz hints, analyses teacher analytics, and recommends post-exam learning paths

## Tech Stack

- Node.js + Express.js
- MySQL (UUID primary keys)
- JWT Authentication (Student / Teacher / Admin roles)
- Nodemailer (email verification)
- GitHub Models API (AI features)
- HTML / CSS / JS frontend (separate repository)

## Setup Instructions

1. Clone the repository: `git clone https://github.com/YourOrg/dzire-platform.git`
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your DB credentials, JWT secret, email settings, and AI API key
4. Create the database: `mysql -u root -p -e "CREATE DATABASE dzire_platform;"`
5. Import the schema: `mysql -u root -p dzire_platform < alltables.sql`
6. Start the server: `npm run dev` (development) or `npm start` (production)

> **Frontend:** served from the separate `dzire-landing` repository via Live Server on port 5500.

## API Endpoints

**Auth**
- `POST /api/auth/signup` – Register a new account
- `GET /api/auth/verify-email` – Verify email address
- `POST /api/auth/login` – Login and receive JWT
- `GET /api/auth/me` – Get current user
- `PATCH /api/auth/change-password` – Update password

**Profile**
- `GET /api/profile/me` – Get own profile
- `PATCH /api/profile/me` – Update profile
- `POST /api/profile/avatar` – Upload avatar

**Courses**
- `POST /api/courses` – Create a course
- `GET /api/courses` – List all courses
- `GET /api/courses/:id` – Get course details
- `PATCH /api/courses/:id` – Update course
- `DELETE /api/courses/:id` – Delete course

**Chapters & Lessons**
- `POST /api/courses/:id/chapters` – Add chapter
- `PATCH /api/chapters/:chapterId` – Update chapter
- `DELETE /api/chapters/:chapterId` – Delete chapter
- `POST /api/courses/:id/chapters/:cid/lessons` – Add lesson
- `PATCH /api/lessons/:lid` – Update lesson
- `DELETE /api/lessons/:lid` – Delete lesson

**Assessments**
- `POST /api/courses/:id/chapters/:cid/assessments` – Create assessment
- `POST /api/assessments/:id/submit` – Submit answers

**Skills & Badges**
- `GET /api/skills` – List all skills
- `GET /api/skills/me/unlocked` – Get student's unlocked skills
- `GET /api/badges` – List all badges
- `GET /api/badges/me` – Get student's badges
- `GET /api/gamification/me` – Get XP, level, and rank

**Notifications**
- `GET /api/notifications` – Get all notifications
- `GET /api/notifications/unread-count` – Get unread count
- `PATCH /api/notifications/:id/read` – Mark one as read
- `PATCH /api/notifications/read-all` – Mark all as read

**Onboarding**
- `GET /api/onboarding/status` – Check onboarding state
- `GET /api/onboarding/domains` – List domains
- `GET /api/onboarding/subdomains` – List subdomains
- `GET /api/onboarding/questions` – Get placement questions
- `POST /api/onboarding/submit` – Submit placement test
- `POST /api/onboarding/skip` – Skip onboarding

**Admin**
- `GET /api/admin/profiles` – List all users
- `POST /api/admin/add-user` – Create user
- `PUT /api/admin/edit-user/:id` – Edit user
- `PATCH /api/admin/ban-user/:id` – Ban / unban user
- `DELETE /api/admin/delete-user/:id` – Delete user

## Team

- **Khalil Khalfi** – Backend architecture, gamification, AI integration
- **Zineddine** – Teacher dashboard, assessment builder, admin panel
- **Prof. Meriem Belguidoum** – Academic supervisor

## License

Developed for academic purposes. All rights reserved © 2025 Dzire Team.
