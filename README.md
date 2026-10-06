Creates a simple moving estimation web app

Goal: gain experience with full stack development, api, jwt auth, and deployment

can create username/password with unique jwt

can create an estimate on the estimate page (the landing page after login) for a customer, saves the estimate, ability to edit or delete old estimates

each estimate can have notes attached to it via a "Show Notes" button on that estimate's card, which opens an inline area to add move details (special items, access issues, etc.) and view/delete existing notes for that estimate

## How estimates are priced

Estimates are **hours-based**. Enter the size of the move (square footage, optionally pounds), access at each end (stairs, elevator, carry distance, parking), packing level, drive time, furniture assembly and special items (pianos, safes, etc.). The estimator then:

1. Works out the weight (pounds entered, or square footage x lbs/sq ft)
2. Picks a crew size for that weight (unless you enter one)
3. Estimates load + unload time, slowed by stairs / long carries / parking, plus packing, assembly, special items, drive and shop travel time
4. Rounds up to billable hours (with a minimum)
5. Prices it: hours x (crew x per-mover rate + truck rate) + trip fee + packing materials + special item fees

The form shows a **live quote** as you type, and each saved estimate has a **Breakdown** button showing where the hours and dollars came from.

**Every number to tune lives at the top of [`backend/api/pricing.py`](backend/api/pricing.py)** in the `PRICING` dict: rates, minimums, work speeds, access penalties, crew thresholds, and the special items list (adding an item there adds it to the form automatically). Saved estimates keep the price they were quoted at until they're edited.

## Completed moves

After a job, hit **Mark Completed** on the estimate and record the actual hours, crew size and final price. It moves to the **Completed Moves** page, which shows how far off each estimate was plus an overall accuracy summary - use that to tune `pricing.py`. **Reopen** moves it back to open estimates.

## Running locally (without Docker)

```
# backend
cd backend
cp .env.example .env          # turns on DEBUG for local dev
python -m venv venv
venv\Scripts\activate         # Mac/Linux: source venv/bin/activate
pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver

# frontend (second terminal)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

## Future ideas

- Room-by-room item inventory instead of square footage
- Long-distance moves (mileage-based pricing)
- Printable / emailable quote for customers
- Use completed-move data to suggest pricing adjustments automatically


---

## Running with Docker

The whole stack (Postgres, Django/gunicorn backend, nginx-served React frontend) runs via Docker Compose:

```
cp .env.docker.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

Edit `.env` to set real values for `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, etc. before deploying anywhere beyond local testing. If the frontend is served from a different address, add it to `DJANGO_CORS_ALLOWED_ORIGINS`.

Security defaults: `DEBUG` is off unless `DJANGO_DEBUG=True`, a `DJANGO_SECRET_KEY` is required when it's off, and only the listed hosts / CORS origins are allowed.

## Styling

Uses Tailwind CSS (v4, via the `@tailwindcss/vite` plugin - no separate config file needed). Utility classes live directly on components; `frontend/src/index.css` just contains the single `@import "tailwindcss";` that pulls it all in.

## Running tests

Backend (Django):

```
cd backend
python manage.py test api
```

Frontend (Vitest + React Testing Library):

```
cd frontend
npm install
npm test
```
