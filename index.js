const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const app = express()
app.use(cors())
app.use(express.json())


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@cluster0.7maoij4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

async function run() {
    try {
        client = new MongoClient(uri)
        client.connect();
        const database = client.db("ElectroAmbitionDB");
        const ProductsCollection = database.collection("ProductsCollection");
        const ReviewCollection = database.collection("ReviewCollection")


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { Email: email }
            const user = await UserCollection.findOne(query);
            if (user?.Role !== 'admin') {
                return res.status(403).send({ error: true, message: 'Forbidden User' });
            }
            next()
        }

        app.get('/products/:category', async (req, res) => {
            const category = req.params.category || 'all';
            const sort = req.query.sort;
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 12;
            const skip = page * limit;

            let query = { category: category };
            let sortQuery = {};

            if (category === 'all') {
                query = {};
            }

            if (sort === 'latest') {
                sortQuery = { date: -1 };
            } else if (sort === 'bestSelling') {
                sortQuery = { sold: -1 };
            } else if (sort === 'bestRating') {
                sortQuery = { rating: -1 };
            } else if (sort === 'lowPrice') {
                sortQuery = { price: 1 };
            } else if (sort === 'highPrice') {
                sortQuery = { price: -1 };
            }

            const result = await ProductsCollection.find(query)
                .sort(sortQuery)
                .skip(skip)
                .limit(limit)
                .toArray();

            res.send(result);
        });


        app.get('/totalProducts/:category', async (req, res) => {
            const category = req.params.category;
            let query = { category: category };

            if (category == 'all') {
                query = {};
            }

            const result = await ProductsCollection.countDocuments(query);
            res.send({ totalProduct: result })
        })

        app.get('/categories', async (req, res) => {
            const categories = await ProductsCollection.distinct("category");
            res.send({ categories: categories });

        })

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;

            const result = await ProductsCollection.findOne({ _id: new ObjectId(id) })
            res.send(result);
        })

        //Review
        app.get('/reviews/:productCode', async (req, res) => {
            const productCode = req.params.productCode;

            const result = await ReviewCollection.find({ product_code: productCode }).toArray()
            res.send(result);
        })

        app.post('/reviews/:productCode', async (req, res) => {
            const productCode = req.params.productCode;
            const review = req.body

            const result = await ReviewCollection.insertOne(review)
            res.send(result);
        })

        //Cart
        app.post('/cartsProduct', async (req, res) => {
            const P_Codes = req.body.P_Codes;
            console.log(P_Codes);
          
            const productIds = P_Codes;
            const result = await ProductsCollection.find({ product_code: { $in: productIds } }).toArray();
            res.json(result);
          });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Welcome to ElectroAmbition-Server!');
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})


