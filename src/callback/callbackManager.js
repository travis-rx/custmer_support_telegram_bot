const bot = require('../../main/bot');
const { ensureUserExists, userState, chatLogs, vendors, admins, agents, set_agent_info, set_vendor_info, set_session_info, get_users } = require('../../mongodb/sync_users');
const { Agent, Vendor, User } = require('../../mongodb/db_connect');
const { start } = require('../ui_modules/start_ui');
const { cust_q2, vendor_q2, confirm_remove_agent, confirm_remove_vendor } = require('../keyboards');
const { get_expand_kb, get_shrink_kb } = require('../keyboards');
const { sleep, close_ticket, close_window, rate_session, formatChatLog, confirm_agent, confirm_vendor, remove_agent, remove_vendor, vendor_sneak_into, formatAgentLog, shrink_chat } = require('../utils');
const { assign_agent, create_manual_session } = require('../agent_portal/assign_agent');
const msg_streamer = require('../agent_portal/msg_streamer');
const admin_start = require('../ui_modules/admin_start');
const add_agent = require('../ui_modules/add_agent');
const { set_user_name, toggle_tier, toggle_role, update_tier, set_business_name } = require('../utils/force_replies');
const agents_main = require('../ui_modules/agents_main');
const { view_agents, select_agent } = require('../ui_modules/manage_agents'); 
const { view_vendors, select_vendor } = require('../ui_modules/manage_vendors')
const vendors_main = require('../ui_modules/vendors_main');
const add_vendor = require('../ui_modules/add_vendor');
const { create_session_nav } = require('../keyboards/agent');
const { create_new_session } = require('../ui_modules/create_session');
const { set_session_cust, toggle_custType } = require('../utils/force_replies');
const { vendor_list } = require('../ui_modules/add_vendor_session');

