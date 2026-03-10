require('dotenv').config()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const app = express()
const port = process.env.PORT || 5000
const crypto = require('crypto')


function generateTrackingId(){
  const prefix = "PRCL"
  const date = new Date().toISOString().slice(0,10).replace(/-/g,"")
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()

  return`${prefix}-${date}-${random}`
}

app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fyyyrd5.mongodb.net/?appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})

let parcelsCollection
let paymentCollection

async function run() {
  try {

    await client.connect()

    const db = client.db('zap_shift_db')
    parcelsCollection = db.collection('parcels')
    paymentCollection = db.collection('payments')


    console.log("✅ MongoDB Connected")

  } catch (error) {
    console.log(error)
  }
}

run()

/* ================= PARCEL APIs ================= */

app.get('/parcels', async (req, res) => {

  const query = {}
  const { email } = req.query

  if (email) {
    query.senderemail = email
  }

  const options = { sort: { createdAt: -1 } }

  const result = await parcelsCollection.find(query, options).toArray()

  res.send(result)
})

app.get('/parcels/:id', async (req, res) => {

  const id = req.params.id
  const query = { _id: new ObjectId(id) }

  const result = await parcelsCollection.findOne(query)

  res.send(result)
})

app.post('/parcels', async (req, res) => {

  const parcel = req.body
  parcel.createdAt = new Date()

  const result = await parcelsCollection.insertOne(parcel)

  res.send(result)
})

app.delete('/parcels/:id', async (req, res) => {

  const id = req.params.id
  const query = { _id: new ObjectId(id) }

  const result = await parcelsCollection.deleteOne(query)

  res.send(result)
})

/* ================= STRIPE PAYMENT ================= */

app.post('/create-checkout-session', async (req, res) => {

  try {

    const paymentInfo = req.body

    const amount = parseFloat(paymentInfo.cost) * 100

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ['card'],

      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name: paymentInfo.parcelname
            }
          },
          quantity: 1
        }
      ],

      mode: 'payment',

      customer_email: paymentInfo.senderemail,

      metadata: {
        parcelId: paymentInfo.parcelId,
        parcelName: paymentInfo.parcelname
      },

      success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel`
    })

    res.send({ url: session.url })

  } catch (error) {

    console.log(error)
    res.status(500).send({ error: error.message })

  }
})

/* ================= PAYMENT SUCCESS ================= */

app.patch('/payment-success', async (req, res) => {

  try {

    const sessionId = req.query.session_id

    if (!sessionId) {
      return res.send({ success: false })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const transactionId = session.payment_intent
    const query = { transactionId: transactionId }

    const paymentExist = await paymentCollection.findOne(query)
    console.log(paymentExist)

    if(paymentExist){
      return res.send({message:"already exist", transactionId, trackingId:paymentExist.trackingId})
    }

    if (session.payment_status === 'paid') {

      const parcelId = session.metadata.parcelId
      const trackingId = generateTrackingId()

      const query = { _id: new ObjectId(parcelId) }

      const update = {
        $set: {
          paymentStatus: "paid",
          trackingId: trackingId
        }
      }

      const result = await parcelsCollection.updateOne(query, update)

      const payment = {
        amount: session.amount_total / 100,
        currency: session.currency,
        customerEmail: session.customer_email,
        parcelId: parcelId,
        parcelName: session.metadata.parcelName,
        transactionId: session.payment_intent,
        paymentStatus: session.payment_status,
        paidAt: new Date(),
        trackingId:trackingId
      }

      const resultPayment = await paymentCollection.insertOne(payment)

      res.send({
        success: true,
        transactionId: session.payment_intent,
        trackingId: trackingId
      })

    } else {
      res.send({ success: false })
    }

  } catch (error) {

    console.log(error)
    res.status(500).send({ error: error.message })

  }

})

app.get('/', (req, res) => {
  res.send('Zap is Shiftinggggg!')
})

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`)
})