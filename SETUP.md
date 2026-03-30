# Quiz Application Setup Guide

## Prerequisites
- Node.js (v14+)
- MongoDB installed and running locally

## Quick Start

1. **Start the Backend Server**
   The backend serves both the API and the Frontend files.
   ```bash
   cd backend
   npm install
   node server.js
   ```
   You should see: `🚀 Quiz App Server Started`

2. **Access the Application**
   Open your browser and navigate to:
   👉 **http://localhost:3000**

   **IMPORTANT**: Do NOT open the HTML files directly (e.g., `file:///C:/Users/...`). This will cause network errors ("Failed to fetch") because the browser blocks the connection for security reasons. Always use the `http://localhost:3000` URL.

## Admin Access
- **URL**: http://localhost:3000/admin-login.html
- **Default Credentials**:
  - Username: `RamEllaboina`
  - Password: `ramu143`

## Troubleshooting
- If you see "Failed to fetch", ensure the backend server is running and you are using the localhost URL, not file path.
- Ensure MongoDB is running.