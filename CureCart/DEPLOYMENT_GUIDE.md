# 🚀 CureCart — Live Deployment Guide
## MongoDB Atlas + Render (Backend) + Vercel (Frontend)

---

## ⏱️ Total Time: ~45 minutes | 💰 Cost: FREE

---

## STEP 1 — GitHub pe Code Upload karo (5 min)

GitHub ke bina deploy nahi ho sakta. Agar account nahi hai to pehle banao.

### 1.1 GitHub Account
→ https://github.com/signup

### 1.2 Do alag repositories banao:

**Repository 1 — Backend:**
1. https://github.com/new pe jao
2. Name: `curecart-backend`
3. Private rakho ✅
4. "Create repository" click karo

**Repository 2 — Frontend:**
1. https://github.com/new pe jao
2. Name: `curecart-frontend`
3. Public ya Private (dono theek hai)
4. "Create repository" click karo

### 1.3 Code Upload karo

**Backend upload (Terminal/Command Prompt mein):**
```bash
cd curecart-backend           # backend folder mein jao
git init
git add .
git commit -m "CureCart backend v3"
git branch -M main
git remote add origin https://github.com/AAPKA_USERNAME/curecart-backend.git
git push -u origin main
```

**Frontend upload:**
```bash
cd curecart-frontend          # frontend folder mein jao
git init
git add .
git commit -m "CureCart frontend v3"
git branch -M main
git remote add origin https://github.com/AAPKA_USERNAME/curecart-frontend.git
git push -u origin main
```

> 💡 `AAPKA_USERNAME` ki jagah apna GitHub username daalo

---

## STEP 2 — MongoDB Atlas Setup (10 min)

### 2.1 Account Banao
→ https://www.mongodb.com/cloud/atlas/register
- Google se sign in kar sakte ho

### 2.2 Free Cluster Banao
1. "Build a Database" click karo
2. **FREE (M0 Sandbox)** select karo
3. Provider: **AWS**, Region: **Mumbai (ap-south-1)** select karo
4. Cluster Name: `curecart-cluster`
5. "Create" click karo (2-3 min lagenge)

### 2.3 Database User Banao
1. Left sidebar → **"Database Access"**
2. **"Add New Database User"** click karo
3. Authentication: Password
4. Username: `curecart_user`
5. Password: Generate karo ya apna rakho (yaad rakhna!)
   - Example: `CureCart@2025!`
6. Built-in Role: **"Atlas admin"**
7. "Add User" click karo

### 2.4 Network Access (IP Whitelist)
1. Left sidebar → **"Network Access"**
2. **"Add IP Address"** click karo
3. **"Allow Access from Anywhere"** click karo → `0.0.0.0/0`
   *(Render ka IP dynamic hota hai, isliye sab allow karte hain)*
4. "Confirm" click karo

### 2.5 Connection String Copy karo
1. Left sidebar → **"Database"**
2. Cluster ke paas **"Connect"** click karo
3. **"Drivers"** select karo
4. Driver: **Node.js**, Version: **5.5 or later**
5. Connection string copy karo — kuch aisa dikhega:
   ```
   mongodb+srv://curecart_user:<password>@curecart-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. `<password>` ki jagah apna actual password daalo
7. URL ke end mein database name add karo:
   ```
   mongodb+srv://curecart_user:CureCart@2025!@curecart-cluster.xxxxx.mongodb.net/curecart?retryWrites=true&w=majority
   ```
8. **Ye string save karo** — backend mein use hogi

---

## STEP 3 — Render pe Backend Deploy karo (15 min)

### 3.1 Account Banao
→ https://render.com
- GitHub se sign in karo (same GitHub jo upar use kiya)

### 3.2 New Web Service
1. Dashboard pe **"New +"** → **"Web Service"**
2. **"Connect a repository"** → `curecart-backend` select karo
3. GitHub authorize karo agar pooche

### 3.3 Service Settings
```
Name:            curecart-api
Region:          Singapore (India ke paas)
Branch:          main
Runtime:         Node
Build Command:   npm install
Start Command:   npm start
Instance Type:   Free
```

### 3.4 Environment Variables Daalo
"Environment Variables" section mein ye sab daalo:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | *Step 2 ki MongoDB connection string* |
| `JWT_SECRET` | `CureCart_Super_Secret_JWT_2025_Change_This!` |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | *Baad mein Vercel URL daalna* (abhi khali chhod do) |
| `FAST2SMS_API_KEY` | *Fast2SMS dashboard se* |
| `CLOUDINARY_CLOUD_NAME` | *Cloudinary dashboard se* |
| `CLOUDINARY_API_KEY` | *Cloudinary dashboard se* |
| `CLOUDINARY_API_SECRET` | *Cloudinary dashboard se* |
| `RAZORPAY_KEY_ID` | *Razorpay dashboard se* |
| `RAZORPAY_KEY_SECRET` | *Razorpay dashboard se* |

### 3.5 Deploy!
1. **"Create Web Service"** click karo
2. Deploy hone mein **5-10 minute** lagenge
3. Logs mein ye dikhega:
   ```
   🚀 CureCart API → http://0.0.0.0:5000
   ✅ MongoDB Connected
   ```
4. Tumhara backend URL milega:
   ```
   https://curecart-api.onrender.com
   ```
   *(exact URL Render dashboard mein dikhega)*

### 3.6 Backend Test karo
Browser mein kholo:
```
https://curecart-api.onrender.com/api/health
```
Ye response aana chahiye:
```json
{ "success": true, "message": "CureCart API v3 🚀" }
```

### 3.7 Admin User Seed karo
Render Dashboard → curecart-api → **"Shell"** tab:
```bash
node utils/seeder.js
```
Output:
```
✅ MongoDB Connected
👤 Admin: admin@curecart.com / Admin@123
✅ DB seeded.
```

---

## STEP 4 — Vercel pe Frontend Deploy karo (10 min)

### 4.1 Account Banao
→ https://vercel.com
- GitHub se sign in karo

### 4.2 New Project
1. Dashboard pe **"Add New Project"**
2. `curecart-frontend` repository import karo
3. **"Import"** click karo

### 4.3 Project Settings
```
Framework Preset:  Vite
Root Directory:    ./  (default)
Build Command:     npm run build
Output Directory:  dist
Install Command:   npm install
```

### 4.4 Environment Variables
"Environment Variables" section mein:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://curecart-api.onrender.com/api` |

