# Repository Guidelines

## Project Structure

This repository contains two applications. `frontend/src` holds the React pages, components, hooks, services, and utilities; `frontend/public` contains static images and other public assets. `backend/app` contains Laravel application code, with HTTP routes in `backend/routes`, migrations and seeders in `backend/database`, and PHPUnit tests in `backend/tests/Unit` and `backend/tests/Feature`. Shared project documentation and deployment workflows live in `docs` and `.github`.

## Build, Test, and Development

Run commands from the relevant application directory:

- `cd frontend; npm install` installs frontend dependencies.
- `cd frontend; npm run dev` starts the Vite development server.
- `cd frontend; npm run build` creates the production bundle in `frontend/dist`.
- `cd frontend; npm run lint` runs ESLint across the frontend.
- `cd backend; composer install` installs PHP dependencies.
- `cd backend; composer dev` starts Laravel, queue, log, and Vite development processes.
- `cd backend; composer test` clears cached config and runs the PHPUnit suite via Artisan.

Configure local backend settings in `backend/.env` using `backend/.env.example` as a reference. Do not commit secrets or generated environment files.

## Coding Style

Follow the existing conventions in the file you are changing. The backend `.editorconfig` specifies UTF-8, LF endings, final newlines, and four spaces; use two spaces for YAML. Frontend code uses ES modules, React JSX, and ESLint; keep components and pages in PascalCase and hooks prefixed with `use`. Use Laravel's established PSR-4 structure and naming conventions for PHP classes. Keep assets in `frontend/public` when referenced by URL, or `frontend/src/assets` when imported by code.

## Testing

Backend tests use PHPUnit through Laravel and are divided into `Unit` and `Feature`; name new tests descriptively, typically ending in `Test.php`, and run `composer test` from `backend`. PHPUnit is configured for in-memory SQLite. The frontend currently defines lint and build scripts but no dedicated test script; run both before submitting frontend changes.

## Commits and Pull Requests

Recent commits use short, direct summaries, often imperative (for example, “Updated logout”). Keep commit subjects concise and focused. Pull requests should explain the user-visible or backend change, note relevant tests and manual checks, link related issues when available, and include screenshots for visual frontend changes.
