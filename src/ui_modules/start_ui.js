const bot = require('../../main/bot');
const { userState } = require('../../mongodb/sync_users');
const { cust_q1 } = require('../keyboards');

async function start(chatId){

    let buttonClicked = userState[chatId].buttonClicked;

        try {

        let welcomeMessage = `Welcome to the XYZ support!\n\n*Choose the most appropriate*:

        *1*. I want to buy first time
        *2*. I am a regular customer\n`

            if(buttonClicked = 'start'){
                
                bot.sendMessage(chatId, welcomeMessage, {
                    reply_markup: cust_q1,
                    parse_mode: 'Markdown'
                }).then((message) => {
        
                    userState[chatId].lastBotMessageId = message.message_id;
        
                });

            }

        } catch (error) {
            console.log(error);
        }

}

module.exports = { start };