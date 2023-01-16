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

  const validation = usersSchema.validate(name, { abortEarly: false });

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
  }
});

app.listen(5000, () => {
  console.log("server online, rodando na port5000");
});
