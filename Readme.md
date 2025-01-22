# StructoMate

StructoMate is a comprehensive building management application designed to simplify managing tenants, agreements, announcements, payments, and more in a single-building environment.

## Features

- **User Management**: Add, update, and manage users and their roles (admin, member, user).
- **Agreements**: Handle agreements for members and users, including creation, acceptance, and rejection.
- **Payments**: Secure payment processing using Stripe for monthly rent collection.
- **Coupons**: Manage promotional coupons with CRUD functionality.
- **Announcements**: Post and retrieve announcements for users, members, or both.
- **Apartments**: View available apartments and their details.

## Client Side

- [Live Demo](https://structomate.web.app/)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

## API Endpoints

### Authentication

- **POST** `/api/login`: Login user and return a JWT.
- **POST** `/api/logout`: Logout user.

### Stripe Integration

- **POST** `/api/create-payment-intent`: Create a Stripe payment intent (requires JWT).

### Admin

- **POST** `/api/admin`: Fetch admin dashboard data (requires JWT).
- **POST** `/api/manageMembers`: Get all members (requires JWT).
- **POST** `/api/change/role`: Change user role (requires JWT).

### Coupons

- **POST** `/api/get/coupons`: Get all coupons (requires JWT).
- **POST** `/api/create/coupons`: Create a new coupon (requires JWT).
- **POST** `/api/delete/coupons`: Delete a coupon (requires JWT).

### Announcements

- **POST** `/api/get/userAnnouncement`: Get user announcements (requires JWT).
- **POST** `/api/get/memberAnnouncement`: Get member announcements (requires JWT).
- **POST** `/api/makeAnnouncement`: Create a new announcement (requires JWT).

### Agreements

- **POST** `/api/users/agreements`: Get user's pending agreements (requires JWT).
- **POST** `/api/member/agreements`: Get member's checked agreements (requires JWT).
- **POST** `/api/pending/agreements`: Get all pending agreements (requires JWT).
- **POST** `/api/accept/agreements`: Accept an agreement (requires JWT).
- **POST** `/api/reject/agreements`: Reject an agreement (requires JWT).
- **POST** `/api/create/agreements`: Create a new agreement (requires JWT).

### Apartments

- **GET** `/api/apartments`: Get all apartments.
- **GET** `/api/apartments/:id`: Get an apartment by ID.

### Users

- **GET** `/api/users/exists/:email`: Check if a user exists.
- **POST** `/api/users/:email`: Get user data by email (requires JWT).
- **POST** `/api/users`: Create a new user.

## Folder Structure

```
root
├── public
│   └── favicon.webp
├── .gitignore
├── .env
├── index.js
├── LICENSE
├── package.json
├── package-lock.json
└── Readme.md
└── vercel.json
```

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/Ajmain-Fayek/StructoMate-server.git
   cd StructoMate-server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add the following variables:

     ```env
     PORT=5000
     MONGO_URI=<your-mongodb-connection-string>
     STRIPE_SECRET_KEY=<your-stripe-secret-key>
     STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
     JWT_SECRET=<your-jwt-secret>
     ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the app in your browser at `http://localhost:<port>`.

## Usage

- Admins can manage users, agreements, and announcements.
- Members can view and accept agreements, make payments, and view announcements.
- The app provides a dashboard for easy navigation and management.

## Tech Stack

- **Frontend**: React.js, TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Payment Integration**: Stripe

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m "Add new feature"`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
