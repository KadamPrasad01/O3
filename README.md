# O3 - Secure Personal Cloud Storage

O3 is a personal cloud storage web application. It allows users to register, log in, upload files (like images, PDFs, audio files, and text documents), delete them, and preview them directly in the browser. 

The core feature of this application is **strict privacy**. Using database-level **Row Level Security (RLS)**, we ensure that files uploaded by User A are completely invisible and inaccessible to User B, even if they guess file IDs or try to bypass backend routes.

---

## 🚀 How it Works (in Simple Words)

1. **Authentication:** When you register or log in, the server hashes your password for security and gives you a temporary security badge called a **JWT Token**. Your browser stores this badge.
2. **Interactive UI:** The frontend presents a sleek dark-themed drive showing your files.
   - **Clicking a file card** fetches the file and previews it inside a glassmorphic window in the browser (supports PDF, text, images, video, and audio) instead of automatically downloading it.
   - **Clicking the three-dot button** on the top right of the card opens a dropdown menu to let you **Download** the file to your computer or **Delete** it.
3. **Database Security (RLS):** Every time the backend requests files, it starts a transaction block that tells PostgreSQL who is currently logged in. Because **Row Level Security** is enabled on the database:
   - The database checks: *"Does the `userId` on this file match the logged-in user?"*
   - If yes, the database returns or deletes the file.
   - If no, the database filters the file out entirely, preventing unauthorized access.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS (styling), Axios (API requests).
- **Backend:** Node.js, Express (web server), Multer (receives uploaded files), jsonwebtoken & bcryptjs (login and hashing).
- **Database ORM:** Prisma Client (interacts with PostgreSQL).
- **Database:** PostgreSQL hosted on Supabase.

---

## 📂 Project Structure

```text
O3/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Database models (User & File)
│   ├── scratch/
│   │   └── setup-rls.js         # Script to configure Postgres RLS policies
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js # Register / Login logic
│   │   │   └── file.controller.js # Secured file operations (wrapped in RLS transactions)
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT token verification middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.js   # Auth endpoints (/auth/register, /auth/login)
│   │   │   └── file.routes.js   # Secured file endpoints
│   │   └── app.js               # Express application initialization
│   ├── uploads/                 # Folder where physical files are stored
│   ├── .env                     # Environment variables (Database URL & JWT Secret)
│   └── server.js                # Entrypoint to run the server
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React Application (UI, Forms, Previews, API calls)
│   │   ├── index.css            # Base Tailwind imports & custom fonts
│   │   └── main.jsx             # React DOM entrypoint
│   └── package.json
└── README.md                    # This file!
```

---

## ⚙️ Step-by-Step Setup

Follow these steps to run the project locally on your machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

---

### Step 1: Set up the Backend

1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Create/verify the `.env` file inside the `backend` directory. It should look like this:
   ```env
   DATABASE_URL="DATABASE_URL"
   JWT_SECRET="JWT SECRET"
   ```

4. Push the Prisma database schema models to PostgreSQL:
   ```bash
   npx prisma db push
   ```

5. Rebuild the Prisma Client so it recognizes the User and File models:
   ```bash
   npx prisma generate
   ```

6. Configure Row Level Security (RLS) policies on the PostgreSQL database:
   ```bash
   node scratch/setup-rls.js
   ```

7. Start the backend developer server:
   ```bash
   npm run dev
   ```
   The server will start running at `http://localhost:3000`.

---

### Step 2: Set up the Frontend

1. Open a new terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The local web application will run at `http://localhost:5173`. Open this URL in your web browser.

---

## 🧪 How to Use & Test the Project

To verify that the privacy features and file previewer work:

1. **Register User A:**
   - Go to `http://localhost:5173`.
   - Click **Register** on the sign-in form.
   - Enter `userA@example.com` and a password, then click **Create Account**.
   - Upload some test files: an image (`.png` or `.jpg`), a document (`.pdf`), and a text file (`.txt`).
   - Click the **uploaded cards** to preview them directly in the browser.
   - Click the **three-dot icon** in the top right of a card to see the dropdown, and download/delete a file.

2. **Verify Isolation (User B):**
   - Click **Logout** in the navbar.
   - Click **Register** again.
   - Register a second user: `userB@example.com`.
   - **Notice that User B's file grid is completely empty!** Even though User A's files exist in the database, Row Level Security stops User B from seeing them.
   - Upload a new file (e.g. `secret_plan.txt`) under User B.
   - Click **Logout**.

3. **Verify Cross-User Access:**
   - Log back in as `userA@example.com`.
   - Confirm that User A can see and preview their own files, but **cannot see** User B's `secret_plan.txt` file.
