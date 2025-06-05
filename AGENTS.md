# Poker Tournament Manager

This project provides a full stack application for managing poker tournaments. It consists of a Node.js backend and a React frontend.

## Setup

Install all dependencies for both the backend and frontend:

```bash
npm run install-all
```

## Development

Start the backend and frontend in parallel:

```bash
npm start
```

The frontend will be available at `http://localhost:5173`.

## Database Migrations

Run all database migrations against your Supabase instance by executing:

```bash
cd backend && node src/database/migrate.js
```

## Running Tests

Inside `frontend` run:

```bash
npm test
```
