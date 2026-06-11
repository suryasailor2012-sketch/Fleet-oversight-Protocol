# Fleet Technical Oversight - Railway Package

This is the Railway-ready package for the Fleet Technical Oversight prototype.

## What This Version Includes

- Fleet dashboard
- Vessel register
- Monthly technical reports with parameter-level values and comments
- Claims tracker
- Dry dock planner
- AI review dashboard
- Offline browser fallback
- Central server-side state save through `/api/state`
- Login and admin-created user accounts

## Important

This package provides a lightweight shared-data prototype. It stores data in a JSON file on the Railway service.

For long-term production use, add:

- Microsoft/Google single sign-on if required
- Vessel-specific role-based access control
- PostgreSQL database
- Audit log
- File upload storage
- Backups

## Railway Deployment

1. Upload all files in this folder to a GitHub repository.
2. Go to Railway.
3. Create a new project.
4. Select **Deploy from GitHub repo**.
5. Choose your repository.
6. Railway should detect Node.js.
7. Start command: `npm start`
8. Generate/open the Railway public domain.

## First Admin Login

On first run, the server creates one admin account.

Default login:

```text
Email: admin@fleet.local
Password: ChangeMe123!
```

For live use, set these Railway variables before the first deployment:

```text
ADMIN_EMAIL=your-admin-email@company.com
ADMIN_PASSWORD=choose-a-strong-password
```

After signing in as admin, open the **Users** tab and create technical manager accounts.

All signed-in users can select **Change Password** in the top bar and update their own
password after entering their current password. Administrators can also open **Users**
and assign a temporary replacement password to any account. An administrator reset
signs that user out of all active sessions. Passwords must contain at least 8 characters.

## Recommended Railway Volume

To keep the JSON data after redeploys, attach a Railway volume and set:

```text
DATA_DIR=/data
```

Without a volume, data may be lost when the service is rebuilt or redeployed.

## Local Test

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```
