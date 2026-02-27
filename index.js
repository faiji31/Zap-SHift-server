const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');


// middleware
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fyyyrd5.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();

    const db = client.db('zap_shift_db')
    const parcelsCollection = db.collection('parcels')


//     parcel api
app.get('/parcels',async(req,res)=>{

})

app.post('/parcels',async(req,res)=>{
      const parcel = req.body;
      const result = await parcelsCollection.insertOne(parcel)
      res.send(result)
})




   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Zap is Shiftinggggg!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
