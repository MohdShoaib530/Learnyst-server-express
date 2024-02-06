import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
dotenv.config();
const app = express();


// built in middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// third party middleware
app.use(
    cors({
        origin:process.env.FRONTEND_URL,
        credentials:true
    })
);

app.use(morgan("dev"));
app.use(cookieParser());

app.get("/time", async (_req, res) => {
    res.status(200).json("Running very fastly");
});

// default catch for all the other routes

app.use("*", async(_req,res) => {
    res.status(404).json("404 page not found");
});

// custom error handeling middleware

// app.use(errorMiddleware);

export default app;


