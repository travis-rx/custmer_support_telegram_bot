const bot = require('../../main/bot');
const { userState } = require('../../mongodb/sync_users');
const { vendor_q2 } = require('../keyboards');

async function vendor_start(chatId){

    let buttonClicked = userState[chatId].buttonClicked;

        try {

        let vendorQ2 = `Welcome to the XYZ support!\n\n*Choose the most appropriate*:

        *1*. I have question on how to use the service 
        *2*. I cannot find my product! 
        *3*. Other\n`

            if(buttonClicked = 'start'){
                
                bot.sendMessage(chatId, vendorQ2, {
                    reply_markup: vendor_q2,
                    parse_mode: 'Markdown'
                }).then((message) => {
        
                    userState[chatId].lastBotMessageId = message.message_id;
        
                });

            }

        } catch (error) {
            console.log(error);
        }

}

module.exports = { vendor_start };