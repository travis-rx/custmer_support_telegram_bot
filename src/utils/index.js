const { userState, agents, timeouts, chatLogs, vendors, admins, set_agent_info, set_vendor_info, syncVendors, syncAgents, pseudonym, get_users } = require('../../mongodb/sync_users');
const { User, Agent, Vendor } = require('../../mongodb/db_connect');
const bot = require('../../main/bot');
const crypto = require('crypto');
const { resolve_keyboard, admin_keyboard } = require('../keyboards') 
const { select_agent } = require('../ui_modules/manage_agents');
const { agent_keyboard, session_nav, create_session_nav } = require('../keyboards/agent');
const add_agent = require('../ui_modules/add_agent');
const add_vendor = require('../ui_modules/add_vendor');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function startTimeout(chatId, sessionId) {

    if (timeouts[chatId]) {
        clearTimeout(timeouts[chatId]);
    }

    timeouts[chatId] = setTimeout(() => {

        let message = '⏱️ Your session has expired after 3 minutes of idle time!';

        close_ticket(chatId, message, sessionId);

    }, 5 * 60 * 1000); // 5 minutes

}

async function formatUnixTime(date){

    const formattedDate = date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });

      return formattedDate;
}

function getSessionId(agentId, customerId) {

    const timestamp = Date.now();
    const data = `${agentId}-${customerId}-${timestamp}`;
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex').substring(0, 10).toUpperCase();

}

function formatChatLog(sessionId) {
    const session = chatLogs[sessionId];
    const { cust, agent2, agent1, qa1, qa2, vendorId, vendorUn, time, user_rating } = session[0];
    
    let qa1Status = qa1 > 0 ? 'QA1: ✅' : 'QA1: ☑️';
    let qa2Status = qa2 > 0 ? 'QA2: ✅' : 'QA2: ☑️';
    let userRated = user_rating > 0 ? `Cust: ${user_rating} ⭐` : 'Cust: 0 ★'; 
    let vendorStatus = vendorId > 0 ? `Vendor: ✅ ` : 'Vendor: ☑️';

    let vendor = vendorId > 0? `${vendorUn}` : 'X';
    const v = vendors.find(v => v.chatId === vendorId);
    let business_name = vendorId > 0? `(${v.businessName})` : '';


    let agent = agent2;

    if(agent2 === '' && agent1 !== ''){

        agent = agent1;
    }

    let formattedMessage = `*#TICKET${sessionId} \nAgent: @${agent} | Cust: @${cust} | Vendor: @${vendor}*\n\n`;
    
    session.slice(1).forEach(log => {
      formattedMessage += `*${log.from}*:  ${log.text}\n`;
    });

    formattedMessage += `\n\n${vendorStatus} ${business_name}\nRatings: ${userRated} | ${qa1Status} | ${qa2Status}`;
    
    return formattedMessage;
  }

function shrink_chat(sessionId) {
    
    const session = chatLogs[sessionId];
    const { cust, agent2, agent1, qa1, qa2, vendorId, vendorUn, time, user_rating } = session[0];
    
    let qa1Status = qa1 > 0 ? 'QA1: ✅' : 'QA1: ☑️';
    let qa2Status = qa2 > 0 ? 'QA2: ✅' : 'QA2: ☑️';
    let userRated = user_rating > 0 ? `Cust: ${user_rating} ⭐` : 'Cust: 0 ★'; 
    let vendorStatus = vendorId > 0 ? `Vendor: ✅ ` : 'Vendor: ☑️';

    let vendor = vendorId > 0? `${vendorUn}` : 'X';
    const v = vendors.find(v => v.chatId === vendorId);
    let business_name = vendorId > 0? `(${v.businessName})` : '';

    let agent = agent2;

    if(agent2 === '' && agent1 !== ''){
        agent = agent1;
    }

    let formattedMessage = `*#TICKET${sessionId} \nAgent: @${agent} | Cust: @${cust} | Vendor: @${vendor}*\n\n`;

    session.slice(1, 4).forEach(log => {
        formattedMessage += `*${log.from}*: ${log.text}\n`;
    });
    

    formattedMessage += `\n\n${vendorStatus} ${business_name}\nRatings: ${userRated} | ${qa1Status} | ${qa2Status}`;
    
    return formattedMessage;
}


