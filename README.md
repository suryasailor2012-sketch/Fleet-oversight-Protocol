# Fleet Technical Oversight - Railway Package

This is the Railway-ready package for the Fleet Technical Oversight prototype.

## What This Version Includes

- Fleet dashboard
- Vessel register
- Monthly technical reports with parameter-level values and comments, organized in per-month reporting folders that users can switch between
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

## Recommended Railway Volume

To keep the JSON data after redeploys, attach a Railway volume and set:

```text
DATA_DIR=/data
```

Without a volume, data may be lost when the service is rebuilt or redeployed.

## Monthly Reporting Folders

Every reporting month gets its own folder on disk under
`DATA_DIR/periods/<YYYY-MM>/reports.json`. Claims, dry dock plans, users and the
submitted-report archive stay fleet-wide (not per month), since those aren't reset
every month.

- The **Reporting period** selector in the sidebar lets any signed-in user switch
  between existing months. Switching reloads that month's vessel reports.
- Only admins can create a new month (**+ New month**) or lock/unlock a month.
  Creating a month asks whether to carry forward last month's scores as a starting
  draft, or start blank.
- Locking a month (**Lock month**) makes it read-only for everyone except admins -
  useful once a month has been fully submitted and you don't want further edits.
  Download PDF still works on a locked month.

## Local Test

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```
