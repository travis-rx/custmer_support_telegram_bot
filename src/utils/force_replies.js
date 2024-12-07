const bot = require('../../main/bot');
const { set_agent_info, set_vendor_info, agents, admins, vendors, syncVendors, set_session_info, get_users } = require('../../mongodb/sync_users');
const { Agent, Vendor } = require('../../mongodb/db_connect');
const add_agent = require('../ui_modules/add_agent');
const add_vendor = require('../ui_modules/add_vendor');
const agents_main = require('../ui_modules/agents_main');
const { select_agent } = require('../ui_modules/manage_agents');
const { select_vendor, view_vendors } = require('../ui_modules/manage_vendors');
const { create_new_session } = require('../ui_modules/create_session');

async function set_user_name(chatId) {

    const admin = admins.find(admin => admin.chatId === chatId);

    const users = await get_users();

    try {
        const sentMessage = await bot.sendMessage(chatId, 'Enter the agent username, For Eg: @brad_123', {
            reply_markup: {
                force_reply: true
            }
        });

        let resolved = false;

        const replyMsg = await new Promise((resolve) => {

            const listener = (msg) => {
                if (msg.chat.id === chatId && msg.message_id !== sentMessage.message_id) {
                    resolve(msg);
                    resolved = true;
                    bot.deleteMessage(chatId, sentMessage.message_id);
                }
            };

            bot.on('message', listener);

            setTimeout(() => {
                if(resolved){ return null };
                bot.removeListener('message', listener);
                bot.deleteMessage(chatId, sentMessage.message_id);
            }, 25 * 1000); // 25 sec timeout
        });

        const input = replyMsg.text;
        if (input === null) {
            return await set_user_name(chatId);
        }
        
        console.log("UN", input);

        bot.deleteMessage(chatId, replyMsg.message_id);

        if (/^@[a-zA-Z0-9_]+$/.test(input)) {

            const userName = input.substring(1); 

            const user = users.find(user => user.userName === (userName.toLowerCase()));
            const agent = agents.find(agent => agent.userName === (userName.toLowerCase()) && agent.banned === false);
            const vendor = vendors.find(vendor => vendor.userName === (userName.toLowerCase()) && vendor.banned === false);
            const isAdmin = admins.find(admin => admin.userName.toLocaleLowerCase() === (userName.toLowerCase()));

        if (input === null) { return await set_session_cust(chatId) }

        if(isAdmin){

            bot.sendMessage(chatId, 'Admin account can not be added!', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            })

            return
        }

        if(!user){

            bot.sendMessage(chatId, 'User not found in the Database, request user to interact with the bot first!', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            })

            return
        }


            if(admin.lastVisited === 'agent_main'){

                if(vendor){

                    bot.sendMessage(chatId, 'User found in vendors list, please remove or pause the agent to add as agent!', { parse_mode: 'Markdown'}).then((message) => {
        
                        setTimeout(() => {
                            bot.deleteMessage(chatId, message.message_id);
                        }, 10000);
        
                    });
        
                    return
                }

                set_agent_info.userName = userName.toLowerCase();
                set_agent_info.chatId = Number(user.chatId);

                add_agent(chatId);
            }

            if(admin.lastVisited === 'vendor_main'){

                if(agent){

                    bot.sendMessage(chatId, 'User found in agents list, please remove or pause the agent to add as vendor!', { parse_mode: 'Markdown'}).then((message) => {
        
                        setTimeout(() => {
                            bot.deleteMessage(chatId, message.message_id);
                        }, 10000);
        
                    });
        
                    return
                }

                set_vendor_info.userName = userName.toLowerCase();
                set_vendor_info.chatId = Number(user.chatId);

                add_vendor(chatId);
            }

        }else {

            bot.sendMessage(chatId, `_⛔ Invalid username format!_`, { parse_mode: 'Markdown'}).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
            });

        }
    } catch (error) {
        // Handle any errors gracefully
        console.error(error);
        throw error;
    }
}

async function set_business_name(chatId) {

    const admin = admins.find(admin => admin.chatId === chatId);

    try {

        const sentMessage = await bot.sendMessage(chatId, 'Enter the seller business name, For Eg: Mumbai Banana Seller', {
            reply_markup: {
                force_reply: true
            }
        });

        let resolved = false;

        const replyMsg = await new Promise((resolve) => {
            const listener = (msg) => {
                if (msg.chat.id === chatId && msg.message_id !== sentMessage.message_id) {
                    resolve(msg);
                    resolved = true;
                    bot.deleteMessage(chatId, sentMessage.message_id);
                }
            };

            bot.on('message', listener);

            setTimeout(() => {
                if(resolved){ return null };
                bot.removeListener('message', listener);
                bot.deleteMessage(chatId, sentMessage.message_id);
            }, 25 * 1000); // 25 sec timeout
        });

        const businessName = replyMsg.text;
        const alreadyExist = vendors.find(vendor => vendor.businessName === replyMsg.text.toLowerCase());

        if (businessName === null) {

            await set_business_name(chatId);
    
        }

        if (alreadyExist) {

            bot.sendMessage(chatId, 'Duplicate Seller Name: Same name assigned to another seller!', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            });
    
        }
            
    
        bot.deleteMessage(chatId, replyMsg.message_id);

        if(admin.lastVisited === 'vendor_main'){

            set_vendor_info.businessName = businessName;

            add_vendor(chatId);

        }

        if(admin.lastVisited === 'view_vendor'){

            const userName = set_vendor_info.userName;

            const vendor = vendors.find(vendor => vendor.userName === userName.toLowerCase())

            const supVendor = await Vendor.findOne({ 'vendors.userName': vendor.userName.toLowerCase()});
        
            if(supVendor) {
        
                const vdr = supVendor.vendors.find(v => v.userName === vendor.userName);
        
                if(vdr){
        
                    vdr.businessName = businessName;
                    
                    supVendor.markModified('vendors');
        
                }
        
                await supVendor.save();
            }

            await syncVendors();

            view_vendors(chatId);
            select_vendor(chatId, admin.v_id)
        }
        
    } catch (error) {
        // Handle any errors gracefully
        console.error('Error editing business name:', error);
        throw error;
    }
}