function formatAgentLog(sessionId){

    const session = chatLogs[sessionId]? chatLogs[sessionId] : null;

    if(!session){ return };

    try{

        const { vendorId } = session[0];
    
        let vendorStatus = vendorId > 0 ? `Vendor: ✅ ` : 'Vendor: ☑️';
    
        const v = vendors.find(v => v.chatId === vendorId);
    
        let vendor = vendorId > 0? `(${v.businessName})` : '';
    
        let formatAgentMsg = `*#TICKET${sessionId}*\n\n`;
        
        session.slice(1).forEach(log => {
            let from = log.from;
    
            if(log.from === 'agent'){
    
                from = 'you'
            }
    
            formatAgentMsg += `*${from}*:  ${log.text}\n`;
        });
    
        formatAgentMsg += `\n\n${vendorStatus} ${vendor}`;
        
        return formatAgentMsg;
    }catch(error){

        console.log("Error in Format Agent Log", error);
    }

    
}

async function formatPinnedMsg() {

    try{

        const active_sessions = Object.entries(chatLogs).filter(([sessionId, logs]) => logs[0].active === true);
        let pinnedText = '';
    
        console.log("Format Pinned Msg is Triggered");
        console.log("Pinned Text", pinnedText);
    
        active_sessions.forEach(([sessionId, logs]) => {
            const session = logs[0];
    
            let customer = session.cust;
            let agent = session.agent1;
    
            if (customer === '' && session.vendorUn !== '') {
                customer = session.vendorUn;
            }
    
            if (agent === '') {
                if (session.agent2 !== '') {
                    agent = session.agent2;
                } else {
                    agent = 'unassigned'; // default value if both agents are empty
                }
            }
    
            pinnedText += `#TICKET${sessionId} [Agent: ${agent} | Cust: ${customer}]\n`;
        });
    
        return pinnedText;
    }catch(error){

        console.log("Error in Format Pinned Msg", error);
    }


}


async function vendor_sneak_into(chatId, sessionId){

    let vendor = vendors.find(vendor => vendor.chatId === chatId);

    if(!vendor){ return };

    try{

        if(chatLogs[sessionId][0].active){

            const { custId, agent1Id, agent2Id } = chatLogs[sessionId][0]; 
    
            let agentId = 0;
    
            if(agent2Id > 0 && agent1Id === 0){
    
                agentId = agent2Id;
            }
    
            if(agent1Id > 0){
    
                agentId = agent1Id;
            }
    
                vendor.sessionId = sessionId;
    
                vendor.nextSession = ''
                chatLogs[sessionId][0].vendorId = chatId;
                chatLogs[sessionId][0].vendorUn = vendor.userName;
    
                await bot.sendMessage(chatId, `_You entered the chat room!_`, {parse_mode: 'Markdown'});
    
                bot.sendMessage(agentId, `_Seller entered the chat room!_`, {parse_mode: 'Markdown'}).then((message) => {
    
                    setTimeout(() => {
                        bot.deleteMessage(agentId, message.message_id);
                    }, 5000);
    
                })
    
                await bot.sendMessage(custId, `Seller entered the chat room!`, {parse_mode: 'Markdown'});
    
                return
    
    
    
        }else{
    
            await bot.sendMessage(chatId, `_Ticket already closed!_`, {parse_mode: 'Markdown'});
            vendor.sessionId = ''
    
            return
    
        }
    }catch(error){

        console.log(error);
    }



}

