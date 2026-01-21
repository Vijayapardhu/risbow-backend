# RISBOW Backend Platform 🚀

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Plus+Jakarta+Sans&size=28&pause=1200&color=4F46E5&center=true&vCenter=true&width=600&lines=Omnichannel+Commerce+Engine;Multi-Vendor+Marketplace;Live+Shopping+Rooms" alt="Risbow animated headline" />
</p>

A production-ready, feature-complete **NestJS** backend for the RISBOW Super App. This platform powers an omnichannel commerce experience with real-time features, advanced logistics, and a scalable architecture.

---

## 📚 Documentation
- **[Integration Guide](API_INTEGRATION_GUIDE.md)**: For Frontend/Mobile developers.
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)**: Configuration reference.
- **[Swagger API Docs](http://localhost:3000/api/docs)**: Interactive API playground (available when server runs).
- **[Deployment Guide](DEPLOY.md)**: Instructions for production deployment.

---

## 🌟 Key Features

### Core Commerce
- **🛒 Smart Cart & Checkout**: Full lifecycle from cart management to COD/Online payments (Razorpay).
- **📦 Product Catalog**: Rich catalog with variations, specifications, and categories.
- **🎁 Promotions**: Robust system for Coupons and "Free Gift" promotions.
- **🏪 Multi-Vendor**: Vendor portal, product management, and payout tracking.

### Engagement & Social
- **🎥 Live Rooms**: Real-time shopping rooms with socket integrations.
- **🪙 Coins Loyalty**: Earn/burn mechanics for user retention.
- **🗣️ Reviews**: Verified purchase reviews with media support.

### Operations
- **🚚 Logistics**: Order logic, returns, refunds, and shipping address management.
- **📊 Analytics**: Banner performance, sales metrics, and admin dashboards.
- **🛡️ RBAC**: Fine-grained access control (Admin, Vendor, Customer, Telecaller).

---

## 🛠️ Architecture

- **Framework**: [NestJS](https://nestjs.com/) (Modular, Scalable)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Caching & Queues**: Redis + [BullMQ](https://docs.bullmq.io/)
- **Storage**: Supabase Storage / Local
- **Validation**: Class-Validator + DTOs

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis (Optional for local dev, Required for Queues)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/risbow-backend.git
    cd risbow-backend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    ```bash
    cp .env.example .env
    # Update .env with your DB credentials. See ENVIRONMENT_VARIABLES.md
    ```

4.  **Database Setup**
    ```bash
    # Generate Prisma Client
    npm run prisma:generate
    
    # Push Schema to DB (Dev only)
    npm run prisma:push
    ```

5.  **Run Application**
    ```bash
    # Development (Watch Mode)
    npm run start:dev
    ```
    Server will start at `http://localhost:3000`. Swagger UI at `/api/docs`.

---

## 🧪 Testing

We rely on comprehensive E2E tests for stability.

```bash
# Run End-to-End Tests
npm run test:e2e

# Run Specific Test (e.g., Checkout)
$env:NODE_ENV='test'; npx jest test/checkout.e2e-spec.ts --config ./test/jest-e2e.json
```

---

## 📦 Deployment

The project is optimized for **Render.com** but can be deployed anywhere with Node.js/Docker.
See [render.yaml](render.yaml) for the infrastructure blueprint.

For detailed deployment steps, refer to [DEPLOY.md](DEPLOY.md).

---

## 🤝 Contribution

1.  Create a feature branch (`git checkout -b feature/amazing-feature`).
2.  Commit your changes.
3.  Push to the branch.
4.  Open a Pull Request.

---

**Developed for RISBOW.**
