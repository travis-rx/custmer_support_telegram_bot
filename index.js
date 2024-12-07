const bot = require('./main/bot');
const { start } = require('./src/ui_modules/start_ui');
const { callbackManager } = require('./src/callback/callbackManager');
const { User } = require('./mongodb/db_connect');
const { userState, ensureUserExists, agents, vendors, admins, auto_sessions, manual_sessions, chatLogs, get_users } = require('./mongodb/sync_users');
const msg_streamer = require('./src/agent_portal/msg_streamer');
const { close_ticket, formatChatLog, formatAgentLog } = require('./src/utils');
const invite_vendor = require('./src/agent_portal/invite_vendor')
const resolve_ticket = require('./src/agent_portal/resolve_ticket')
const { resolve_query } = require('./src/utils');
const { admin_keyboard } = require('./src/keyboards');
const admin_start = require('./src/ui_modules/admin_start');
const { vendor_start } = require('./src/ui_modules/vendor_start');
const { agent_keyboard, session_nav, create_session_nav } = require('./src/keyboards/agent');

try{

bot.onText(/\/(start)/, (msg, match) => {
    const command = match[1]; 
    const chatId = msg.chat.id;   

    (async() => {
    
    try{

        await ensureUserExists(chatId);

        const vendor = vendors.find(vendor => vendor.chatId === chatId);
        const agent = agents.find(agent => agent.chatId === chatId);

        const users = await get_users();

        const missingUn = users.find(u => u.chatId === chatId.toString() && u.userName === '');
    
        const username = (msg.from.username || msg.from.first_name).toLowerCase()

        if(missingUn){
    
            try {
                    await User.findOneAndUpdate(
                        { chatId: chatId.toString() },
                        { $set: { userName: username } }
                    );
            
            }catch(error){
    
                console.log("Error in callbackManager, updating user name", error);
            }
        }

    switch (command) {
        
        case 'start':

        userState[chatId].buttonClicked = 'start';
        userState[chatId].userName = username;
            
        const admin = admins.find(a => a.chatId === chatId);

            if(admin){

                admin.buttonClicked = 'start'

                const message = `Welcome to the SupChat's admin panel`

                await admin_start(chatId, message);

                break;

            }
            
         if(agent){ 

            const agentMsgId = agent.agentMsgId;
            const sessionId = agent.sessionId;

            const session = chatLogs[sessionId];

            bot.sendMessage(chatId, 'Manage the session with the buttons below!', { reply_markup: agent_keyboard });

            if(session && agentMsgId > 0){

                const sessionInfo = session[0];

                const formattedMessage = formatAgentLog(sessionId);

                const sentMessage = await bot.sendMessage(chatId, formattedMessage, {
                    parse_mode: 'Markdown'
                });

                agent.agentMsgId = sentMessage.message_id;

                return

            }

            return
          }

          const isInAutoQueue = auto_sessions.length > 0? auto_sessions.find(session => session.chatId === chatId) : null;
          const isInManualQueue = manual_sessions.length > 0? manual_sessions.find(session => session.set_session_info.custId === chatId) : null;


          if(isInAutoQueue){

            const index = auto_sessions.findIndex(session => session.chatId === chatId);

            bot.sendMessage(chatId, `_Please wait! You are already in queue at position ${index + 1}_`, {

                parse_mode: 'Markdown'

            }).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);

            });

            return

          }

          if(isInManualQueue){

            const index = manual_sessions.findIndex(session => session.chatId === chatId);

            bot.sendMessage(chatId, `_You are already in queue at position ${index + 1}, Please wait!_`, {

                parse_mode: 'Markdown'

            }).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);

            });

            return

          }

            if(userState[chatId].sessionId !== ''){ 

                bot.sendMessage(chatId, '_You are already in a session, please text your queries!_', {

                    parse_mode: 'Markdown'

                }).then((message) => {

                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);

                });
                
                return
             }

            if(vendor){

                userState[chatId].userType = 'vendor';

                vendor_start(chatId);

                return
            }

            start(chatId);
            break;

            default:
            bot.sendMessage(chatId, 'Invalid command');
            break;
    }

}catch(error){
    console.log(error);
}
    })();

});
    
}catch(error){
    console.log(error);
}

bot.on('callback_query', callbackManager);
bot.on('message', msg_streamer);

bot.on('polling_error', (error) => {
    console.log(error.code);  // => 'EFATAL'
    });