async function close_ticket(chatId, message, sessionId) {

    if(!chatLogs[sessionId]){ return }

    const { custId, vendorId, agent1Id, agent2Id } = chatLogs[sessionId][0];

    let agentId = 0;

    if(agent1Id > 0){

        agentId = agent1Id;
    }

    if(agent2Id > 0){

        agentId = agent2Id
    }

    let agent = agents.find(agent => agent.chatId === agentId);

    bot.sendMessage(chatId, message);

    bot.sendMessage(agentId, `_💤Session with ${userState[chatId].pseudonym} was closed!_`, {

        parse_mode: 'Markdown'

    }).then((message) => {

        setTimeout(() => {
            bot.deleteMessage(agentId, message.message_id);
        }, 5000);

    });

    if (agent) {

        const index = agent.sessions.indexOf(sessionId);
        if (index !== -1) {
            agent.sessions.splice(index, 1);
        }

        if (agent.sessions.length > 0) {
            agent.sessionId = agent.sessions[agent.sessions.length - 1];

            const formatAgentMsg = formatAgentLog(sessionId);
            let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));
            const session_nav = create_session_nav(agent.sessions, currentIndex);

            if(agent.agentMsgId > 0){

                bot.editMessageText(formatAgentMsg, {
                    chat_id: agentId,
                    message_id: agent.agentMsgId,
                    reply_markup: session_nav,
                    parse_mode: 'Markdown'
                });

            }

            if(agent.agentMsgId === 0){

                bot.sendMessage(agentId, formatAgentMsg, {parse_mode: 'Markdown', reply_markup: session_nav}).then((message) => {
                    agent.agentMsgId = message.message_id;
                });;
            }
            
        } else {
            agent.sessionId = '';
        }
    }

    const vendor = vendors.find(v => v.chatId === chatId);

    if(vendor){
        vendor.sessionId = 0;
    }

    userState[chatId].sessionId = ''
    chatLogs[sessionId][0].active = false;

    await manage_vendor_session(vendorId);

    clearTimeout(timeouts[chatId]);
    delete timeouts[chatId];

}

async function close_window(chatId, messageId){

    console.log("Msg Id", messageId)
    try{

        await bot.deleteMessage(chatId, messageId);

        userState[chatId].lastBotMessageId = 0;

    }catch(error){

        console.log(error.message);
    }

}

async function manage_vendor_session(vendorId){

    if(vendorId === 0){ return }

        const vendorData = vendors.find(vendor => vendor.chatId === vendorId)
        vendorData.sessionId = ''

        await bot.sendMessage(vendorId, `_💤 Session was closed!_`, {
            parse_mode: 'Markdown'
        });

        await sleep(2000);

    if(vendorData.nextSession === ''){ return }

        await vendor_sneak_into(vendorId, vendorData.nextSession);

}

async function resolve_query(chatId){

    try{

        const agent = agents.find(agent => agent.chatId === chatId);

        if(!agent){ return };
    
        const {custId, vendorId} = chatLogs[agent.sessionId][0];
    
        if(custId > 0){
    
            const sentMessage = await bot.sendMessage(custId, 'Has your issue been resolved?', {parse_mode: 'Markdown', reply_markup: resolve_keyboard})
    
            userState[custId].tempMsgId = sentMessage.message_id;
    
        }
    
        if(vendorId > 0){
    
            const sentMessage = await bot.sendMessage(vendorId, 'Has your issue been resolved?', {parse_mode: 'Markdown', reply_markup: resolve_keyboard})
    
            userState[vendorId].tempMsgId = sentMessage.message_id;
                  
        }

    }catch (error){

        console.log("Error in Resolve Query")
    }

}

function randomName() {

    const randomIndex = Math.floor(Math.random() * pseudonym.length);
    return pseudonym[randomIndex];

}

