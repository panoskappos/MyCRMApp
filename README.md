# MyCRMApp

A modern, generic CRM application for equipment inspection management, built with React, Vite, TypeScript, and Firebase.

## Features

### Core Functionality

- **Customer Management** with pagination (50 customers per page)
- **Calendar System** with task management
- **Inspection Reports** with PDF export functionality
- **Role-based Access Control** (Admin, Office, Delivery, Developer)

### UI / UX

- 🚀 **Performance**: Paginated customer list with Firestore cursor
- 🎨 **Modern 2026 UI**: Clean, responsive design with Tailwind CSS
- 📋 **Enhanced Calendar**: Full-month task management interface
- 📄 **PDF Export**: Print-friendly inspection report layout
- 🔐 **Authentication**: Firebase Auth with role-based access
- 📱 **Mobile Responsive**: Works seamlessly on all devices

## Data Model

```
Customer → Store/Branch → Fire Extinguisher → Inspection
```

### Role Permissions

#### Admin & Developer
- Full access to all features
- User management and system administration
- Customer creation / editing / deletion
- Task creation and management

#### Office
- Customer management (view, create, edit)
- Task creation and management
- Inspection report PDF export
- Calendar access

#### Delivery
- View customers (limited)
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

1. Create a new Firebase project and copy your credentials into `.env`:

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
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
