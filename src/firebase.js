const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("../mp-firebase-payment-firebase-adminsdk-rnrhk-5aeb1d46f2.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

module.exports = { db };
