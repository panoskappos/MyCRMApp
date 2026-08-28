# MyCRMApp

A modern CRM application for equipment inspection management, built with React 19, Vite, TypeScript, and Firebase.

> **Note**: This is a sanitized portfolio showcase of a real-world, production CRM built for equipment inspection management. Proprietary data and client-specific integrations have been removed.

## Features

### Core Functionality

- **Customer Management** with pagination (50 customers per page with Firestore cursor)
- **Calendar System** with task management & monthly scheduling
- **Inspection Reports** with print-friendly layout and PDF export functionality
- **Role-based Access Control** (Admin, Office, Delivery, Developer)

### UI / UX

- 🚀 **Performance**: Paginated customer list with Firestore cursors for fast load times
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS & Lucide icons
- 📋 **Enhanced Calendar**: Full-month task management interface
- 📄 **PDF Export**: Clean print styles for customer & store inspection reports
- 🔐 **Authentication**: Firebase Auth with role-based navigation guards
- 📱 **Mobile Responsive**: Optimised layout for mobile, tablet, and desktop views

## Data Model

```
Customer → Store/Branch → Fire Extinguisher → Inspection
```

### Role Permissions

#### Admin & Developer
- Full access to all system features
- User management and account invitation workflow
- Customer creation, editing, and soft-deletion
- Full task and calendar management

#### Office
- Customer & Store management (view, create, edit)
- Task creation and assignment
- Inspection report PDF export
- Calendar access

#### Delivery
- View assigned customer sites
- Calendar access (assigned tasks only)
- Task completion status updates

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Authentication)
- **PDF Generation**: Browser Print API + CSS Print Styles
- **Icons**: Lucide React
- **Calendar**: React Calendar
- **Routing**: React Router DOM

## Getting Started

1. Create a Firebase project and add your web app credentials to `.env`:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

## Firestore Collections

| Collection | Purpose |
|---|---|
| `customers` | Customer records |
| `stores` | Store / branch records per customer |
| `extinguishers` | Fire extinguisher equipment per store |
| `inspections` | Inspection records per extinguisher |
| `tasks` | Calendar task entries |
| `users_roles` | User role assignments |
| `invitations` | Pending user invitations |

