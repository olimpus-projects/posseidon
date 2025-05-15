import app from "./service/app";


require('dotenv').config();


app.listen(process.env.PORT || 4000);

console.log(`Server is on in port ${process.env.PORT}`);