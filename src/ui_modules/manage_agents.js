const { agent_kb } = require('../keyboards');
const { userState, agents, admins, ensureUserExists, syncAgents } = require('../../mongodb/sync_users')
const bot = require('../../main/bot')


async function view_agents(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    await ensureUserExists(chatId);

    try{

        let lastBotMessageId = admin.lastBotMessageId;
        admin.buttonClicked = 'manage_agents'

        let message;

        if (agents.length === 0) {

            message = `No agents found!`;

        } 
        
        if (agents.length > 0 ) {

            let formattedMessage = '';
        
            agents.forEach((agent, index) => {

                const { userName, agentType, tier, available, banned, sessions } = agent;

                let onChat = 'No'
                let isActive = 'Active'

                if(!available){

                    onChat = 'Yes'
                }

                if(banned){

                    isActive = 'Paused'
                }


        
                formattedMessage += `*${index + 1}* \`@${userName}\` | ${agentType} | *Tier*: ${tier} | *OnChat*: ${onChat} | *Status*: ${isActive} | *Sessions*: ${sessions.length}\n\n`;
            });
        
            message = `\n*👑 List of agents who are active for the roles!*:\n\n${formattedMessage}\n\nReply with the id of the respective agent whome you wish to modify`;

        }

        console.log(message);
                  
            const back_to_manage ={

                inline_keyboard: [

                    [
                        {
                            text: `⬅ Back`,
                            callback_data: `${admin.buttonClicked}`
                        }
                    ]
                ]
            }

        if (lastBotMessageId === 0 && message) {
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: back_to_manage
            }).then((message) => {
                admin.lastBotMessageId = message.message_id;
            });
        } else if (lastBotMessageId > 0 && message) {
            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: lastBotMessageId,
                parse_mode: 'Markdown',
                reply_markup: back_to_manage,
            });
        }else{

            return
        }
        


    }catch(error){

        bot.sendMessage(chatId, error, {
            // reply_markup: buyKeyBoard,
            parse_mode: 'Markdown',
            // disable_web_page_preview: true
    
        });

    }


}

async function select_agent(chatId, ag_id){

    const admin = admins.find(admin => admin.chatId === chatId);

        const value = parseInt(ag_id);

        console.log("Value", value);

        if(!value){

            return

        }

            if(value > agents.length){

                bot.sendMessage(chatId, `❗Invalid agent Id`).then((message) => {
                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);
                });

                return

            }

                let agent = agents[value - 1];

                if(!agent){

                    return
                }

                const { userName, agentType, tier, available, banned, sessions } = agent;

                admin.a_id = value;

                let onChat = 'No'
                let isActive = 'Active'

                if(!available){

                    onChat = 'Yes'
                }

                if(banned){

                    isActive = 'Paused'
                }
        
                let message =  `\`@${userName}\`\n*Role*: ${agentType}\n*Tier*: ${tier}\n*OnChat*: ${onChat}\n*Paused*: ${isActive}\n*Active Sessions*: ${sessions.length}`;

                const kb = await agent_kb(chatId, agent.chatId);

                    if(userState[chatId].tempMsgId > 0){

                        try{

                            bot.deleteMessage(chatId, userState[chatId].tempMsgId);
                        }catch(error){

                            console.log(error.message);
                        }

                    }

                    bot.sendMessage(chatId, message, {
                        reply_markup: kb,
                        parse_mode: 'Markdown',
                    }).then((message) => {
                        userState[chatId].tempMsgId = message.message_id;

                        setTimeout(() => {
                            if(userState[chatId].tempMsgId > 0 && userState[chatId].tempMsgId === message.message_id){
                                bot.deleteMessage(chatId, userState[chatId].tempMsgId);
                                userState[chatId].tempMsgId = 0;
                            }

                        }, 45000);
                        return
                    });


                return
    
}

module.exports = { view_agents, select_agent }