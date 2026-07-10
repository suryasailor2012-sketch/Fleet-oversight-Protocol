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

If the administrator cannot sign in later, set these Railway variables and redeploy:

```text
ADMIN_EMAIL=your-admin-email@company.com
ADMIN_PASSWORD=new-temporary-admin-password
RESET_ADMIN_PASSWORD=true
```

After signing in successfully, change the admin password inside the app. You can then
remove `RESET_ADMIN_PASSWORD` or set it to `false` so the stored admin password is not
reset again on every restart.

### Vessel-level access

When creating a user, select the vessels that should be linked to that account. An
administrator can later open **Users**, change the checked vessels under an account,
and select **Save Vessel Access**. Administrators always see the full fleet. Technical
managers and owner viewers see only their linked vessels across dashboards, monthly
reports, claims, dry dock planning, owner review, submitted reports and exports.

Vessel access is enforced by the server as well as the interface. Restricted users
cannot retrieve or update another vessel's records through the API.

All signed-in users can select **Change Password** in the top bar and update their own
password after entering their current password. Administrators can also open **Users**
and assign a temporary replacement password to any account. An administrator reset
signs that user out of all active sessions. Passwords must contain at least 8 characters.

## Required Railway Volume for Live Use

To keep users, passwords, vessel access and submitted reports after Railway restarts,
attach a Railway volume and set:

```text
DATA_DIR=/data
```

Without a volume, Railway can recreate the app filesystem when the service restarts,
which may make it appear that users were deleted after logout. The app writes
`users.json` and `users.backup.json` in `DATA_DIR` and automatically restores the
user list from the backup if the primary user file is missing or invalid.

## Local Test

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```
