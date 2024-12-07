const { create_session_kb } = require('../keyboards/session');
const { userState, admins } = require('../../mongodb/sync_users')
const bot = require('../../main/bot')


async function create_new_session(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{

        admin.lastVisited = 'create_session'

        const session_kb = await create_session_kb(chatId);
        const lastBotMessageId = admin.lastBotMessageId;

        let message = `Add customer and vendor user name starts with @`

            if(lastBotMessageId === 0){

                bot.sendMessage(chatId, message, {
                    reply_markup: session_kb,
                    parse_mode: 'Markdown'
                }).then((message) =>
                {
                    admin.lastBotMessageId = message.message_id;

                }
                );
            }
            
            if(lastBotMessageId > 0){

                bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: lastBotMessageId,
                    reply_markup: session_kb,
                    parse_mode: 'Markdown'
                });

            }

            return

    }catch(error){

        console.log(error);
    }
    
}


module.exports = { create_new_session };