require('dotenv').config();
import express from 'express'
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded());

app.use(bodyParser.json());                        
app.use(bodyParser.urlencoded({ extended: true }));

export { app };


