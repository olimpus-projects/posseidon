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

app.listen(process.env.PORT || 4000);

console.log(`Server is on in port ${process.env.PORT}`);

export { app };