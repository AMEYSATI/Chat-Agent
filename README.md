# AI Chat Agent Architecture (Spur Coding Challenge)

The architecture uses an Ingestion Service (Gateway), a BullMQ background worker tier running on Redis, a PostgreSQL database (Supabase) via Sequelize ORM, and a responsive React frontend interface.

_______________________________


#Local Setup

* **Node.js** (22.14 version is used by me)
* **Redis Instance** (used cloud hosted uptash)
* **PostgreSQL Database** (Used Supabase)

* ### Step 1: Clone and Install Dependencies
Navigate to each repository tier and install the node dependencies:

```bash or cmd
# From the root directory
cd ingestion-service && npm install
cd ../worker-service && npm install or cd worker-service if use new terminal
cd ../frontend && npm install or cd frontend if use new terminal

### Step 2: Environment Configuration
Create a .env file in both ingestion-service and worker-service directories based on the templates below.

ingestion-service/.env
