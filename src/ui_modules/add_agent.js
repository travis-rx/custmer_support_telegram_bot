const { add_agent_kb } = require('../keyboards');
const { userState, admins } = require('../../mongodb/sync_users')
const bot = require('../../main/bot')


async function add_agent(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);
    
    try{

        admin.lastVisited = 'agent_main'

        const addAgent_kb = await add_agent_kb(chatId);
        const lastBotMessageId = admin.lastBotMessageId;

        let message = `Please add all the details of the agent by clicking on the following buttons!`

            if(lastBotMessageId === 0){

                bot.sendMessage(chatId, message, {
                    reply_markup: addAgent_kb,
                    parse_mode: 'Markdown'
                });

            }else if(lastBotMessageId > 0){

                bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: lastBotMessageId,
                    reply_markup: addAgent_kb,
                    parse_mode: 'Markdown',
                });

            }
        
            return

    }catch(error){

        console.log(error);
    }
    


}

module.exports = add_agent;