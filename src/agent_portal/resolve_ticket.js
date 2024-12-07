const { agents, chatLogs } = require('../../mongodb/sync_users');


async function resolve_ticket(agentId){

    try{

        const agent = agents.find(agent => agent.chatId === agentId);
        const sessionId = agent.sessionId;
    
        if(!agent || sessionId === '') { return };
    
        const session = chatLogs[sessionId]? chatLogs[sessionId][0] : null;
    
        if(session === null){ return }
    
        const { custId, agent1Id, agent2Id } = chatLogs[sessionId][0];

        chatLogs[sessionId].push({ from: 'agent', text: 'Resolve request sent!' });
    
        const message = `Add Note:`
    
        const sentMessage = await bot.sendMessage(chatId, message, {
            reply_markup: {
                force_reply: true
            }
        });
    
        const replyMsg = await new Promise((resolve) => {
            let messageResolved = false;
        
            const listener = (msg) => {
                if (!messageResolved && msg.chat.id === agentId && msg.message_id !== sentMessage.message_id) {
                    messageResolved = true;
                    resolve(msg);
                    return
                }
            };
        
            bot.on('message', listener);
        
            setTimeout(() => {
                if (!messageResolved) {
                    bot.removeListener('message', listener);
                    bot.deleteMessage(agentId, sentMessage.message_id);
                    resolve(null); 
                    return
                }
            }, 20 * 25000); 
    
        });
    
        if(!replyMsg.text){ return };
    
        chatLogs[sessionId][0].note = replyMsg.text;

    }catch(error){

        console.log(error);
    }


    
};


module.exports = resolve_ticket