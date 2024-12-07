const { chatLogs, agents, vendors, userState } = require('../../mongodb/sync_users');
const bot = require('../../main/bot');
const { agent_keyboard } = require('../keyboards/agent');
const { randomName } = require('../utils');
 
async function transfer_ticket(chatId){

    const agent = agents.find(agent => agent.chatId === chatId);

    if(!agent){ return }

    const sessionId = agent.sessionId;

    if(sessionId === ''){ return };

    const session = chatLogs[sessionId][0];

    const agentSessions = agent.sessions;

    if(session.agent1Id > 0 || session.agent2Id > 0){

        session.agent1Id = 0;
        session.agent2Id = 0;

        const index = agentSessions.indexOf(sessionId);

        if (index > -1) {

            agentSessions.splice(index, 1);

        }

        if (agent.sessions.length > 0) {
            agent.sessionId = agent.sessions[agent.sessions.length - 1];
        }else{

            agent.sessionId = '';
        }
    }

    const availableAgent = agents.find(agent => agent.tier === 1 && agent.sessions.length <=10 && agent.banned === false && agent.chatId > 0 && agent.chatId !== chatId);

    if(availableAgent){

        session.agent1Id = availableAgent.chatId;
        session.agent1 = availableAgent.userName.toLowerCase();
        session.transferred = true;
        availableAgent.sessionId = sessionId;
        availableAgent.pseudonym = randomName();
        availableAgent.sessions.push(sessionId);

        agent.sessionId = agentSessions[agentSessions.length - 1]? agentSessions[agentSessions.length - 1] : '';
        
        bot.sendMessage(session.custId, `_✅ Transferred to support head ${availableAgent.pseudonym}!_`, { parse_mode: 'Markdown'});
        bot.sendMessage(chatId, '_✅ The session Transfered successfully!_', { parse_mode: 'Markdown'}).then((message => {

            setTimeout(() => {
                bot.deleteMessage(chatId, message.message_id);
            }, 5000);        }));

        bot.sendMessage(session.agent1Id, `🎫 #TICKET${sessionId} \n\nA ticket was transferred to you, Please help the customer`, {
            reply_markup: agent_keyboard
        });

        async function updateAgent(sessionId){
            const session = chatLogs[sessionId];
            session.forEach(log => {
                if (log.from === 'agent') {
                    log.from = 'T2 agent';
                }
            });
        };  

        await updateAgent(sessionId);

        chatLogs[sessionId].push({ from: '✅', text: '_Transferred from T2 agent_'});

    }else{

        bot.sendMessage(session.custId, `You are now being transfered to one of our lead agent, Please wait!`);
    }

}

module.exports = transfer_ticket