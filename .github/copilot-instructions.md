# Copilot Instructions

This repository is a Vite + React SPA using Supabase for auth, storage, and database.

- Use `npm install`, `npm run dev`, `npm run build`, `npm run preview`.
- Keep environment secrets out of source code. Use `.env` and `.env.example`.
- Validate and sanitize user input before sending it to Supabase.
- Handle Supabase errors explicitly and show user-friendly messages.
- Preserve the existing component-based architecture and Tailwind styling.
- Prefer small, reusable helpers in `src/utils` and keep Supabase setup in `src/supabaseClient.js`.
- Document technical decisions in Spanish and English when adding comments or docs.
