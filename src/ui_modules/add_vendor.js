const { add_vendor_kb } = require('../keyboards/vendor');
const { userState, admins, set_vendor_info } = require('../../mongodb/sync_users')
const bot = require('../../main/bot')


async function add_vendor(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{

        admin.lastVisited = 'vendor_main'

        const addVendor_kb = await add_vendor_kb(chatId);
        const lastBotMessageId = admin.lastBotMessageId;

        let message = `Please add all the details of the vendor by clicking on the following buttons!`

            if(lastBotMessageId === 0){

                bot.sendMessage(chatId, message, {
                    reply_markup: addVendor_kb,
                    parse_mode: 'Markdown'
                });

            }
            
            if(lastBotMessageId > 0){

                bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: lastBotMessageId,
                    reply_markup: addVendor_kb,
                    parse_mode: 'Markdown',
                });

            }
        
            return

    }catch(error){

        console.log(error);
    }
    


}

module.exports = add_vendor;