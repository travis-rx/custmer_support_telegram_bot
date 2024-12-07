const bot = require('../../main/bot');
const { userState, ensureUserExists, agents, admins, vendors, chatLogs, get_users, auto_sessions, manual_sessions } = require('../../mongodb/sync_users');
const { agent_keyboard } = require('../keyboards/agent');
const { getSessionId, formatUnixTime, randomName, formatPinnedMsg } = require('../utils');

//Automatic Session Creation
async function assign_agent(chatId, enquiry) {

    await ensureUserExists(chatId);

    const isInQueue = auto_sessions.find(session => session.chatId === chatId);

    let userType = userState[chatId].userType;
    let availableAgent = ''
    let custType = ''

    if(userType === 'firstCust'){

        availableAgent = agents.reduce((minAgent, agent) => {
            if (agent.sessions.length <= 10 && agent.banned === false && agent.tier === 2 && agent.chatId !== 0) {
                if (!minAgent || agent.sessions.length < minAgent.sessions.length) {
                    return agent;
                }
            }
            return minAgent;
        }, null);

        // availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 2 && agent.chatId !== 0);

        if(!availableAgent){

             availableAgent = agents.reduce((minAgent, agent) => {
                if (agent.sessions.length <= 10 && agent.banned === false && agent.tier === 1 && agent.chatId !== 0) {
                    if (!minAgent || agent.sessions.length < minAgent.sessions.length) {
                        return agent;
                    }
                }
                return minAgent;
            }, null);

            // availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 1 && agent.chatId !== 0);
        }

        custType = 'customer';

    }else if(userType === 'regCust'){

        availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 1 && agent.chatId !== 0);
        custType = 'customer';

    }else if(userType === 'vendor'){

        availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 1 && agent.chatId !== 0);
        custType = 'vendor';
    }

        if (!availableAgent) {

            const session = { chatId: chatId, enquiry: enquiry };

            if (isInQueue) { return; }

            auto_sessions.push(session);

            let message = 'You are now waiting to be connected with an agent. Thank you for your patience!';
            bot.sendMessage(chatId, message);
            return;
        }
    

    if (availableAgent) {

        const sessionIndex = auto_sessions.findIndex(session => session.chatId === chatId);

        const initializeMsgIds = (admins) => {
            const msgIds = {};
            admins.forEach(admin => {
                msgIds[admin.chatId] = 0;
            });
            return msgIds;
        };

        const msgIds = initializeMsgIds(admins);

        if (sessionIndex !== -1) {
            auto_sessions.splice(sessionIndex, 1); 
        }
    
        let agentId = availableAgent.chatId;     
        let agentUn = availableAgent.userName;   
        
        availableAgent.pseudonym = randomName();
        userState[chatId].pseudonym = randomName();
        
        const sessionId = getSessionId(agentId, chatId);

        availableAgent.sessions.push(sessionId);
        availableAgent.sessionId = sessionId;

        if (!chatLogs[sessionId]) {
            chatLogs[sessionId] = [];
        }

        const unixTimestamp = Date.now();
        const date = new Date(unixTimestamp);
        const formattedDate = await formatUnixTime(date);

        let vendor = vendors.find(vendor => vendor.chatId === chatId && vendor.banned === false);

        if(!vendor){

            await chatLogs[sessionId].push({ time: formattedDate, enquiry: enquiry, cust: userState[chatId].userName, custId: chatId, agent2: agentUn, agent2Id:  agentId, agent1: '', agent1Id: 0, vendorId: 0, vendorUn: '', vendorBn: '', qa1: 0, qa2: 0, qa1_rating: 0, qa2_rating: 0, qa1_note: '', qa2_note: '', msgIds: msgIds, photos: [], agents: [agentUn], resolved: false, user_rating: 0, note: '', active: true, transferred: false, name_updated: false });
            userState[chatId].sessionId = sessionId;

        }

        if(vendor){

            await chatLogs[sessionId].push({ time: formattedDate, enquiry: enquiry, cust: '', custId: 0, agent2: agentUn, agent2Id:  agentId, agent1: '', agent1Id: 0, vendorId: chatId, vendorUn: vendor.userName, vendorBn: vendor.businessName, qa1: 0, qa2: 0, qa1_rating: 0, qa2_rating: 0, qa1_note: '', qa2_note: '', msgIds: msgIds, photos: [], agents: [agentUn], resolved: false, user_rating: 0, note: '', active: true, transferred: false, name_updated: false });
            vendor.sessionId = sessionId;
        }


        if( availableAgent.agentMsgId > 0){

            await bot.deleteMessage(agentId, availableAgent.agentMsgId);
            availableAgent.agentMsgId = 0;

        }

        bot.sendMessage(agentId, `🎫 #TICKET${sessionId} \n\nYou are now connected with a ${custType}. Please assist them with their enquiry.`, {
            reply_markup: agent_keyboard
        });

        bot.sendMessage(chatId, `🎫 #TICKET${sessionId}\n\n🧏‍♂️ You are connected with one of our support agent *${availableAgent.pseudonym}!*`, {parse_mode: 'Markdown'});

        const admin_message = `#TICKET${sessionId} [Agent: ${availableAgent.userName} | Cust: ${userState[chatId].userName}]`

        for (const admin of admins) {

        if(admin.pinnedMsgId === 0){

            bot.sendMessage(admin.chatId, `${admin_message}`, 
)
            .then((sentMessage) => {
                bot.pinChatMessage(admin.chatId, sentMessage.message_id);
                admin.pinnedMsgId = sentMessage.message_id;
            });

        }

        if(admin.pinnedMsgId > 0){

            const message = await formatPinnedMsg();

                bot.editMessageText(message, {
                    chat_id: admin.chatId,
                    message_id: admin.pinnedMsgId,
                    parse_mode: 'HTML',
                });

        }

    }
        return
        
    } 

    console.log(msgIds);
}