async function rate_session(chatId, sessionId){

    try{

        bot.deleteMessage(chatId, userState[chatId].lastBotMessageId);

        const question = `Please rate our service out of 5 stars:`;
    
        const options = [
            { text: '⭐️ 1', callback_data: `rating_${sessionId}_1` },
            { text: '⭐️ 2', callback_data: `rating_${sessionId}_2` },
            { text: '⭐️ 3', callback_data: `rating_${sessionId}_3`},
            { text: '⭐️ 4', callback_data: `rating_${sessionId}_4` },
            { text: '⭐️ 5', callback_data: `rating_${sessionId}_5` }
        ];
        
        const sentMessage = await bot.sendMessage(chatId, question, {
            reply_markup: {
                inline_keyboard: [options]
            },
            parse_mode: 'Markdown'
        })
    
        userState[chatId].lastBotMessageId = sentMessage.message_id;
    } catch (error){

        console.log("Error in Rate Session");
    }

}

async function addAgent(agentInfo){

    try{
        let agentsDocument = await Agent.findOne({ 'agents': { $exists: true, $ne: null } });

        if(!agentsDocument){

            agentsDocument = new Agent({
                agents: [agentInfo] 
            });

            await agentsDocument.save();

            return 1

        } else {

            await Agent.updateOne(
                { 'agents': { $exists: true, $ne: null } }, 
                { $push: { agents: agentInfo } }
            );

            return 1
        }

    } catch(error){

        return 0
    }

}

async function addVendor(vendorInfo){

    try{
        let vendorsDocument = await Vendor.findOne({ 'vendors': { $exists: true, $ne: null } });

        console.log("Ven Doc", vendorsDocument);

        if(!vendorsDocument){

            vendorsDocument = new Vendor({
                vendors: [vendorInfo] 
            });

            await vendorsDocument.save();

            return 1

        } else {

            await Vendor.updateOne(
                { 'vendors': { $exists: true, $ne: null } }, 
                { $push: { vendors: vendorInfo } }
            );

            return 1
        }

    } catch(error){

        return 0
    }

}

async function confirm_agent(chatId){

    let { userName, agentType, tier } = set_agent_info;

    console.log("set agent info", set_agent_info);

    try{

        if(userName === 'username' || userName === null){

            bot.sendMessage(chatId, `_🚫 Please provide a valid username_`, {parse_mode: 'Markdown'}).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

            return

        }else {
    
            const supAgent = await Agent.findOne({ 'agents.userName': userName.toLowerCase() });

            console.log("SupAgent", supAgent);
    
            if (!supAgent) {
    
                const addAg = await addAgent(set_agent_info);
                console.log(addAg)
    
                if(addAg === 1){
    
                    await bot.sendMessage(chatId, `✅️ Agent @${userName} added successfully!`, { parse_mode: 'HTML'}).then((message) => {
                        setTimeout(() => {
                            bot.deleteMessage(chatId, message.message_id);
                        }, 5000);
                    });

                    syncAgents();

                    return;
                }
    
                if(addAg === 0){
    
                    bot.sendMessage(chatId, `🚫 Error adding Agent!`).then((message) => {
                        setTimeout(() => {
                            bot.deleteMessage(chatId, message.message_id);
                        }, 5000);
                    });

                    return
                }
    
            }
    
            if(supAgent) {

                const agent = supAgent.agents.find(agent => agent.userName === userName.toLowerCase());

                if(agent){

                    agent.tier = tier;
                    agent.agentType = agentType;
                    supAgent.markModified('agents');

                }

                await supAgent.save();

                await bot.sendMessage(chatId, ` ✅️ Agent info updated successfully!`, {parse_mode: 'HTML'}).then((message) => {
                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);
                });

                syncAgents();

                return;

            }

        }
    }catch(error){

        console.log(error);
    }

}

