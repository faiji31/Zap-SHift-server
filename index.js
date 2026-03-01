const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


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
      const query ={}

      const {email} = req.query;

      if(email){
            query.senderemail = email;
      }
      const options = {sort: {createdAt: -1}}
      const cursor = parcelsCollection.find(query,options)

     
      const result = await cursor.toArray();
      res.send(result)

})

app.get('/parcels/:id', async(req,res)=>{

  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await parcelsCollection.findOne(query)
  res.send(result)
})

app.post('/parcels',async(req,res)=>{
      const parcel = req.body;
      parcel.createdAt = new Date()
      const result = await parcelsCollection.insertOne(parcel)
      res.send(result)
})

app.delete('/parcels/:id',async(req,res)=>{
  const id = req.params.id;
  const query ={_id : new ObjectId(id)}


  const result = await parcelsCollection.deleteOne(query);
  res.send(result)

})



   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);


app.post('/create-checkout-session',async(req,res)=>{
  const PaymentInfo = req.body;
   const session = await stripe.checkout.sessions.create({
    line_items: [
      {
       
        price_data:{
          currency: 'USD',
          unit_amount:1500,
          product_data:{
            name:PaymentInfo.parcelname
          }
        },
       
        quantity: 1,
      },
    ],
     customerEmail : PaymentInfo.senderemail,
    mode: 'payment',

    success_url: `${process.env.SITE_DOMAIN }/dashboard/payment-success`,
  });
})

app.get('/', (req, res) => {
  res.send('Zap is Shiftinggggg!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
