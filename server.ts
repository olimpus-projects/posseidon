import { app } from "./src/app";

app.listen(process.env.PORT || 4000);

console.log(`Server is on in port ${process.env.PORT}`);