const express = require("express");
const { MercadoPagoConfig, Payment, Preference } = require("mercadopago");
const { db } = require("./firebase.js");

const app = express();

app.use(express.json());
require("dotenv").config();
const client = new MercadoPagoConfig({
  accessToken: process.env.accessToken,
  options: { timeout: 5000, idempotencyKey: "abc" },
});

app.get("/ping", (req, res) => {
  res.json({ msg: "pong" });
});

app.get("/crear-orden/:userId", async (req, res) => {
  const { precioTotal } = req.body;
  const { userId } = req.params;

  const payment = new Preference(client);
  const result = await payment.create({
    body: {
      items: [
        {
          title: `Comida-${new Date().getMilliseconds()}`,
          quantity: 1,
          unit_price: precioTotal,
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: "https://mp-firebase-payment.onrender.com/success",
        failure: "https://mp-firebase-payment.onrender.com/failure",
        pending: "https://mp-firebase-payment.onrender.com/pending",
      },
      notification_url: "https://mp-firebase-payment.onrender.com/webhook",
      metadata: {
        firebaseId: userId,
      },
    },
  });

  return res.json(result);
});

app.get("/success", async (req, res) => {});
app.get("/failure", async (req, res) => {});
app.get("/pending", async (req, res) => {});
app.post("/webhook", async (req, res) => {
  try {
    const payment = req.query;
    if (payment.type === "payment") {
      const data = await new Payment(client).get({ id: payment["data.id"] });
      const pedidosRef = db
        .collection("pedidos")
        .where("usuario", "==", data.metadata.firebase_id)
        .where("pagado", "==", false);
      const snapshot = await pedidosRef.get();
      const pedidos = snapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() };
      });
      if (pedidos.length !== 1) {
        throw new Error("Error. Existe mas de un pedido sin estar pagado");
      }
      if (pedidos[0].pagado === false) {
        const pedidoRef = db.collection("pedidos").doc(pedidos[0].id);
        await pedidoRef.set(
          {
            pagado: true,
            estadoPago: data.status,
            mpPaymentId: payment["data.id"],
          },
          { merge: true }
        );
        return res.sendStatus(204);
      }
      throw new Error("Error. No se pudo procesar el pago");
    }
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

app.listen(4000, () => {
  console.log("Server en puerto 4000");
});