async function callbackManager(query){

    console.log("Query", query);

    const {data, message } = query;
    const chatId = message.chat.id;

    try{

    await ensureUserExists(chatId);

    console.log("userstate:", userState[chatId]);

    const now = new Date().getTime(); 

    const recentRequestTime = userState[chatId]? userState[chatId].recentRequestTime : null;
    
    if( recentRequestTime !== 0 && recentRequestTime + 2000 >= now) { return; }
    
    userState[chatId].recentRequestTime = now;

    const admin = admins.find(a => a.chatId === chatId);

    if(data.startsWith('rating')){

        const sessionId = (data.split('_')[1]).toString();
        const rating = (data.split('_')[2]).toString();
        const lastBotMessageId = userState[chatId]? userState[chatId].lastBotMessageId : null;
        const msgIds = chatLogs[sessionId]? chatLogs[sessionId][0].msgIds : null;

        if( !msgIds || !lastBotMessageId){ return }

        chatLogs[sessionId][0].user_rating = rating;

        console.log(chatLogs[sessionId][0]);

        await bot.deleteMessage(chatId, lastBotMessageId);

        await bot.sendMessage(chatId, '🎉 Thank you for rating our service!')

        const formattedMessage = formatChatLog(sessionId);

        for(const admin of admins){

            const msgId = msgIds[admin.chatId];

        bot.editMessageText(formattedMessage, {
            chat_id: admin.chatId,
            message_id: msgId,
            parse_mode: 'Markdown',
        });
    }

        return
    }

    try{

        await ensureUserExists(chatId);

        let message = ''
        let msg = ''
        let q2 = `*Question 2*

        *1*. I have question on how to use the service 
        *2*. I paid and the bot has not given me the product 
        *3*. Other\n`



        switch (data) {

            // Question 1

            case 'firstCust':

                userState[chatId].userType = 'firstCust'
                userState[chatId].buttonClicked = 'q2'

                bot.sendMessage(chatId, q2, {
                    reply_markup: cust_q2,
                    parse_mode: 'Markdown'
                }).then((message) => {
        
                    userState[chatId].lastBotMessageId = message.message_id;
        
                });

            break

            case 'regCust':

                userState[chatId].userType = 'regCust'
                userState[chatId].buttonClicked = 'q2'

                bot.sendMessage(chatId, q2, {
                    reply_markup: cust_q2,
                    parse_mode: 'Markdown'
                }).then((message) => {
        
                    userState[chatId].lastBotMessageId = message.message_id;
        
                });

            break;


            // Question 2

            case 'service_help':

                userState[chatId].enquiry = 'service_help'

                message = 'I have question on how to use the service'

                msg = {chat:{id: chatId}, text: message}

                await assign_agent(chatId, message);

                msg_streamer(msg);

            break;


            case 'purchase_issue':

                userState[chatId].enquiry = 'purchase_issue'

                message = 'I paid and the bot has not given me the product.'

                msg = {chat:{id: chatId}, text: message}

                await assign_agent(chatId, message);

                msg_streamer(msg);

            break;

            case 'other_help':

                userState[chatId].enquiry = 'other_help'

                message = 'I help with something else!'

                msg = {chat:{id: chatId}, text: message}

                await assign_agent(chatId, message);

                msg_streamer(msg);

            break;

            // Vendor Question2

            case 'missing_product':

                userState[chatId].enquiry = 'missing_product'

                message = 'I cannot find my product!'

                msg = {chat:{id: chatId}, text: message}

                await assign_agent(chatId, message);

                msg_streamer(msg);

            break;

            case 'yes_resolved':

                let sessionId = userState[chatId].sessionId;

                const vendor = vendors.find(v => v.chatId === chatId);

                if(vendor){

                    sessionId = vendor.sessionId;
                }

                const session = chatLogs[sessionId][0];

                session.resolved = true;

                const queryResp = '✅ Your query is marked as resolved!'

                await close_ticket(chatId, queryResp, sessionId);

                await rate_session(chatId, sessionId);

            break;

            // Admin Panel

            case 'support_agent':

            set_agent_info.agentType = 'support'

            add_agent(chatId);

            break;

            case 'qa_agent':

            set_agent_info.agentType = 'qa'

            add_agent(chatId);

            break;
            

            case 'add_agent':

            add_agent(chatId);

            break;

            case 'user_name':

            set_user_name(chatId);

            break;

            case 'set_tier':

            toggle_tier(chatId);

            break;

            case 'confirm_agent':

            await confirm_agent(chatId);
            set_agent_info.userName = 'username';
            set_agent_info.chatId = 0
            add_agent(chatId);

            break;

            case 'manage_agent':

            await view_agents(chatId);

            break;

            case 'manage_agents':   // For using as a back from manage agents

            admin.buttonClicked = ''

            await agents_main(chatId);

            break;

            case 'cancel_session_creation':

            await close_window(chatId, admin.lastBotMessageId);
            
            admin.buttonClicked = 'start'

            message = `Manage the bot with the buttons below`

            admin_start(chatId, message);
            
            break;

            case `pause_agent`:

                let ag_id = admin.a_id;
                let agent = agents[ag_id - 1];
                agent.banned = !agent.banned;
    
                const supAgent = await Agent.findOne({ 'agents.userName': agent.userName.toLowerCase() });
    
                if(supAgent) {
        
                    const ag = supAgent.agents.find(a => a.userName.toLowerCase() === agent.userName.toLowerCase());
    
                    if(ag){
    
                        ag.banned = agent.banned;
                        
                        supAgent.markModified('agents');
    
                    }
    
                    await supAgent.save();
                }
    
                await select_agent(chatId, ag_id);
                await view_agents(chatId);

            break;
            

        }

        // Agent Module
        switch(data){

            case 'agent_main':

            agents_main(chatId);

            break;

            case 'close_window':

            close_window(chatId, userState[chatId].tempMsgId);

            break;

            case 'close_agent_window':

            close_window(chatId, userState[chatId].tempMsgId);

            break;

            case 'toggle_role':

            await toggle_role(chatId);
            await view_agents(chatId);

            break;

            case 'update_tier':

            await update_tier(chatId);
            await view_agents(chatId);

            break;

            case 'remove_agent':

            await bot.sendMessage(chatId, 'Are you sure you want to remove this agent?', {

                reply_markup: confirm_remove_agent
            }).then((message) => {

                userState[chatId].lastBotMessageId = message.message_id;
            })

            break;

            case 'yes_remove_agent':

            bot.deleteMessage(chatId, userState[chatId].lastBotMessageId);
            userState[chatId].lastBotMessageId = 0;

            await remove_agent(chatId);

            bot.sendMessage(chatId, `✅ Agent removed successfully!`).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

            view_agents(chatId);

            break;

            case 'cancel_remove':

            bot.deleteMessage(chatId, userState[chatId].lastBotMessageId);
            userState[chatId].lastBotMessageId = 0;

            break;

        }

        // Vendor modules

        switch(data){

            case 'vendor_main':

            admin.buttonClicked = ''

            vendors_main(chatId);


            break;

            case 'add_vendor':

            set_vendor_info.userName = 'username';
            set_vendor_info.businessName = 'Seller Name';
            set_vendor_info.chatId = 0;

            add_vendor(chatId);

            break;

            case 'toggle_active':

            set_vendor_info.banned = !set_vendor_info.banned;

            add_vendor(chatId);

            break;

            case 'confirm_vendor':

            await confirm_vendor(chatId);

            break;

            case 'manage_vendors':

            admin.buttonClicked = 'manage_vendor' 

            await view_vendors(chatId);

            break;

            case 'set_business_name':

            await set_business_name(chatId);

            break;

            case 'remove_vendor':

            await bot.sendMessage(chatId, 'Are you sure you want to remove this vendor?', {

                reply_markup: confirm_remove_vendor
            }).then((message) => {

                userState[chatId].lastBotMessageId = message.message_id;
            })

            break;

            case 'yes_remove_vendor':

            bot.deleteMessage(chatId, userState[chatId].lastBotMessageId);
            userState[chatId].lastBotMessageId = 0;

            await remove_vendor(chatId);

            bot.sendMessage(chatId, `✅ Vendor removed successfully!`).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

            view_vendors(chatId);

            break;

            case 'pause_vendor':
            
            if(admin.lastVisited === 'view_vendor'){

                let v_id = admin.v_id;
                let vendor = vendors[v_id - 1];
                vendor.banned = !vendor.banned;
    
                const supVendor = await Vendor.findOne({ 'vendors.userName': vendor.userName.toLowerCase() });
    
                if(supVendor) {
    
                    console.log("Sup Vendor", supVendor);
    
                    const vdr = supVendor.vendors.find(v => v.userName.toLowerCase() === vendor.userName.toLowerCase());
    
                    if(vdr){
    
                        vdr.banned = vendor.banned;
                        
                        supVendor.markModified('vendors');
    
                    }
    
                    await supVendor.save();
                }
    
                await select_vendor(chatId, v_id);
                await view_vendors(chatId);

            }

            break;
        }

// Session creation        

        switch(data){

            case 'create_session':

            create_new_session(chatId);

            break;

            case 'session_cust':

            set_session_cust(chatId);

            break;

            case 'session_vendor':

            admin.buttonClicked = 'session_vendor'

            view_vendors(chatId);

            break;

            case 'session_userType':

            toggle_custType(chatId);

            break;

            case 'confirm_create_session':

            if(set_session_info.cust === 'customer'){

                bot.sendMessage(chatId, 'Please set customer username').then((message) => {

                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);

                })

                return
            }

            if(set_session_info.vendorUn === 'vendor'){

                bot.sendMessage(chatId, 'Please set vendor username').then((message) => {

                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);

                })

                return
            }

            create_manual_session(chatId, set_session_info);

            break;

        }

// Chat Expand for admin

if (data.startsWith('expand_')) {

    const sessionId = (data.split('_')[1]).toString();

    try{
        const session = chatLogs[sessionId]? chatLogs[sessionId][0] : null;

        if(session){

            const msgIds = session.msgIds;

            const shrink_kb = await get_shrink_kb(sessionId);

            const formattedMessage = formatChatLog(sessionId);
    
            for(const admin of admins){

                const msgId = msgIds[admin.chatId];

                bot.editMessageText(formattedMessage, {
                    chat_id: admin.chatId,
                    reply_markup: shrink_kb,
                    message_id: msgId,
                    parse_mode: 'Markdown'
                });

            }

    
        }
    
        if(!session){ return };

    }catch(error){

        console.log(error);
    }

                 
} 

if (data.startsWith('shrink_')) {

    const sessionId = (data.split('_')[1]).toString();
    console.log("Shrink Session", sessionId);

    try{
        const session = chatLogs[sessionId]? chatLogs[sessionId][0] : null;

        console.log(session);

        if(session){

            const msgIds = session.msgIds;

            const expand_kb = await get_expand_kb(sessionId);

            const shrinkChatMsg = shrink_chat(sessionId);

            console.log("Shrinked msd", shrinkChatMsg);
    
            for(const admin of admins){

                const msgId = msgIds[admin.chatId];

                bot.editMessageText(shrinkChatMsg, {
                    chat_id: admin.chatId,
                    reply_markup: expand_kb,
                    message_id: msgId,
                    parse_mode: 'Markdown'
                });

            }


            return
    
        }
    
        if(!session){ return };

    }catch(error){

        console.log(error);
    }

                 
} 

//Enter the chat room

        if (data.startsWith('sneakinto_')) {

            const sessionId = (data.split('_')[1]).toString();

            vendor_sneak_into(chatId, sessionId);
                         
        } 

//Manage session

        const agent = agents.find(agent => agent.chatId === chatId);

        if(!agent) { return };

        let currentIndex = agent.sessions.findIndex(session => session.includes(agent.sessionId));

        if(data === 'prev_session' && currentIndex > 0){

            currentIndex -= 1;

        }else if(data === 'next_session' && currentIndex < agent.sessions.length -1){

            currentIndex += 1;
        }

        agent.sessionId = agent.sessions[currentIndex];
        const formatAgentMsg = formatAgentLog(agent.sessionId);
        const session_nav = create_session_nav(agent.sessions, currentIndex);

        bot.editMessageText(formatAgentMsg, {
            chat_id: chatId,
            message_id: agent.agentMsgId,
            reply_markup: session_nav,
            parse_mode: 'Markdown',
        });

    }catch(error){

        console.log(error);
    }

}catch(error){

    console.log("Error occured in Callback module", error);
}

}



module.exports = { callbackManager };