async function toggle_tier(chatId){

    try{

        let tier = set_agent_info.tier;

        if (tier === 2) {
            set_agent_info.tier = 1;
        } 
    
        if (tier === 1) {
            set_agent_info.tier = 2;
        } 
            
        add_agent(chatId);
    }catch(error){

        console.log(error);
    }

}

async function toggle_role(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{
            
        let ag_id = admin.a_id;
        let agent = agents[ag_id - 1];

        let agentType = agent.agentType;

        if (agentType === 'support') {
            agent.agentType = 'qa';
        } 
    
        if (agentType === 'qa') {
            agent.agentType = 'support';
        } 

        const supAgent = await Agent.findOne({ 'agents.userName': agent.userName.toLowerCase() });

        if(supAgent) {

            console.log("Sup Agent", supAgent);

            const ag = supAgent.agents.find(a => a.userName === agent.userName.toLowerCase());

            if(ag){

                ag.agentType = agent.agentType;
                
                supAgent.markModified('agents');

            }

            await supAgent.save();
        }

        await select_agent(chatId, ag_id);

    }catch(error){

        console.log(error);
    }

}

async function update_tier(chatId){

    const admin = admins.find(admin => admin.chatId === chatId);

    try{
            
        let ag_id = admin.a_id;
        let agent = agents[ag_id - 1];

        let tier = agent.tier;

        if (tier === 1) {
            agent.tier = 2;
        } 
    
        if (tier === 2) {
            agent.tier = 1;
        } 

        const supAgent = await Agent.findOne({ 'agents.userName': agent.userName.toLowerCase() });

        if(supAgent) {

            const ag = supAgent.agents.find(a => a.userName === agent.userName.toLowerCase());

            if(ag){

                ag.tier = agent.tier;
                
                supAgent.markModified('agents');

            }

            await supAgent.save();
        }

        await select_agent(chatId, ag_id);

    }catch(error){

        console.log(error);
    }

}

async function set_session_cust(chatId){

    try {

        const users = await get_users();

        console.log("USers", users);

        const sentMessage = await bot.sendMessage(chatId, 'Enter the agent username, For Eg: @brad123', {
            reply_markup: {
                force_reply: true
            }
        });

        let resolved = false;

        const replyMsg = await new Promise((resolve) => {
            const listener = (msg) => {
                if (msg.chat.id === chatId && msg.message_id !== sentMessage.message_id) {

                    resolve(msg);
                    resolved = true;
                    bot.deleteMessage(chatId, sentMessage.message_id);

                }
            };

            bot.on('message', listener);

            setTimeout(() => {
                if(resolved){ return null };
                bot.removeListener('message', listener);
                bot.deleteMessage(chatId, sentMessage.message_id);
            }, 30 * 1000); // 30 sec timeout
        });

        const input = replyMsg.text;

        bot.deleteMessage(chatId, replyMsg.message_id);

        if (/^@[a-zA-Z0-9_]+$/.test(input)) {

            const userName = input.substring(1); 

            const user = users.find(user => user.userName === (userName.toLowerCase()));
            const agent = agents.find(agent => agent.userName === (userName.toLowerCase()) && agent.banned === false);
            const vendor = vendors.find(vendor => vendor.userName === (userName.toLowerCase()) && vendor.banned === false);
            const isAdmin = admins.find(admin => admin.userName.toLocaleLowerCase() === (userName.toLowerCase()));

        if (input === null) { return await set_session_cust(chatId) }

        if(isAdmin){

            bot.sendMessage(chatId, 'Admin account can not be added to the session!', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            })

            return
        }

        if(!user){

            bot.sendMessage(chatId, 'User not found in the Database, request user to interact with the bot first!', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            })

            return
        }

        if(agent){

            bot.sendMessage(chatId, 'User found in agents list, please remove or pause the agent to add as user!', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            });

            return
        }

        if(vendor){

            bot.sendMessage(chatId, 'User found in vendors list, please make sure the entry is valid', { parse_mode: 'Markdown'}).then((message) => {

                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 10000);

            });

            return
        }

        set_session_info.cust = userName;
        set_session_info.custId = parseInt(user.chatId);
        create_new_session(chatId);

        } else {
            
            bot.sendMessage(chatId, `_⛔ Invalid username format!_`, { parse_mode: 'Markdown' }).then((message) => {
                setTimeout(() => {
                    bot.deleteMessage(chatId, message.message_id);
                }, 5000);
                
                return
            });

        }

    } catch (error) {
        // Handle any errors gracefully
        console.error('Error:', error);
        throw error;
    }

}

async function toggle_custType(chatId){

try{
        
    let custType = set_session_info.custType;

    if (custType === 'regCust') {
        set_session_info.custType = 'firstCust';

        await create_new_session(chatId);

        return

    } 

    if (custType === 'firstCust') {
        set_session_info.custType = 'regCust';

        await create_new_session(chatId);

        return

    } 

}catch(error){

    console.log(error);
}

}

module.exports = { set_user_name, set_business_name, toggle_tier, update_tier, toggle_role, set_session_cust, toggle_custType }