const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('cron');
require('dotenv').config();

let hasReplied = false; // Melacak apakah pengguna telah merespons

const targetNumber = process.env.TARGET_NUMBER;

// Inisialisasi WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Silakan scan QR Code berikut di WhatsApp Web:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot telah siap! WhatsApp Web terhubung.');
});

const sendReminder = (message) => {
    hasReplied = false; // Reset status balasan
    client.sendMessage(`${targetNumber}@c.us`, message)
        .then(() => {
            console.log(`Pesan terkirim: "${message}"`);

            setTimeout(() => {
                if (!hasReplied) {
                    client.sendMessage(`${targetNumber}@c.us`, 'Kuharap kamu makan agar gerdmu tidak kambuh.')
                        .then(() => console.log('Pesan lanjutan terkirim karena tidak ada balasan.'))
                        .catch((err) => console.error('Gagal mengirim pesan lanjutan:', err));
                }
            }, 60 * 60 * 1000); // 1 jam
        })
        .catch((err) => console.error('Gagal mengirim pesan:', err));
};

const reminders = [
    { schedule: '30 11 * * *', message: 'Sudah makan cemilanmu? Jawab dengan "Sudah" atau "Belum".' },
    { schedule: '30 12 * * *', message: 'Sudah makan siang? Jawab dengan "Sudah" atau "Belum".' },
    { schedule: '0 19 * * *', message: 'Sudah makan malam? Jawab dengan "Sudah" atau "Belum".' },
    { schedule: '0 12 */2 * *', message: 'Jangan lupa minum obat alergimu siang ini! Jawab dengan "Sudah" atau "Belum".' },
    { schedule: '0 19 */2 * *', message: 'Jangan lupa minum obat alergimu malam ini! Jawab dengan "Sudah" atau "Belum".' },
];


reminders.forEach((reminder) => {
    const job = new cron.CronJob(reminder.schedule, () => {
        sendReminder(reminder.message);
    });
    job.start();
});

client.on('message', (msg) => {
    if (msg.from === `${targetNumber}@c.us`) {
        const response = msg.body.toLowerCase();

        // Menandai bahwa pengguna sudah merespons
        hasReplied = true;

        // Balasan untuk "Sudah"
        if (response === 'sudah') {
            if (msg.body.includes('obat')) {
                msg.reply('Bagus! Jangan lupa terus minum obat sesuai jadwal ya. 😊');
            } else {
                msg.reply('Bagus! Terima kasih sudah menjaga pola makan dan kesehatanmu. 😊');
            }
        } 
        
        // Balasan untuk "Belum"
        else if (response === 'belum') {
            if (msg.body.includes('obat')) {
                msg.reply('Ayo segera minum obatnya agar alergimu tidak kambuh. 💊');
            } else {
                msg.reply('Ayo segera makan sebelum terlambat! 🍴');
            }

            // Reminder ulang setelah 5 menit
            setTimeout(() => {
                const reminderMessage = msg.body.includes('obat') 
                    ? 'Sudah minum obatmu? Jawab dengan "Sudah" atau "Belum".'
                    : 'Sudah makan atau minum obatmu? Jawab dengan "Sudah" atau "Belum".';
                client.sendMessage(`${targetNumber}@c.us`, reminderMessage)
                    .then(() => console.log('Reminder ulang terkirim.'))
                    .catch((err) => console.error('Gagal mengirim reminder ulang:', err));
            }, 5 * 60 * 1000); // 5 menit
        } 
        
        // Balasan default
        else {
            msg.reply('Saya tidak mengerti. Jawab dengan "Sudah" atau "Belum".');
        }
    }
});


client.initialize();