*(Render ka actual URL daalo jo Step 3 mein mila)*

### 4.5 Deploy!
1. **"Deploy"** click karo
2. 2-3 minute mein deploy ho jaayega
3. Tumhara frontend URL milega:
   ```
   https://curecart-frontend.vercel.app
   ```

---

## STEP 5 — Frontend URL ko Backend mein Add karo (2 min)

Ab Render Dashboard mein jao aur CLIENT_URL update karo:

1. Render → curecart-api → **"Environment"**
2. `CLIENT_URL` ki value update karo:
   ```
   https://curecart-frontend.vercel.app
   ```
3. **"Save Changes"** — service automatically redeploy hogi

---

## ✅ LIVE CHECK karo

| Test | URL |
|------|-----|
| Backend Health | `https://curecart-api.onrender.com/api/health` |
| Frontend | `https://curecart-frontend.vercel.app` |
| Admin Login | Email: `admin@curecart.com` Password: `Admin@123` |

---

## 🔑 Teeno Services ke Keys Kahan Se Milenge

### Fast2SMS (OTP SMS)
1. https://fast2sms.com → Sign Up
2. Login → **Dev API** section
3. API Key copy karo
4. Free mein 100 SMS/day milte hain

### Cloudinary (Image Upload)
1. https://cloudinary.com → Sign Up Free
2. Dashboard pe **Cloud name, API Key, API Secret** milega
3. Free mein 25GB storage

### Razorpay (Payment)
1. https://dashboard.razorpay.com → Sign Up
2. Settings → **API Keys** → "Generate Test Key"
3. Test mode mein real paisa nahi lagta
4. Test card: `4111 1111 1111 1111`

---

## ⚠️ Render Free Tier ke baare mein

Render free tier pe server **15 minute of inactivity** ke baad **sleep** ho jaata hai.
Pehli request pe **50-60 second** lag sakti hai (cold start).

**Solutions:**
1. **UptimeRobot** (free): https://uptimerobot.com
   - New monitor → HTTP
   - URL: `https://curecart-api.onrender.com/api/health`
   - Interval: 14 minutes
   - Ye server ko jaaga rakhega!

2. Ya **Render paid** ($7/month) mein upgrade karo — no cold starts

---

## 📁 Final File Structure

```
GitHub → curecart-backend/
├── config/
│   ├── db.js
│   └── cloudinary.js
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── cartController.js
│   ├── orderController.js
│   ├── paymentController.js
│   └── productController.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   └── validate.js
├── models/
│   ├── Cart.js
│   ├── Order.js
│   ├── Product.js
│   └── User.js
├── routes/
│   ├── admin.js
│   ├── auth.js
│   ├── cart.js
│   ├── orders.js
│   ├── payment.js
│   └── products.js
├── utils/
│   ├── seeder.js
│   └── sms.js
├── .gitignore
├── package.json
└── server.js

GitHub → curecart-frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx       ← Poora frontend code
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

---

## 🆘 Common Errors aur Solutions

| Error | Solution |
|-------|----------|
| `CORS blocked` | Render mein CLIENT_URL sahi daalo (Vercel URL) |
| `MongoDB connection failed` | Atlas mein IP `0.0.0.0/0` allow karo, password check karo |
| `Cannot find module` | `npm install` dobara run karo |
| `OTP not sending` | Fast2SMS API key check karo |
| `Image upload failed` | Cloudinary credentials check karo |
| `Payment failed` | Razorpay test keys check karo |
| Frontend blank | Vercel mein `VITE_API_URL` environment variable set hai? |

---

## 🔄 Code Update Karna (Future)

Koi bhi change karo aur push karo — automatically deploy hoga:

```bash
# Backend change
cd curecart-backend
git add .
git commit -m "fix: updated something"
git push
# Render automatically redeploy karega

# Frontend change  
cd curecart-frontend
git add .
git commit -m "feat: new feature"
git push
# Vercel automatically redeploy karega
```
