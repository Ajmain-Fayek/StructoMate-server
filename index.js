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
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());

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

        app.get("/api/apartments", async (req, res) => {
            const result = await apartmentsCollection.find({}).toArray();

            if (!result) {
                return res
                    .status(404)
                    .send({ status: 404, message: "Not Found" });
            }
            res.status(200).send({ status: 200, result });
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
