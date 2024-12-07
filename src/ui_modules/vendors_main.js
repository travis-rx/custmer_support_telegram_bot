const { manage_vendors_kb } = require('../keyboards/vendor');
const { userState, ensureUserExists, admins } = require('../../mongodb/sync_users')
const bot = require('../../main/bot')


async function vendors_main(chatId){

    console.log("Triggered Vendor Main");
    
    try{

        await ensureUserExists(chatId);

        const admin = admins.find(admin => admin.chatId === chatId);

        const lastBotMessageId = admin.lastBotMessageId;

        let message = `Manage vendors with the following options`

            if(lastBotMessageId === 0){

                await bot.sendMessage(chatId, message, {
                    reply_markup: manage_vendors_kb,
                    parse_mode: 'Markdown'
                }).then((message => {

                    admin.lastBotMessageId = message.message_id;

                }
                ));


            }else if(lastBotMessageId > 0){

                bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: lastBotMessageId,
                    reply_markup: manage_vendors_kb,
                    parse_mode: 'Markdown',
                });

            }
        
            return

    }catch(error){

        console.log(error);
    }
    


}

module.exports = vendors_main;