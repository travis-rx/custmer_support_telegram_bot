const bot = require('../../main/bot');
const { userState, vendors, agents, ensureUserExists, chatLogs } = require("../../mongodb/sync_users");
const { inviteKeyboard } = require('../../src/keyboards');
const { agent_keyboard } = require('../keyboards/agent');

async function vendor_list(chatId){

    await ensureUserExists(chatId);

    try{

        const agent = agents.find(agent => agent.chatId === chatId);

        const sessionInfo = chatLogs[agent.sessionId]? chatLogs[agent.sessionId][0] : null;

        const isVendor = vendors.find(vendor => vendor.chatId === sessionInfo.custId);

        const activeVendors = vendors.filter(vendor => vendor.chatId > 0 && vendor.banned === false);

        agent.buttonClicked = 'invite_vendor';

        let message = ''

        if (activeVendors.length === 0) {
            message = `No vendors found!`;

            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
            }).then((message => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);

            }));

            agent.buttonClicked = '';

            return

        } 
        
            let formattedMessage = '';
        
            activeVendors.forEach((vendor, index) => {

                const { businessName, banned } = vendor;

                let active = 'No'

                if(!banned){

                    active = 'Yes'
                }
        
                formattedMessage += `\n*${index + 1} | ${businessName} | Active*: ${active}\n`;
            });
        
            message = `\n*👑 Select a seller!*:\n${formattedMessage}\n_Reply with the id of the respective seller whome to be invited_`;
                  
            if(sessionInfo && !isVendor){

                bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: agent_keyboard
                }).then((message => {

                    userState[chatId].lastBotMessageId = message.message_id;

                }));

            }else{
                return null
            }

            
    }catch(error){

        console.log("Error", error);

        bot.sendMessage(chatId, error, {
            parse_mode: 'Markdown'    
        });

    }


}

async function send_invite(chatId, v_id){

    console.log("Hello here v_id", v_id);

    let agent = agents.find(agent => agent.chatId === chatId);

    const sessionId = agent.sessionId;

    const sessionInfo = chatLogs[sessionId][0];

    const activeVendors = vendors.filter(vendor => vendor.chatId > 0 && vendor.banned === false);

        if(!v_id || v_id > activeVendors.length){

            bot.sendMessage(chatId, `❗Invalid vendor Id`).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

            return null

        }

            let vendor = activeVendors[v_id - 1];

            if(!vendor || !sessionId){ return };

            agent.vendorId = vendor.chatId;

            const photos = sessionInfo.photos; 
            const invite_keyboard = await inviteKeyboard(sessionId);
            
            async function sendInvites(caption){

                const mediaGroup = photos.map((photo, index) => ({
                    type: 'photo',
                    media: photo,
                    caption: index === 0 ? `#TICKET${sessionId}` : '',
                    parse_mode: 'Markdown'
                }));
            
                bot.sendMediaGroup(agent.vendorId, mediaGroup, {
                    reply_markup: invite_keyboard,
                    parse_mode: 'Markdown'
                })
                    .then(messages => {

                        return bot.sendMessage(agent.vendorId, caption, {
                            reply_markup: invite_keyboard,
                            parse_mode: 'Markdown'
                        });

                    })
                    .catch(error => {
                        console.error(`Error sending media group to chatId: ${agent.vendorId}`, error);
                    });

                    agent.buttonClicked = 'vendor_main'

            };
                        
                const caption = `Hello, a customer needs your help! \n\n ${sessionInfo.enquiry}`;
                await sendInvites(caption);
        
            return

}

module.exports = { vendor_list, send_invite };