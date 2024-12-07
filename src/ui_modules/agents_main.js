const { manage_agents_kb } = require('../keyboards');
const { userState, ensureUserExists, admins } = require('../../mongodb/sync_users')
const bot = require('../../main/bot')


async function agents_main(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{

        await ensureUserExists(chatId);

        const lastBotMessageId = admin.lastBotMessageId;

        let message = `Manage agents with the following options`

        console.log("Last bot msg id", lastBotMessageId);

        if(lastBotMessageId === 0){

            bot.sendMessage(chatId, message, {
                reply_markup: manage_agents_kb,
                parse_mode: 'Markdown'
            }).then((message) => {

                admin.lastBotMessageId = message.message_id;

            });

        }

        if(lastBotMessageId > 0){


            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: lastBotMessageId,
                reply_markup: manage_agents_kb,
                parse_mode: 'Markdown'
            });

        }
        
            return

    }catch(error){

        console.log(error);
    }
    


}

module.exports = agents_main;