# Risbow Backend Platform

<p align="center">
	<img src="https://readme-typing-svg.demolab.com?font=Plus+Jakarta+Sans&size=28&pause=1200&color=4F46E5&center=true&vCenter=true&width=600&lines=Launch-ready+Razorpay+Compliance;SMS+Provider+Certainty;Unified+Commerce+Operations" alt="Risbow animated headline" />
</p>

<p align="center">
	<img src="https://svg-banners.vercel.app/api?type=glitch&text1=Ship%20with%20Confidence&width=750&height=200" alt="Animated glitch banner" />
</p>

A production-ready NestJS backend designed for the Risbow omnichannel commerce platform, bundled with a polished Next.js launch website and Render deployment templates.

---

## Highlights

- **Modular architecture** powered by NestJS with feature domains for auth, catalog, payments, rooms, vendors, and more.
- **Prisma ORM** layer with PostgreSQL support plus health probes that ensure database readiness.
- **Redis-backed queues** through BullMQ for background workflows and scheduled jobs.
- **JWT authentication** and throttling guards for secure API exposure.
- **Render blueprint** in [render.yaml](render.yaml) for one-click cloud deployment, tuned for free-tier limitations.
- **Marketing Launch Site** built with Next.js + Tailwind in [launch-site](launch-site), showcasing Razorpay and SMS compliance messaging.

---

## Repository Layout

| Path | Description |
| --- | --- |
| [src](src) | NestJS source grouped by business domains (auth, users, orders, payments, vendors, etc.). |
| [prisma](prisma) | Prisma schema and migrations. |
| [public](public) | Static assets served by the backend. |
| [render.yaml](render.yaml) | Render blueprint configuring web service and environment variables. |
| [launch-site](launch-site) | Next.js + Tailwind product launch page. |
| [.github/workflows/launch-site.yml](.github/workflows/launch-site.yml) | GitHub Actions workflow verifying the launch site build. |

---

## Getting Started (Backend)

```bash
# install dependencies
npm install

# generate Prisma client
npm run prisma:generate

# compile TypeScript
npm run build

# run production build locally (expects env vars)
npm run start:prod

# developer mode with hot reload
npm run start:dev
```

### Environment Variables

Duplicate `.env.example` to `.env` and adjust values:

- `DATABASE_URL` – PostgreSQL connection string.
- `JWT_SECRET` – JWT signing key (generate using Node crypto).
- `REDIS_HOST` / `REDIS_PORT` – Redis queue host.
- `RAZORPAY_*` – Razorpay credentials for payment operations.

---

## Deploying on Render

1. Push the repository to GitHub and open the Render dashboard.
2. Use **Blueprint** deploy and point to [render.yaml](render.yaml).
3. Provide each secret requested by the service (e.g., DATABASE_URL, JWT_SECRET, Razorpay keys).
4. Render runs `npm install`, `npm run build`, and `npx prisma migrate deploy` (via start command) before launching `npm run start:prod`.
5. Monitor the `/health` endpoint to verify Postgres connectivity.

> **Note:** Free-tier services do not support `preDeployCommand`. The blueprint already inlines migration execution into the start command.

---

## Launch Site (Next.js)

Located in [launch-site](launch-site) and mirrored at [github.com/Vijayapardhu/risbow](https://github.com/Vijayapardhu/risbow.git). Ideal for a public announcement or marketing waitlist page.

```bash
cd launch-site
npm install
npm run dev        # local preview on http://localhost:3000
npm run build      # production build
npm run start      # serve built site
```

GitHub Actions automatically lint, build, and export the site on pushes/PRs touching this folder.

### Launch Page Sections

- Hero with Razorpay and SMS compliance positioning.
- Compliance cards detailing Razorpay rule automation and SMS provider safeguards.
- Animated timeline outlining the 4-week go-live plan.
- Interactive FAQ for regulatory questions.
- Offerings matrix highlighting support packages and policy trackers.

---

## Testing & Quality

- Run `npm run lint` for ESLint checks across the backend.
- Execute `npm test` for Jest unit tests; `npm run test:e2e` for end-to-end coverage.
- `npm run format` applies Prettier formatting to TypeScript sources.

---

## Roadmap Ideas

- [ ] Add integration tests covering payment and messaging flows.
- [ ] Provision staging and production Render environments via IaC.
- [ ] Extend Launch Site with CMS-driven content and newsletter signup.
- [ ] Wire BullMQ queues to background processors for notification dispatch.

---

## Support

Questions or access requests? Reach out to **hello@risbow.org** or open an issue in the repository.
