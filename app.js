const { Client, LegacySessionAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const socketIO = require('socket.io');
const http = require("http");


const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 5000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_FILE_PATH = './session.json';

// Load the session data if it has been previously saved
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
    authStrategy: new LegacySessionAuth({
        session: sessionData
    }),
    puppeteer: { args: ["--no-sandbox"] }
});
client.initialize();


app.get('/', function (req, res) {
    res.sendFile('index.html', { root: __dirname });
})


// client.on('message', message => {
//     console.log(message.body);
// });


io.on('connection', function (socket) {
    socket.emit('message', 'Connecting....');

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code Received, Scan please!!!!');
        });
    });
    // Save session values to the file upon successful auth
    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Whatsapp is authenticated!');
        socket.emit('message', 'Whatsapp is authenticated!');

        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
            if (err) {
                console.error(err);
            }
        });
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        socket.emit('message', 'Whatsapp is ready!');
        socket.emit('ready', 'Whatsapp is ready!');
        // console.log('Ready');
    });


    client.on('auth_failure', function () {
        console.log('auth fail');
        socket.emit('message', 'Whatsapp auth failed!');

        fs.unlinkSync(SESSION_FILE_PATH, function (err) {
            if (err) return console.log(err);
            console.log('Session file deleted!');
        });

        client.initialize();
    });

    client.on('disconnected', () => {
        console.log('disconected');
        socket.emit('message', 'Whatsapp is disconected');

        fs.unlinkSync(SESSION_FILE_PATH, function (err) {
            if (err) return console.log(err);
            console.log('Session file deleted!');
            socket.emit('message', 'Session file deleted!');

        });

        client.initialize();

    });

    client.on('message', message => {
        socket.emit('message', message.body);

    });
});

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
