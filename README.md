# SISAR - Audit Tracking and Recommendations System

SISAR is a B2B SaaS application for audit management and tracking. It is structured as a monorepo (using npm workspaces) and includes a Node.js/Express backend, a React/Vite frontend, and a SQL Server database managed with Prisma.

## 📋 Prerequisites

Before you begin, make sure you have the following installed on your machine:

- **Node.js** (version 18.x or higher recommended)
- **npm** (version 9.x or higher)
- **SQL Server** (a local or remote instance you can connect to)

## 🚀 Setup and Local Launch

Follow these steps in order to set up and run the project on your local machine.

### 1. Install dependencies

From the project root, install all monorepo dependencies (this installs packages for the API, the Web app, and shared packages):

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file at the project root (you can use `.env.example` as a starting point if it exists) and set your environment variables.

The most important variable is the SQL Server connection string:

```env
# Example SQL Server configuration
DATABASE_URL="sqlserver://USER:PASSWORD@HOST:PORT;database=DB_NAME;encrypt=true;trustServerCertificate=true"

# Other potential variables depending on your setup
# JWT_SECRET="your_very_secure_jwt_secret"
# PORT=3000
```

### 3. Initialize the database (Prisma)

Once the database connection is configured, generate the Prisma client and apply the schema to your SQL Server database.

From the project root, run:

```bash
# 1. Generate the Prisma client
npm run prisma:generate

# 2. Apply migrations to the database
npm run prisma:migrate
```

*(Note: If you're in rapid development mode without a strict migration history, you can alternatively use `npx prisma db push --schema=packages/database/schema.prisma`)*

### 4. Run the application (Development mode)

To run both the backend (API) and frontend (Web) servers concurrently with hot reload, run the following command from the root:

```bash
npm run dev
```

This command uses `concurrently` to start both environments:

- **Frontend (Web)**: Typically available at [http://localhost:5173](http://localhost:5173)
- **Backend (API)**: Typically available at [http://localhost:3000](http://localhost:3000) (or the port defined in your `.env`)

---

## 📦 Production Deployment (Build)

To test the compiled (production-optimized) version locally:

1. Build all workspaces (API and Web):
   ```bash
   npm run build
   ```
2. Start the compiled API server:
   ```bash
   npm run start
   ```

*(Note: In production, make sure your API is configured to serve the static files generated in `apps/web/dist`, or use a dedicated web server such as Nginx.)*

## 🏗️ Monorepo Structure

- `apps/api/`: Node.js / Express backend.
- `apps/web/`: React / Vite / Tailwind CSS frontend.
- `packages/database/`: Prisma schema and database client.
- `packages/shared/`: Types, interfaces, and utilities shared between frontend and backend.


<img width="1590" height="1205" alt="image" src="https://github.com/user-attachments/assets/0e7df642-41ab-4f1e-91a9-01395c504aea" />
