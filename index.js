require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 8800;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const favicon = require("serve-favicon");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const jwt = require("jsonwebtoken");
const app = express();

// Midlewares
app.use(favicon(path.join(__dirname, "public", "favicon.webp")));
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());

// -----------------------------------------------------------------------------------
//                                     JWT Middleware                               //
// -----------------------------------------------------------------------------------
const verifyJWT = (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send("Invalid Token");
    }
    return next();
};

const uri = process.env.URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Data base
        const db = client.db("StructoMate");
        // Collections
        const usersCollection = db.collection("users");
        const apartmentsCollection = db.collection("apartments");
        const couponsCollection = db.collection("coupons");
        const transactionsCollection = db.collection("transactions");
        const agreementsCollection = db.collection("agreements");
        const announcementsCollection = db.collection("announcements");

        // --------------------------------------------------------------------------
        //                                 JWT Related APIs                        //
        // --------------------------------------------------------------------------
        app.post("/api/login", async (req, res) => {
            // console.log("client request for login: ", req.body);
            const { email } = req.body;
            const user = await usersCollection.findOne({ email });

            if (!user) {
                return res.status(401).send("Invalid username or email");
            }

            const token = jwt.sign(
                { userId: user._id, email: user.email },
                process.env.JWT_SECRET,
                {
                    expiresIn: "3h",
                }
            );

            res.status(200).json({ message: "Login successful", token });
        });

        app.post("/api/logout", (req, res) => {
            res.status(200).json({ message: "Logout successful" });
        });

        // --------------------------------------------------------------------------
        //                              Stripe Related APIs                        //
        // --------------------------------------------------------------------------

        app.post("/api/create-payment-intent", verifyJWT, async (req, res) => {
            try {
                const { rent } = req.body;

                if (!rent || isNaN(rent)) {
                    return res
                        .status(400)
                        .send({ error: "Invalid rent amount" });
                }

                const amount = Math.round(parseFloat(rent) * 100);

                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: "usd",
                    payment_method_types: ["card"],
                });

                res.status(200).send({
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (error) {
                res.status(500).send({
                    error: "Failed to create payment intent",
                    message: error.message,
                });
            }
        });

        // ---------------------------------------------------------------------------
        //                          Admin Data Related APIs                        //
        // ---------------------------------------------------------------------------

        // Admin Dashboard (profile) Data
        app.post("/api/admin", verifyJWT, async (req, res) => {
            const members = await usersCollection
                .find({ role: "member" })
                .toArray();
            const users = await usersCollection
                .find({ role: "user" })
                .toArray();
            const occuRooms = await agreementsCollection
                .find({ type: "member" })
                .toArray();
            const availableRooms = (
                ((10 - parseInt(occuRooms.length)) / 10) *
                100
            ).toFixed(2);
            const occupiedRooms = (
                (parseInt(occuRooms.length) / 10) *
                100
            ).toFixed(2);
            const adminData = {
                members: members.length,
                users: users.length,
                occupiedRooms,
                availableRooms,
                totalRooms: 10,
            };
            res.status(200).send(adminData);
        });

        // Get all Members (Admin)
        app.post("/api/manageMembers", verifyJWT, async (req, res) => {
            const result = await usersCollection
                .find({ role: "member" })
                .toArray();
            res.status(200).send(result);
        });

        // Manage Members (change role: <member to user>)
        app.post("/api/change/role", verifyJWT, async (req, res) => {
            const { id } = req.body;
            if (!ObjectId.isValid(id)) {
                return res
                    .status(400)
                    .send({ status: 400, message: "Invalid ID" });
            }
            const query = { _id: new ObjectId(id) };
            const data = { $set: { role: "user" } };
            const result = await usersCollection.updateOne(query, data);

            res.status(200).send(result);
        });

        // ---------------------------------------------------------------------------
        //                           Coupons Related APIs                            //
        // ---------------------------------------------------------------------------

        //  Get All Coupons
        app.post("/api/get/coupons", verifyJWT, async (req, res) => {
            try {
                const result = await couponsCollection
                    .find({})
                    .sort({ validity: -1 })
                    .toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(500).send({
                    message: "internal Server Error",
                    error,
                });
            }
        });

        // Create a new Coupon
        app.post("/api/create/coupons", verifyJWT, async (req, res) => {
            const { newCoupon } = req.body;
            try {
                const result = await couponsCollection.insertOne(newCoupon);
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({
                    message: "internal Server Error",
                    error,
                });
            }
        });

        // Delete a Coupon
        app.post("/api/delete/coupons", verifyJWT, async (req, res) => {
            const { id } = req.body;
            if (!ObjectId.isValid(id)) {
                return res
                    .status(400)
                    .send({ status: 400, message: "Invalid ID" });
            }
            const query = { _id: new ObjectId(id) };
            try {
                const result = await couponsCollection.deleteOne(query);
                res.status(200).send(result);
            } catch (error) {
                res.status(500).send({
                    message: "internal Server Error",
                    error,
                });
            }
        });

        // ---------------------------------------------------------------------------
        //                         Announcement Related APIs                         //
        // ---------------------------------------------------------------------------

        // Get User Announcements (user and all)
        app.post("/api/get/userAnnouncement", verifyJWT, async (req, res) => {
            try {
                const results = await announcementsCollection
                    .find({ $or: [{ type: "user" }, { type: "all" }] })
                    .sort({ date: -1 })
                    .toArray();

                res.status(200).send(results);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get Member Announcement (member and all)
        app.post("/api/get/memberAnnouncement", verifyJWT, async (req, res) => {
            try {
                const results = await announcementsCollection
                    .find({ $or: [{ type: "member" }, { type: "all" }] })
                    .sort({ date: -1 })
                    .toArray();

                res.status(200).send(results);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Create a new Announcement (For Admin)
        app.post("/api/makeAnnouncement", verifyJWT, async (req, res) => {
            const { newAnnouncement } = req.body;
            try {
                const result = await announcementsCollection.insertOne(
                    newAnnouncement
                );
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({
                    message: "Internal Server Error",
                    error,
                });
            }
        });

        // ---------------------------------------------------------------------------
        //                          Agreements Related APIs                          //
        // ---------------------------------------------------------------------------

        // Get User Pending Agreement
        app.post("/api/users/agreements", verifyJWT, async (req, res) => {
            const { tenantEmail, tenant_id } = req.body;
            const result = await agreementsCollection.findOne({
                tenantEmail,
                tenant_id,
                type: "user",
                status: "pending",
            });

            if (result !== null) {
                return res.status(200).send({
                    status: 200,
                    result,
                });
            }
            res.status(400).send({
                status: 400,
                message: "No agreement Found",
            });
        });
        // Get Member Checked Agreement
        app.post("/api/member/agreements", verifyJWT, async (req, res) => {
            const { tenantEmail, tenant_id } = req.body;
            const result = await agreementsCollection.findOne({
                tenantEmail,
                tenant_id,
                type: "member",
                status: "checked",
            });

            if (result !== null) {
                return res.status(200).send({
                    status: 200,
                    result,
                });
            }
            res.status(400).send({
                status: 400,
                message: "No agreement Found",
            });
        });

        // Get All Pending Agreements
        app.post("/api/pending/agreements", verifyJWT, async (req, res) => {
            try {
                const results = await agreementsCollection
                    .find({ status: "pending" })
                    .sort({ agreementSigningDate: -1 })
                    .toArray();

                res.status(200).send(results);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Accept a Agreement
        app.post("/api/accept/agreements", verifyJWT, async (req, res) => {
            const { tenant_id, agreement_id, agreementCheckedDate } = req.body;

            // Validate IDs
            if (
                !ObjectId.isValid(tenant_id) ||
                !ObjectId.isValid(agreement_id)
            ) {
                return res
                    .status(400)
                    .send({ status: 400, message: "Invalid ID" });
            }

            const tenantQuery = { _id: new ObjectId(tenant_id) };
            const tenantUpdate = { $set: { role: "member" } };

            const agreementQuery = { _id: new ObjectId(agreement_id) };
            const agreementUpdate = {
                $set: {
                    status: "checked",
                    agreementCheckedDate: agreementCheckedDate,
                    type: "member",
                },
            };

            try {
                // Update tenant role
                const tenantResult = await usersCollection.updateOne(
                    tenantQuery,
                    tenantUpdate
                );

                // Update agreement status and set agreementChecked date
                const agreementResult = await agreementsCollection.updateOne(
                    agreementQuery,
                    agreementUpdate
                );

                // Send a combined response
                return res.status(200).send({
                    status: 200,
                    message: "Successfully updated",
                    tenantUpdateResult: tenantResult,
                    agreementUpdateResult: agreementResult,
                });
            } catch (error) {
                console.error("Error updating documents:", error);
                return res
                    .status(500)
                    .send({ message: "Internal Server Error" });
            }
        });

        // Reject a Agreement
        app.post("/api/reject/agreements", verifyJWT, async (req, res) => {
            const { agreement_id, agreementCheckedDate } = req.body;

            // Validate IDs
            if (!ObjectId.isValid(agreement_id)) {
                return res
                    .status(400)
                    .send({ status: 400, message: "Invalid ID" });
            }

            const agreementQuery = { _id: new ObjectId(agreement_id) };
            const agreementUpdate = {
                $set: {
                    status: "checked",
                    agreementCheckedDate: agreementCheckedDate,
                },
            };

            try {
                // Update agreement status and set agreementChecked date
                const agreementResult = await agreementsCollection.updateOne(
                    agreementQuery,
                    agreementUpdate
                );

                // Send a combined response
                return res.status(200).send({
                    status: 200,
                    message: "Successfully updated",
                    agreementUpdateResult: agreementResult,
                });
            } catch (error) {
                console.error("Error updating documents:", error);
                return res
                    .status(500)
                    .send({ message: "Internal Server Error" });
            }
        });

        // Create a new Agreement(For User)
        app.post("/api/create/agreements", verifyJWT, async (req, res) => {
            const { newAgreement } = req.body;
            newAgreement["status"] = "pending";
            newAgreement["type"] = "user";
            const { tenantEmail, tenant_id, tenantRole } = newAgreement;

            if (tenantRole === "member") {
                return res.status(401).send({
                    status: 401,
                    message: "You are already a member",
                });
            }
            if (tenantRole === "admin") {
                return res.status(401).send({
                    status: 401,
                    message: "Admin Cannot sign an agreement",
                });
            }
            const isExist = await agreementsCollection.findOne({
                tenantEmail,
                tenant_id,
                type: "user",
                status: "pending",
            });

            if (isExist === null) {
                try {
                    const result = await agreementsCollection.insertOne(
                        newAgreement
                    );
                    res.status(201).send(result);
                } catch (error) {
                    res.status(500).send({
                        message: "Failed to create agreement",
                        error,
                    });
                }
            } else {
                return res.status(401).send({
                    status: 401,
                    message: "Already signed an Agreement",
                });
            }
        });

        // ---------------------------------------------------------------------------
        //                    Payments/Transaction Related APIs                     //
        // ---------------------------------------------------------------------------

        app.post("/api/save/transaction", verifyJWT, async (req, res) => {
            const { transaction } = req.body;
            const result = await transactionsCollection.insertOne(transaction);
            res.status(201).send(result);
        });

        app.post("/api/get/transactions", verifyJWT, async (req, res) => {
            const { email, userId } = req.body;
            const result = await transactionsCollection
                .find({ email, userId })
                .sort({ date: -1 })
                .toArray();
            res.status(200).send(result);
        });

        // ---------------------------------------------------------------------------
        //                          Apartments Related APIs                         //
        // ---------------------------------------------------------------------------

        // Get All Apartments
        app.get("/api/apartments", async (req, res) => {
            const result = await apartmentsCollection.find({}).toArray();

            if (!result) {
                return res
                    .status(404)
                    .send({ status: 404, message: "Not Found" });
            }
            res.status(200).send({ status: 200, result });
        });

        // Get Apartment by ID
        app.get("/api/apartments/:id", async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res
                    .status(400)
                    .send({ status: 400, message: "Invalid ID" });
            }
            const _id = { _id: new ObjectId(id) };
            const result = await apartmentsCollection.findOne(_id);
            if (!result) {
                return res
                    .status(404)
                    .send({ status: 404, message: "Not Found" });
            }
            res.status(200).send({ status: 200, result });
        });

        // ---------------------------------------------------------------------------
        //                            User Related APIs                              //
        // ---------------------------------------------------------------------------

        // Check if user exists
        app.get("/api/users/exists/:email", async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            if (result === null) {
                return res.status(400).send({ status: false });
            }
            res.status(200).send({ status: true });
        });

        // Get User by Email
        app.post("/api/users/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne(
                { email },
                {
                    projection: {
                        displayName: 1,
                        email: 1,
                        photoURL: 1,
                        role: 1,
                        _id: 1,
                    },
                }
            );
            res.status(200).json(result);
        });

        // Create a new User
        app.post("/api/users", async (req, res) => {
            const newUser = req.body;
            newUser["role"] = "user";
            const result = await usersCollection.insertOne(newUser);
            res.status(201).json(result);
        });
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

// Default API
app.get("/", (req, res) => {
    res.status(200).send({ status: 200, message: "StructoMate Default API" });
});

// Start the server
app.listen(port, () => {
    console.log("StructoMate server running at: ", port);
});

// Connect to the MongoDB cluster
run().catch(console.dir);
