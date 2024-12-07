const bot = require('../../main/bot')
const { syncVendors, agents, vendors, chatLogs, userState, ensureUserExists } = require('../../mongodb/sync_users')
const { inviteKeyboard } = require('../../src/keyboards');
const { vendor_list } = require('../ui_modules/add_vendor_session');


async function invite_vendor(chatId){

    try{

        await ensureUserExists(chatId);

        const agent = agents.find(agent => agent.chatId === chatId);

        const sessionId = agent.sessionId;

        const sessionInfo = chatLogs[sessionId]? chatLogs[sessionId][0] : null;

        userState[chatId].lastBotMessageId = 0;

        console.log("Session Info", sessionInfo);
    
        if(!sessionInfo){ return };
    
        const photoAvailable = sessionInfo.photos[0]? sessionInfo.photos[0] : null;

        console.log(photoAvailable);
    
        if(!photoAvailable || sessionInfo.photos.length === 0){
    
            bot.sendMessage(chatId, `Please get the product photo from the customer!`).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });
    
            return
    
        }
    
        const message = `Enter the Product Name and Quantity:`
    
        const sentMessage = await bot.sendMessage(chatId, message, {
            reply_markup: {
                force_reply: true
            }
        });
    
        const replyMsg = await new Promise((resolve) => {
            let messageResolved = false;

            const listener = (msg) => {

                if (!messageResolved && msg.chat.id === chatId && msg.message_id !== sentMessage.message_id) {
                    messageResolved = true;
                    resolve(msg);
                    vendor_list(chatId);
                    return
                }

                bot.deleteMessage(chatId, msg.message_id);
                bot.deleteMessage(chatId, sentMessage.message_id);

            };
        
            bot.on('message', listener);
        
            setTimeout(() => {

                if (!messageResolved) {

                    bot.removeListener('message', listener);
                    bot.deleteMessage(chatId, sentMessage.message_id);
                    resolve(null); 
                    return
                }

            }, 25 * 1000); 
    
        });    


    }catch(error){

        console.log(error);
    }



}

module.exports = invite_vendor;