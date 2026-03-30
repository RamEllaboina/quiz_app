# Deployment Guide

To deploy this Quiz App, you need two things:
1. **Cloud Database** (MongoDB Atlas)
2. **Hosting Provider** (Render, Railway, or Heroku)

## Step 1: Get a Cloud Database (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up (it's free).
2. Create a new **Cluster** (Free Tier).
3. In "Database Access", create a user (e.g., `admin`) and password.
4. In "Network Access", allow access from anywhere (`0.0.0.0/0`).
5. Click **Connect** > **Drivers** and copy the Connection String.
   - It looks like: `mongodb+srv://admin:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<password>` with your actual password.

## Step 2: Deploy to Render (Recommended)
1. Push this code to your GitHub repository.
2. Go to [Render](https://render.com) and sign up.
3. Click **New +** > **Web Service**.
4. Connect your GitHub repository.
5. Use these settings:
   - **Name**: `quiz-app`
   - **Root Directory**: `.` (leave empty)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Scroll down to **Environment Variables** and add:
   - `MONGODB_URI`: (Paste your MongoDB connection string from Step 1)
   - `JWT_SECRET`: (Enter a long random secret key)
   - `NODE_ENV`: `production`
7. Click **Create Web Service**.

## Step 3: Access Your App
- Render will give you a URL (e.g., `https://quiz-app.onrender.com`).
- Open that URL to see your app!

---

**Note**: The frontend is served automatically by the backend. You don't need a separate frontend deployment.
