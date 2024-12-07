const { agents, chatLogs, vendors } = require('../../mongodb/sync_users');
const bot = require('../../main/bot')


async function remove_vendor(chatId){

    try{

        const agent = agents.find(agent => agent.chatId === chatId);
    
        if(!agent) { return };

        const sessionId = agent.sessionId? agent.sessionId : '';

        if(sessionId === ''){ return };

        let vendorId = chatLogs[sessionId][0].vendorId > 0 ? chatLogs[sessionId][0].vendorId: 0;

        const session = chatLogs[sessionId]? chatLogs[sessionId][0] : null;
    

        if(vendorId > 0){

            const vendorData = vendors.find(v => v.chatId === vendorId)
            vendorData.sessionId = ''
            vendorData.agentId = ''
    
            bot.sendMessage(vendorId, `_❎ You were removed from the chat room!!_`, {
                parse_mode: 'Markdown'
            });

            bot.sendMessage(session.agent2Id, `_Vendor was removed from the chat!_`, {
                parse_mode: 'Markdown'
            });

            bot.sendMessage(session.custId, `_Vendor was removed from the chat!_`, {
                parse_mode: 'Markdown'
            });

            session.vendorId = 0;
    
        }
      
    
    
    }catch(error){

        console.log(error);
    }


    
};


module.exports = remove_vendor