const bot = require('../../main/bot');
const { userState, ensureUserExists, agents, admins, vendors, chatLogs, syncAgents, syncVendors, get_users } = require('../../mongodb/sync_users');
const { User, Agent, Vendor } = require('../../mongodb/db_connect')
const { startTimeout, formatChatLog, formatAgentLog, shrink_chat, resolve_query, sleep } = require('../../src/utils');
const agents_main = require('../ui_modules/agents_main');
const vendors_main = require('../ui_modules/vendors_main');
const { send_invite } = require('../ui_modules/add_vendor_session')
const { select_agent } = require('../ui_modules/manage_agents');
const { select_vendor } = require('../ui_modules/manage_vendors');
const { agent_keyboard, session_nav, create_session_nav } = require('../keyboards/agent'); 
const { get_expand_kb, get_shrink_kb } = require('../keyboards');
const invite_vendor = require('../agent_portal/invite_vendor');
const remove_vendor = require('../agent_portal/remove_vendor');
const transfer_ticket = require('../agent_portal/transfer');
const { create_new_session } = require('../ui_modules/create_session');

async function msg_streamer(msg) {
    
    const chatId = msg.chat.id;
    const text = msg.text;
    const messageId = msg.message_id;
    const username = msg.chat.username? msg.chat.username : null;

    console.log("Here is the msg", msg)

    try {

        const users = await get_users();

        const missingUn = users.find(u => u.chatId === chatId.toString() && u.userName === '');

        if(missingUn && username){

            try {
                    await User.findOneAndUpdate(
                        { chatId: chatId.toString() },
                        { $set: { userName: (username).toLowerCase() } }
                    );
                
                    await get_users();
        
                    await msg_streamer(msg);
            
            }catch(error){
    
                console.log("Error in msg_streamer, updating user name", error);
            }
        }

        if(username && agents !== null){

            try{
    
                let missingChatId = agents.find(agent => agent.chatId === 0 && (agent.userName.toLowerCase() === msg.chat.username.toLowerCase()));
        
                if(missingChatId){
                
                    await Agent.updateOne(
                        { "agents.userName": missingChatId.userName.toLowerCase() }, 
                        { $set: { "agents.$.chatId" : msg.chat.id } }
                    );
        
                    await syncAgents();
        
                    await msg_streamer(msg);
                }
    
            }catch(error){
    
                console.log("Error in msg_streamer, updating agent name");
            }
    
            
        }
    
        if(username && vendors !== null){
    
            try{
    
                let missingChatId = vendors.find(vendor => vendor.chatId === 0 && (vendor.userName.toLowerCase() === msg.chat.username.toLowerCase()) );
        
                if(missingChatId){
                
                    await Vendor.updateOne(
                        { "vendors.userName": missingChatId.userName.toLowerCase() }, 
                        { $set: { "vendors.$.chatId" : msg.chat.id } }
                    );
        
                    await syncVendors();
        
                    await msg_streamer(msg);
                }
    
            }catch(error){
    
                console.log("Error in msg_streamer, updating vendor username", error);
            }
    
            
        }

        let agent = agents.find(agent => agent.chatId === chatId? agent : null && agent.agentType === 'support' );
        let vendor = vendors.find(vendor => vendor.chatId === chatId? vendor : null);
        let admin = admins.find(admin => admin.chatId === chatId? admin : null);

// Handle Admin actions

     if(admin){

        switch (true) {

            case /^(🚚 Vendors)$/.test(text):      
            bot.deleteMessage(chatId, messageId);
            await vendors_main(chatId);
            admin.buttonClicked = 'vendor_main'
            break;
    
            case /^(💻 Agents)$/.test(text):        
            bot.deleteMessage(chatId, messageId);
            await agents_main(chatId);
            admin.lastVisited = 'agent_main'
            admin.buttonClicked = ''
            break;
    
            case /^(👥 Create Session)$/.test(text):        
            bot.deleteMessage(chatId, messageId);
            await create_new_session(chatId);
            admin.lastVisited = 'create_session'
            admin.buttonClicked = ''
    
            break;
    
        }


        if(admin.buttonClicked === 'manage_agents'){

            if(msg.text === '/invite' || msg.text === '/start' || msg.text === '/resolve'){ return };

            bot.deleteMessage(chatId, messageId);
            await select_agent(chatId, msg.text);

            return

        }

        if(admin.lastVisited === 'view_vendor' || admin.buttonClicked === 'session_vendor'){

            if(msg.text === '/invite' || msg.text === '/start' || msg.text === '/resolve'){ return };

            bot.deleteMessage(chatId, messageId);
            select_vendor(chatId, msg.text);
            console.log("Triggered select vendor function")

            return

        }

    }
    
// Agent
        if (agent) {

            try{

                switch(true){

                    case /^(📣 Add Vendor)$/.test(text): 
                    bot.deleteMessage(chatId, messageId);
                        
                    invite_vendor(chatId);
            
                    break;
            
                    case /^(⏏ Remove Vendor)$/.test(text): 
            
                    bot.deleteMessage(chatId, messageId);
                    remove_vendor(chatId);
                    
                    break;
            
                    case /^(🔄 Transfer Ticket)$/.test(text):    
            
                    bot.deleteMessage(chatId, messageId);
                    transfer_ticket(chatId);
            
                    break;
            
                    case /^(👍 Resolve Ticket)$/.test(text):  
            
                    bot.deleteMessage(chatId, messageId);
                    await resolve_query(chatId);
            
                    break;

                }

                if(missingUn){

                    try {
                            await User.findOneAndUpdate(
                                { chatId: chatId.toString() },
                                { $set: { userName: msg.chat.username.toLowerCase() } }
                            );
                        
                            await get_users();
                
                            await msg_streamer(msg);
                    
                    }catch(error){
            
                        console.log("Error in msg_streamer, updating user name", error);
                    }
                }

            if (agent.sessions.length > 0) {

                const sessionId = agent.sessionId;
                const pseudonym = agent.pseudonym;

                if (msg.text) {

                    let text = msg.text;

                    if(msg.text === '/start' || msg.text === '📣 Add Vendor' || msg.text === '⏏ Remove Vendor' || msg.text === '🔄 Transfer Ticket' || msg.text === '👍 Resolve Ticket' ){ return };

                    if(sessionId === ''){ return };

                    const { custId, vendorId, msgIds } = chatLogs[sessionId][0];
                    const agentMsgId = agent.agentMsgId;

                    console.log("Session Length", chatLogs[sessionId].length);

                    const activeVendors = vendors.filter(vendor => vendor.banned === false && vendor.chatId > 0);;
                    console.log("Active vendors", activeVendors.length);

            if(agent.buttonClicked === 'invite_vendor'){  

                if(activeVendors.length === 0) { 

                    bot.sendMessage(chatId, '_No vendors available to invite!_', {
                        parse_mode: 'Markdown'
                    }).then((message) => {

                        bot.deleteMessage(chatId, message.message_id);

                    });
                    
                    return }

                const v_id = parseInt(msg.text); 

                send_invite(chatId, v_id);

                chatLogs[sessionId].push({ from: 'agent', text: 'Vendor Invite Sent' });
                bot.deleteMessage(chatId, agentMsgId);
                agent.agentMsgId = 0;

                const formatAgentMsg = formatAgentLog(sessionId);
                let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));
                const session_nav = create_session_nav(agent.sessions, currentIndex);

                if(agent.agentMsgId > 0){

                    bot.editMessageText(formatAgentMsg, {
                        chat_id: chatId,
                        message_id: agentMsgId,
                        reply_markup: session_nav,
                        parse_mode: 'Markdown',
                    });

                }

                if(agent.agentMsgId === 0){

                    bot.sendMessage(chatId, formatAgentMsg, {parse_mode: 'Markdown', reply_markup: session_nav}).then((message) => {
                        agent.agentMsgId = message.message_id;
                    });;
                }

                bot.deleteMessage(chatId, messageId);

                return

            }

            
                    if(custId > 0){

                        bot.sendMessage(custId, `*${pseudonym}*:   ${text}`, { parse_mode: 'Markdown' });

                    }

                    if(vendorId > 0){

                        bot.sendMessage(vendorId, `*${pseudonym}* (agent):   ${text}`, { parse_mode: 'Markdown'});

                    }

                    chatLogs[sessionId].push({ from: 'agent', text: text});

                    bot.deleteMessage(chatId, messageId);

                    const formatAgentMsg = formatAgentLog(sessionId);
                    let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));
                    const session_nav = create_session_nav(agent.sessions, currentIndex);

                    if(agentMsgId > 0){

                        bot.editMessageText(formatAgentMsg, {
                            chat_id: chatId,
                            message_id: agentMsgId,
                            reply_markup: session_nav,
                            parse_mode: 'Markdown',
                        });

                    }

                    if(agentMsgId === 0){

                        bot.sendMessage(chatId, formatAgentMsg, {parse_mode: 'Markdown', reply_markup: session_nav}).then((message) => {
                            agent.agentMsgId = message.message_id;
                        });;
                    }

                    const formattedMessage = formatChatLog(sessionId);
                    const shrinkChatMsg = shrink_chat(sessionId);

                    try{

                        let expand_kb = await get_expand_kb(sessionId);
                        console.log("Expand KB", expand_kb);

                    for(const admin of admins){

                        const msgId = msgIds[admin.chatId];

                        if(msgId > 0){

                            if(chatLogs[sessionId].length <= 4){

                                bot.editMessageText(formattedMessage, {
                                    chat_id: admin.chatId,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                            }

                            if(chatLogs[sessionId].length > 4){

                                bot.editMessageText(shrinkChatMsg, {
                                    chat_id: admin.chatId,
                                    reply_markup: expand_kb,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                                
                            }
    
                        }
    
                        if(msgId === 0){
    
                            bot.sendMessage(admin.chatId, formattedMessage, {
                                parse_mode: 'Markdown',
                                disable_notification: true
                            }).then((message) => {
    
                                chatLogs[sessionId][0].msgId = message.message_id;
                            });
                        }
                        
                    }


                        return
    
                        }catch(error){
    
                            console.log("Error editing the admin msg", error);
                        }

                } else if (msg.photo) {

                    const photo = msg.photo[msg.photo.length - 1];

                    const caption = msg.caption ? msg.caption : '';

                    const { custId, vendorId, msgIds } = chatLogs[sessionId][0];
                    const agentMsgId = agent.agentMsgId;

                    if(custId > 0){

                        await bot.sendPhoto(custId, photo.file_id, { caption: `*${pseudonym}*: ${caption}`, parse_mode: 'Markdown' });
                        agent.agentMsgId = 0;
                    }

                    if(vendorId > 0){
                        await bot.sendPhoto(vendorId, photo.file_id, { caption: `*${pseudonym}* (agent): ${caption}`, parse_mode: 'Markdown' });
                    }

                    chatLogs[sessionId].push({ from: 'agent', text: 'Sent a photo' + `(${caption})` });
                    // chatLogs[sessionId][0].photos.push(photo.file_id);

                    const formattedMessage = formatChatLog(sessionId);
                    const shrinkChatMsg = shrink_chat(sessionId);

                    const formatAgentMsg = formatAgentLog(sessionId);
                    let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));
                    const session_nav = create_session_nav(agent.sessions, currentIndex);

                    if(agentMsgId > 0){

                        bot.editMessageText(formatAgentMsg, {
                            chat_id: chatId,
                            message_id: agentMsgId,
                            reply_markup: session_nav,
                            parse_mode: 'Markdown',
                        });

                    }

                    if(agentMsgId === 0){

                        bot.sendMessage(chatId, formatAgentMsg, {parse_mode: 'Markdown', reply_markup: session_nav}).then((message) => {
                            agent.agentMsgId = message.message_id;
                        });;
                    }

                    try{

                        const formattedMessage = formatChatLog(sessionId);
                        const shrinkChatMsg = shrink_chat(sessionId);
    
                        let expand_kb = await get_expand_kb(sessionId);
                        console.log("Expand KB", expand_kb);

                    for(const admin of admins){

                            const msgId = msgIds[admin.chatId];
    
                        if(msgId > 0){
    
                            if(chatLogs[sessionId].length <= 4){
    
                                bot.editMessageText(formattedMessage, {
                                    chat_id: admin.chatId,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
    
                            }
    
                            if(chatLogs[sessionId].length > 4){

                                bot.editMessageText(shrinkChatMsg, {
                                    chat_id: admin.chatId,
                                    reply_markup: expand_kb,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                                
                            }
            
                            }
    
                        if(msgId === 0){
    
                            bot.sendMessage(admin.chatId, formattedMessage, {
                                parse_mode: 'Markdown',
                                disable_notification: true
                            }).then((message) => {
    
                                chatLogs[sessionId][0].msgIds[admin.chatId] = message.message_id;
                            });
                        }
                    }
    
                        }catch(error){
    
                            console.log("Error editing the admin msg", error);
                        }
                }

            } else {
                return;
            }
        }catch(error){

            console.log("Error in msg_streamer Agent Module:", error);
        }
        }

// Customer
        if (!agent && !vendor) {

            try{

                await sleep(1000);

            if(msg.text === '📣 Add Vendor' || msg.text === '⏏ Remove Vendor' || msg.text === '🔄 Transfer Ticket' || msg.text === '👍 Resolve Ticket' || msg.text === '/start' ){ return };

            if(!userState[chatId]){

                await ensureUserExists(chatId);

            }
                const sessionId = userState[chatId].sessionId;
                const pseudonym = userState[chatId].pseudonym;
                const userType = userState[chatId].userType;

                if(sessionId === ''){ return };

                const { custId, agent2Id, agent1Id, msgIds, vendorId } = chatLogs[sessionId][0];

                let agentId = 0;

                if(agent1Id === 0 && agent2Id > 0){
    
                    agentId = agent2Id;
    
                }
                
                if(agent1Id > 0 && agent2Id === 0){
    
                    agentId = agent1Id;
                }

                const agent = agents.find(agent => agent.chatId === agentId);

                let custType = '';

                if (userType === 'firstCust' || userType === 'regCust') {
                    custType = 'customer';
                } else if (userState[chatId].userType === 'vendor') {
                    custType = 'vendor';
                }

                if (msg.text) {
                    let text = msg.text;

                    if(vendorId > 0){

                        bot.sendMessage(vendorId, `*${pseudonym}* (${custType}):   ${text}`, { parse_mode: 'Markdown' });

                    }

                    chatLogs[sessionId].push({ from: custType, text: text });

                    const formatAgentMsg = formatAgentLog(sessionId);
                    let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));
                    const session_nav = create_session_nav(agent.sessions, currentIndex);

                    const agentMsgId = agent.agentMsgId? agent.agentMsgId : 0;

                    if(agentMsgId > 0){

                        bot.editMessageText(formatAgentMsg, {
                            chat_id: agentId,
                            message_id: agentMsgId,
                            reply_markup: session_nav,
                            parse_mode: 'Markdown',
                        });

                    }

                    if(agentMsgId === 0){

                        bot.sendMessage(agentId, formatAgentMsg, {parse_mode: 'Markdown', reply_markup: session_nav}).then((message) => {
                            agent.agentMsgId = message.message_id;
                        });;
                    }

                    try{

                        const formattedMessage = formatChatLog(sessionId);
                        const shrinkChatMsg = shrink_chat(sessionId);
    
                        let expand_kb = await get_expand_kb(sessionId);
                        console.log("Expand KB", expand_kb);
    
                    for(const admin of admins){

                        const msgId = msgIds[admin.chatId];

                        if(msgId > 0){
    
                            if(chatLogs[sessionId].length <= 4){
    
                                bot.editMessageText(formattedMessage, {
                                    chat_id: admin.chatId,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
    
                            }
    
                            if(chatLogs[sessionId].length > 4){

                                bot.editMessageText(shrinkChatMsg, {
                                    chat_id: admin.chatId,
                                    reply_markup: expand_kb,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                                
                            }
        
                            }

                    if(msgId === 0){

                        bot.sendMessage(admin.chatId, formattedMessage, {
                            parse_mode: 'Markdown',
                            disable_notification: true
                        }).then((message) => {

                            chatLogs[sessionId][0].msgIds[admin.chatId] = message.message_id;

                        });
                    }
                }
                    }catch(error){

                        console.log("Error editing the admin msg", error);
                    }


                } else if (msg.photo) {

                    const photo = msg.photo[msg.photo.length - 1];

                    const caption = msg.caption ? msg.caption : '';

                    await chatLogs[sessionId][0].photos.push(photo.file_id);

                    await sleep(1000);

                    await bot.sendPhoto(agentId, photo.file_id, { caption: `*${pseudonym}* (${custType}): ${caption}`, parse_mode: 'Markdown', reply_markup: agent_keyboard });
                    agent.agentMsgId = 0;

                    if(vendorId > 0){
                        await bot.sendPhoto(vendorId, photo.file_id, { caption: `*${pseudonym}*: ${caption}`, parse_mode: 'Markdown' });
                    }

                    chatLogs[sessionId].push({ from: custType, text: 'Sent a photo' + `(${caption})` });

                    try{

                        const msgIds = chatLogs[sessionId][0].msgIds;

                        const formattedMessage = formatChatLog(sessionId);
                        const shrinkChatMsg = shrink_chat(sessionId);
    
                        let expand_kb = await get_expand_kb(sessionId);
                        console.log("Expand KB", expand_kb);

                    for(const admin of admins){

                        const msgId = msgIds[admin.chatId];
    
                        if(msgId > 0){
    
                            if(chatLogs[sessionId].length <= 4){
    
                                bot.editMessageText(formattedMessage, {
                                    chat_id: admin.chatId,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
    
                            }
    
                            if(chatLogs[sessionId].length > 4){

                                bot.editMessageText(shrinkChatMsg, {
                                    chat_id: admin.chatId,
                                    reply_markup: expand_kb,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                                
                            }
    
        
                            }
    
                        if(msgId === 0){
    
                            bot.sendMessage(admin.chatId, formattedMessage, {
                                parse_mode: 'Markdown',
                                disable_notification: true
                            }).then((message) => {
    
                                chatLogs[sessionId][0].msgIds[admin.chatId] = message.message_id;
                            });
                        }
                    }
    
                        }catch(error){
    
                            console.log("Error editing the admin msg", error);
                        }

                }
            }catch(error){

                console.log("Error in Agent msg_streamer:", error);
            }

        }

// Vendor
        if (vendor) {

            try{

            if (msg.text === '/start') { return };

            if (msg.reply_to_message && msg.reply_to_message.caption) {

                const sessionIdMatch = msg.reply_to_message.caption.match(/#TICKET(\w+)/);

                if (sessionIdMatch) {
                    const sessionId = sessionIdMatch[1];

                    const session = chatLogs[sessionId]? chatLogs[sessionId] : null;

                    if(!session){

                        bot.sendMessage(chatId, "_This session already expired!_", { parse_mode: 'Markdown' }).then((message) => {

                            setTimeout(() => {
                                bot.deleteMessage(chatId, message.message_id);
                            }, 5000);
                    });

                    return
                    }

                    vendor.sessionId = sessionId;
                    
                }
            }

            let sessionId = vendor.sessionId;

            if(sessionId === ''){ return }

            let { custId, agent2Id, agent1Id, msgIds, vendorId } = chatLogs[sessionId][0];

            if(vendorId !== chatId){ 
                
                bot.sendMessage(chatId, "_This session already expired!_", { parse_mode: 'Markdown' }).then((message) => {

                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);
            });
            
            return 
        };

            let agentId = 0;

            if(agent1Id === 0 && agent2Id > 0){

                agentId = agent2Id;

            }
            
            if(agent1Id > 0 && agent2Id === 0){

                agentId = agent1Id;
            }

            const agent = agents.find(agent => agent.chatId === agentId);
            const agentMsgId = agent.agentMsgId;

                let custType = 'seller';

                if (msg.text) {
                    let text = msg.text;

                    if (sessionId === '' || msg.text === '/start') { return };

                    if(custId !== chatId && custId > 0){

                        bot.sendMessage(custId, `*${custType}*:   ${text}`, { parse_mode: 'Markdown' });
                    }

                    chatLogs[sessionId].push({ from: custType, text: text });

                    const formatAgentMsg = formatAgentLog(sessionId);
                    let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));
                    const session_nav = create_session_nav(agent.sessions, currentIndex);

                    if(agentMsgId > 0){

                        bot.editMessageText(formatAgentMsg, {
                            chat_id: agentId,
                            message_id: agentMsgId,
                            reply_markup: session_nav,
                            parse_mode: 'Markdown'
                        });

                    }

                    if(agentMsgId === 0){

                        bot.sendMessage(agentId, formatAgentMsg, {parse_mode: 'Markdown', reply_markup: session_nav}).then((message) => {
                            agent.agentMsgId = message.message_id;
                        });;
                    }

                    try{

                        const formattedMessage = formatChatLog(sessionId);
                        const shrinkChatMsg = shrink_chat(sessionId);
    
                        let expand_kb = await get_expand_kb(sessionId);
                        console.log("Expand KB", expand_kb);
    
                    for(const admin of admins){

                        const msgId = msgIds[admin.chatId];

                        if(msgId > 0){
    
                            if(chatLogs[sessionId].length <= 4){
    
                                bot.editMessageText(formattedMessage, {
                                    chat_id: admin.chatId,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
    
                            }
    
                            if(chatLogs[sessionId].length > 4){

                                bot.editMessageText(shrinkChatMsg, {
                                    chat_id: admin.chatId,
                                    reply_markup: expand_kb,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                                
                            }
    
        
                            }
    
                        if(msgId === 0){
    
                            bot.sendMessage(admin.chatId, formattedMessage, {
                                parse_mode: 'Markdown',
                                disable_notification: true

                            }).then((message) => {
    
                                chatLogs[sessionId][0].msgIds[admin.chatId] = message.message_id;
                            });
                        }
                    }
    
                        }catch(error){
    
                            console.log("Error editing the admin msg", error);
                        }

                } else if (msg.photo) {

                    const photo = msg.photo[msg.photo.length - 1];

                    const caption = msg.caption ? msg.caption : '';

                    await bot.sendPhoto(agentId, photo.file_id, { caption: `*seller* : ${caption}`, parse_mode: 'Markdown', reply_markup: agent_keyboard });
                    agent.agentMsgId = 0;

                    if(custId !== chatId && custId > 0){

                    await bot.sendPhoto(custId, photo.file_id, { caption: `*seller* : ${caption}`, parse_mode: 'Markdown' });

                    }

                    chatLogs[sessionId].push({ from: custType, text: 'Sent a photo' + `(${caption})` });
                    chatLogs[sessionId][0].photos.push(photo.file_id);

                    try{

                        const formattedMessage = formatChatLog(sessionId);
                        const shrinkChatMsg = shrink_chat(sessionId);
    
                        let expand_kb = await get_expand_kb(sessionId);
                        console.log("Expand KB", expand_kb);
    
                        for(const admin of admins){

                            const msgId = msgIds[admin.chatId];

                        if(msgId > 0){
    
                            if(chatLogs[sessionId].length <= 4){
    
                                bot.editMessageText(formattedMessage, {
                                    chat_id: admin.chatId,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
    
                            }

                            if(chatLogs[sessionId].length > 4){

                                bot.editMessageText(shrinkChatMsg, {
                                    chat_id: admin.chatId,
                                    reply_markup: expand_kb,
                                    message_id: msgId,
                                    parse_mode: 'Markdown'
                                });
                                
                            }
    
        
                            }
    
                        if(msgId === 0){
    
                            bot.sendMessage(admin.chatId, formattedMessage, {
                                parse_mode: 'Markdown',
                                disable_notification: true

                            }).then((message) => {
    
                                chatLogs[sessionId][0].msgIds[admin.chatId] = message.message_id;
                            });
                        }
                    }
    
                        }catch(error){
    
                            console.log("Error editing the admin msg", error);
                        }
                }

            }catch(error){

                console.log("Error in msg_streamer vendor module:", error);
            }
        }

    } catch (error) {
        console.log(error);
    }

}

module.exports = msg_streamer;
