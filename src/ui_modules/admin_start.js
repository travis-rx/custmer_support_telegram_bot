const { userState, chatLogs, admins } = require('../../mongodb/sync_users');
const { admin_keyboard } = require('../keyboards');
const bot = require('../../main/bot');

async function admin_start(chatId, message){

    try{

        const admin = admins.find(admin => admin.chatId === chatId);

        admin.lastBotMessageId = 0;
                    
            bot.sendMessage(chatId, message, {
                reply_markup: admin_keyboard,
                parse_mode: 'Markdown'
            });
        
            return

    }catch(error){

        console.log(error);
    }



}

module.exports = admin_start;