import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URI);

let db;

const usersSchema = joi.object({
  name: joi.string().min(2).max(20).required(),
});

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().min(2).required(),
    text: joi.string().min(1).required(),
    type: joi.string().required().valid("message", "private_message"),
    time: joi.string(),
})

try {
  await mongoClient.connect();
  db = mongoClient.db();
} catch (error) {
  console.log("deu erro 500 server mongo");
}

const app = express();
app.use(express.json());
app.use(cors());

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validation = usersSchema.validate({ name }, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.send(errors);
  }

  const entryMessage = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };
  try {
    const participant = {
      name,
      lastStatus: Date.now(),
    };

    const participantExists = await db
      .collection("participants")
      .findOne({ name });

    if (participantExists)
      return res.status(409).send("Essa pessoa já está cadastrada!");

    await db.collection("participants").insertOne(participant);

    await db.collection("messages").insertOne(entryMessage);

    res.status(201).send("ok");
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participant = await db.collection("participants").find().toArray();

    if (!participant) return res.sendStatus(404);

    res.send(participant);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  const message = {
    from: user,
    to,
    text,
    type,
    time: dayjs().format("HH:mm:ss"),
  }

  try {
    const validation = messageSchema.validate(message, {abortEarly:false});

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        res.status(422).send(errors);
    }

    await db.collection("messages").insertOne(message);

    res.status(201).send('beleza...')

  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.get("messages", async (req, res) => {
    try{
    const messages = await db.collection("messages").find().toArray();

    res.send(messages)        
    }catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
})

app.listen(5000, () => {
  console.log("server online, rodando na port5000");
});