// Manual Session Creation
async function create_manual_session(chatId, set_session_info) {

    try{    

    const { custType, cust, custId, vendorUn, vendorId } = set_session_info;

    await ensureUserExists(custId);

    const enquiry = 'Manual Session Creation!'

    const isInQueue = manual_sessions.find(session => session.set_session_info.custId === custId);

    const initializeMsgIds = (admins) => {
        const msgIds = {};
        admins.forEach(admin => {
            msgIds[admin.chatId] = 0;
        });
        
        return msgIds;
    };

    const msgIds = initializeMsgIds(admins)

    const users = await get_users();

    let availableAgent = ''

    let agent1Id = 0;
    let agent2Id = 0;
    let agent1 = '';
    let agent2 = '';

    if(custType === 'firstCust'){

        availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 2 && agent.chatId !== 0);

        if(!availableAgent){

            availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 1 && agent.chatId !== 0);
        }

    }
    
    if(custType === 'regCust'){

        availableAgent = agents.find(agent => agent.sessions.length <=10 && agent.banned === false && agent.tier === 1 && agent.chatId !== 0);

    }

    console.log("Is in quue", isInQueue);


    if(!availableAgent) {

        const session_info = { set_session_info: set_session_info };

        if(isInQueue) { return };

        manual_sessions.push(session_info);

        if(chatId === 0) { return };

        bot.sendMessage(chatId, 'All agents are busy right now, added to the queue!', {

        }).then((message) => {

            setTimeout(() => {
                bot.deleteMessage(chatId, message.message_id);
            }, 5000);

        });

        return
    }

    if (availableAgent) {

        const sessionIndex = manual_sessions.findIndex(session => session.set_session_info.custId === custId);

        if (sessionIndex !== -1) {
            auto_sessions.splice(sessionIndex, 1); 
        }

        let agentId = availableAgent.chatId;     
        let agentUn = availableAgent.userName; 

        const sessionId = getSessionId(agentId, custId);
        let vendor = vendors.find(vendor => vendor.chatId === vendorId && vendor.banned === false);

        if(!vendor){ return };

        vendor.sessionId = sessionId;
    
        availableAgent.pseudonym = randomName()
        userState[custId].pseudonym = randomName()
        
        availableAgent.sessions.push(sessionId);
        availableAgent.sessionId = sessionId;
        userState[custId].sessionId = sessionId;
        userState[custId].userType = custType;

        if (!chatLogs[sessionId]) {
            chatLogs[sessionId] = [];
        }

        if(custType === 'firstCust'){ agent2Id = agentId; agent2 = agentUn } 
        
        if(custType === 'regCust'){ agent1Id = agentId; agent1 = agentUn }

        const unixTimestamp = Date.now();
        const date = new Date(unixTimestamp);
        const formattedDate = await formatUnixTime(date);

        await chatLogs[sessionId].push({ time: formattedDate, enquiry: enquiry, cust: cust, custId: custId, agent2: agent2, agent2Id:  agent2Id, agent1: agent1, agent1Id: agent1Id, vendorId: vendorId, vendorUn: vendorUn, vendorBn: '', qa1: 0, qa2: 0, qa1_rating: 0, qa2_rating: 0, qa1_note: '', qa2_note: '', msgIds: msgIds, photos: [], agents: [agentUn], resolved: false, user_rating: 0, note: '', active: true, transferred: false, name_updated: false  });

        if( availableAgent.agentMsgId > 0){

            bot.deleteMessage(agentId, availableAgent.agentMsgId);
            availableAgent.agentMsgId = 0;

        }

        bot.sendMessage(agentId, `🎫 #TICKET${sessionId} \n\nYou are now connected with a customer. Please assist them with their enquiry.`, {
            reply_markup: agent_keyboard
        });

        bot.sendMessage(custId, `🎫 #TICKET${sessionId}\n\n🧏‍♂️ You are connected with one of our support agent *${availableAgent.pseudonym}!*`, {parse_mode: 'Markdown'});

        bot.sendMessage(chatId, `✅ Session created between @${cust}, @${vendorUn}  and @${agentUn}`, {

            parse_mode: 'HTML'

        }).then((message) => {

            setTimeout(() => {
                bot.deleteMessage(chatId, message.message_id);
            }, 5000);

        });

        if (sessionIndex !== -1) {
            manual_sessions.splice(sessionIndex, 1); 
        }

        return

    }

    console.log(msgIds)

}catch(error){

    console.log(error);
}
}

async function process_queue_sessions() {

    if (auto_sessions.length > 0) {

        auto_sessions.forEach(session => {
            const chatId = session.chatId;
            const enquiry = session.enquiry;
            assign_agent(chatId, enquiry);
        });

    }

    if (manual_sessions.length > 0) {

        manual_sessions.forEach(session => {
            const set_session_info = session.set_session_info;
            create_manual_session(Number('0'), set_session_info);
        });

    }
}

console.log("Auto Session", auto_sessions);

setInterval(() => {

    process_queue_sessions();

    console.log("Checking session que")

}, 10 * 1000); 

module.exports = { assign_agent, create_manual_session };