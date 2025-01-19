require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 8800;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const favicon = require("serve-favicon");
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

// ---------------------------------------------
// JWT Middleware
// ---------------------------------------------
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

        // ---------------------------------------------
        // JWT Related APIs
        // ---------------------------------------------
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

        // ---------------------------------------------
        // Agreements Related APIs
        // ---------------------------------------------
        app.post(
            "/api/users/agreements",
            verifyJWT,
            async (req, res) => {
                const { tenantEmail } = req.body;
                const result = await agreementsCollection
                    .find({ tenantEmail })
                    .toArray();
                if (result.length >= 1) {
                    return res.status(200).send({
                        status: 200,
                        agreementFound: result.length,
                        result,
                    });
                }
                res.status(400).send({
                    status: 400,
                    message: "No agreement Found",
                });
            }
        );
        app.post("/api/agreements", verifyJWT, async (req, res) => {
            const { newAgreement } = req.body;
            newAgreement["status"] = "pending";
            newAgreement["type"] = "user";
            const { tenantEmail, apartmentDetails } = newAgreement;
            const isExist = await agreementsCollection.findOne({
                tenantEmail,
                "apartmentDetails._id": apartmentDetails?._id,
                "apartmentDetails.apartmentNo": apartmentDetails?.apartmentNo,
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
                return res
                    .status(401)
                    .send({ status: 401, message: "Already signed" });
            }
        });

        // ---------------------------------------------
        // Apartments Related APIs
        // ---------------------------------------------
        app.get("/api/apartments", async (req, res) => {
            const result = await apartmentsCollection.find({}).toArray();

            if (!result) {
                return res
                    .status(404)
                    .send({ status: 404, message: "Not Found" });
            }
            res.status(200).send({ status: 200, result });
        });

        app.get("/api/apartments/:id", async (req, res) => {
            // console.log("client hitting");
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

        // ---------------------------------------------
        // User Related APIs
        // ---------------------------------------------
        app.get("/api/users/exists/:email", async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            if (result === null) {
                return res.status(400).send({ status: false });
            }
            res.status(200).send({ status: true });
        });
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

app.get("/", (req, res) => {
    res.status(200).send({ status: 200, message: "StructoMate Default API" });
});

app.listen(port, () => {
    console.log("StructoMate server running at: ", port);
});
run().catch(console.dir);
