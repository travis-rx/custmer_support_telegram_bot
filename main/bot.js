const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config')

const BOT_TOKEN = config.BOT_TOKEN;

let bot;

try{

    bot = new TelegramBot(BOT_TOKEN, { polling: true, });
    
}catch(error){
    console.log(error);
}


module.exports = bot;