async function confirm_vendor(chatId){

    let { userName, banned, businessName } = set_vendor_info;

    const users = await get_users();

    console.log("set vendor info", set_vendor_info);

    try{

        if(userName === 'username' || userName === null){

            bot.sendMessage(chatId, `_🚫 Please provide a valid username_`, {parse_mode: 'Markdown'}).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

            return

        }

        if(businessName === 'Seller Name' || businessName === null){

            bot.sendMessage(chatId, `_🚫 Invalid Input for seller Business Name_`, {parse_mode: 'Markdown'}).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

            return

        }
    
            const supVendor = await Vendor.findOne({ 'vendors.userName': userName });
    
            if (!supVendor) {
    
                const addVdr = await addVendor(set_vendor_info);
                console.log(addVdr)
    
                if(addVdr === 1){
    
                    bot.sendMessage(chatId, `✅️ Vendor ${userName} added successfully!`, {
                        reply_markup: admin_keyboard
                    }).then((message) => {
                        // setTimeout(() => {
                        //     bot.deleteMessage(chatId, message.message_id);
                        // }, 5000);
                    });

                    set_vendor_info.userName = 'username'
                    set_vendor_info.businessName = 'Seller Name'
                    set_vendor_info.chatId = 0

                    syncVendors();

                    add_vendor(chatId);

                    return;
                }
    
                if(addVdr === 0){
    
                    bot.sendMessage(chatId, `🚫 Error adding Vendor!`).then((message) => {
                        setTimeout(() => {
                            bot.deleteMessage(chatId, message.message_id);
                        }, 5000);
                    });
                }

                return
    
            }
    
            if(supVendor) {

                const vendor = supVendor.vendors.filter(vendor => vendor.userName === userName.toLowerCase())[0];

                if(vendor){

                    vendor.banned = banned;
                    vendor.businessName = businessName;

                    supVendor.markModified('vendors');

                }

                await supVendor.save();

                bot.sendMessage(chatId, `✅️ Vendor info updated successfully!`, {parse_mode: 'Markdown'}).then((message) => {
                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);
                });

                    set_vendor_info.userName = 'username';
                    set_vendor_info.businessName = 'Seller Name'

                syncVendors();

                add_vendor(chatId);


                return;

            }

    }catch(error){

        console.log(error);
    }

}

async function remove_agent(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{
            
        let ag_id = admin.a_id;
        let agent = agents[ag_id - 1];

        const supAgent = await Agent.findOne({ 'agents.userName': agent.userName.toLowerCase() });

        if(supAgent) {

            const ag = supAgent.agents.find(a => a.userName === agent.userName.toLowerCase());

            if(ag){

               await Agent.updateOne(
                    { 'agents.userName': agent.userName },
                    { $pull: { agents: { userName: agent.userName } } }
                  );

                agents.splice((ag_id - 1), 1);

            }

        }

        bot.deleteMessage(chatId, userState[chatId].tempMsgId);
        userState[chatId].tempMsgId = 0;

    }catch(error){

        console.log(error);

        return

    }
}

async function remove_vendor(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{
            
        let v_id = admin.v_id;
        let vendor = vendors[v_id - 1];

        console.log("vid", v_id);
        console.log("vendor", vendor);

        const supVendor = await Vendor.findOne({ 'vendors.userName': vendor.userName});

        console.log("supVend", supVendor);

        if(supVendor) {

            const vndr = supVendor.vendors.find(v => v.userName === vendor.userName);

            if(vndr){

               await Vendor.updateOne(
                    { 'vendors.userName': vendor.userName },
                    { $pull: { vendors: { userName: vendor.userName } } }
                  );

                  vendors.splice((v_id - 1), 1);

            }

            bot.deleteMessage(chatId, userState[chatId].tempMsgId);
            userState[chatId].tempMsgId = 0;

        }

    }catch(error){

        console.log(error);
    }
}

module.exports = {sleep, startTimeout, close_ticket, close_window, randomName, getSessionId, vendor_sneak_into, remove_agent, remove_vendor, formatUnixTime, formatChatLog, formatPinnedMsg, formatAgentLog, shrink_chat, resolve_query, rate_session, confirm_agent, confirm_vendor }