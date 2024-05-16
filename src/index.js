import dotenv from 'dotenv';
dotenv.config()
import envVar from './configs/config.js'
import app from './app.js';
import connectToDb from './configs/dbConn.js';

connectToDb()
    .then(() => {
        app.on('error', (err) => {
            console.log('Error', err);
        });

        app.listen(envVar.port, async () => {
            console.log(`Server is running on port ${envVar.port}`);
        });
    })
    .catch((error) => {
        console.log('Something went wrong while connecting to db', error);
    });
