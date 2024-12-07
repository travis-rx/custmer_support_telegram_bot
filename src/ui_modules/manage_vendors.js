const { vendor_kb } = require('../keyboards/vendor');
const { userState, vendors, admins, ensureUserExists, syncVendors, set_vendor_info, set_session_info } = require('../../mongodb/sync_users')
const bot = require('../../main/bot');
const { create_new_session } = require('../ui_modules/create_session');


async function view_vendors(chatId){

    await ensureUserExists(chatId);
    await syncVendors();

    const admin = admins.find(a => a.chatId === chatId);
    
    try{

        let lastBotMessageId = admin.lastBotMessageId;

        let message;

        if (vendors.length === 0) {
            message = `_No vendors found!_`;

            if(admin.buttonClicked === 'session_vendor'){

                admin.buttonClicked = 'create_session';
            }

            if(admin.buttonClicked === 'manage_vendor'){

                admin.lastVisited = 'vendor_main';

            }

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown'}).then((msg => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, msg.message_id);
                }, 5000);        
            }));

            return
        } 

        if(admin.buttonClicked === 'manage_vendor'){

            admin.buttonClicked = 'vendor_main'
            admin.lastVisited = 'view_vendor'
        }
        
            let formattedMessage = '';
        
            vendors.forEach((vendor, index) => {

                const { userName, available, banned, businessName } = vendor;

                let onChat = 'No'
                let active = 'No'

                if(!available){

                    onChat = 'Yes'
                }

                if(!banned){

                    active = 'Yes'
                }
        
                formattedMessage += `\n*${index + 1}* \`@${userName}\` | ${businessName} | *OnChat*: ${onChat} | *Active*: ${active}\n`;
            });
        
            message = `\n*👑 List of vendors who are added to the bot!*:\n${formattedMessage}\n\nReply with the id of the respective vendor whome you wish to modify`;
        
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
                  
        if (lastBotMessageId === 0 && message !== '') {
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: back_to_manage
            }).then((message) => {
                admin.lastBotMessageId = message.message_id;
            });
        } 
        
        if (lastBotMessageId > 0 && message !== '') {
            
            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: lastBotMessageId,
                parse_mode: 'Markdown',
                reply_markup: back_to_manage
            });

            userState[chatId].lastBotMessageId = 0; // To make sure view vendors resets the messageid
        }
        
    }catch(error){

        bot.sendMessage(chatId, "Error in manage_vendors", {
            // reply_markup: buyKeyBoard,
            parse_mode: 'Markdown',
            // disable_web_page_preview: true
    
        });

        return

    }


}

async function select_vendor(chatId, v_id){

        const value = parseInt(v_id);

        const admin = admins.find(a => a.chatId === chatId);

        if(!value){

            return

        }

            if(value > vendors.length){

                bot.sendMessage(chatId, `❗Invalid vendor Id`).then((message) => {
                    setTimeout(() => {
                        bot.deleteMessage(chatId, message.message_id);
                    }, 5000);
                });

                return

            }

                admin.v_id = value;

                let vendor = vendors[value - 1];

                if(!vendor){ return }

                if(admin.buttonClicked === 'session_vendor'){

                    set_session_info.vendorUn = vendor.userName;
                    set_session_info.vendorId = vendor.chatId;
                    create_new_session(chatId);
                    admin.buttonClicked = 'create_session'
                    return

                }

                const { userName, available, banned, businessName } = vendor;

                set_vendor_info.userName = userName.toLowerCase();
                set_vendor_info.businessName = businessName;

                let onChat = 'No'
                let paused = 'No'

                if(!available){

                    onChat = 'Yes'
                }

                if(banned){

                    paused = 'Yes'
                }
        
                let message =  `\`@${userName}\`\n${businessName}\n*OnChat*: ${onChat}\n*Paused*: ${paused}`;

                const kb = await vendor_kb(chatId, vendor.chatId);

                if(userState[chatId].tempMsgId > 0){

                    try{

                        bot.deleteMessage(chatId, userState[chatId].tempMsgId);
                    }catch(error){

                        console.log(error.message);
                    }

                }

                try{


                    bot.sendMessage(chatId, message, {
                        reply_markup: kb,
                        parse_mode: 'Markdown',
                    }).then((message) => {
                        userState[chatId].tempMsgId = message.message_id;

                        setTimeout(() => {
                            if(userState[chatId].tempMsgId > 0 && userState[chatId].tempMsgId === message.message_id){
                                bot.deleteMessage(chatId, message.message_id);
                            }

                        }, 45000);
        
                    });

                return

                }catch(error){

                    console.log(error);
                }


    
}

module.exports = { view_vendors, select_vendor }