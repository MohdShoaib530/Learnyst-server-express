import app from "./app.js";

app.listen(process.env.PORT, async () => {
    // eslint-disable-next-line no-console
    console.log(`app is listening on port ${process.env.PORT}`);
});
