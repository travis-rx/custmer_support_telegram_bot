const { userState, admins, set_agent_info, agents, syncAgents, chatLogs } = require('../../mongodb/sync_users');

const cust_q1 = {
    inline_keyboard: [
        [{
            text: '1',
            callback_data: 'firstCust'
        },{
            text: '2',
            callback_data: 'regCust'
        }]
    ]
}

const cust_q2 = {
    inline_keyboard: [
        [{
            text: '1',
            callback_data: 'service_help'
        },
        {
            text: '2',
            callback_data: 'purchase_issue'
        },
        {
            text: '3',
            callback_data: 'other_help'
        }]
    ]
}

const vendor_q2 = {
    inline_keyboard: [
        [{
            text: '1',
            callback_data: 'service_help'
        },
        {
            text: '2',
            callback_data: 'missing_product'
        },
        {
            text: '3',
            callback_data: 'other_help'
        }]
    ]
}

async function inviteKeyboard(sessionId){

    const invite_keyboard = {

        inline_keyboard: [
            [{
                text: 'I take responsibility',
                callback_data: `sneakinto_${sessionId}`
            }]
        ]
    }

    return invite_keyboard

}

const resolve_keyboard = {
    inline_keyboard: [
        [{
            text: 'Yes, Resolved!',
            callback_data: 'yes_resolved'
        },
        {
            text: 'Not yet!',
            callback_data: 'close_window'
        }]
    ]
}

const admin_keyboard = {

    keyboard: [
        [{
            text: '🚚 Vendors',
            callback_data: 'vendors_panel'
        },{
            text: '💻 Agents',
            callback_data: 'agents_panel'
        }],
        [{
            text: '👥 Create Session',
            callback_data: 'create_session'
        }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false
}

const manage_agents_kb = {

    inline_keyboard: [
        [
            {
                text: 'Add Agent',
                callback_data: 'add_agent'
            },
            {
                text: 'Manage Agents',
                callback_data: 'manage_agent'
            }
        ]
    ]
}

async function agent_kb(chatId, agentId){

    const agent = agents.find(agent => agent.chatId === agentId);

    console.log(agent)

    let banned = agent.banned;

    const kb = {
    
        inline_keyboard: [
            [
                {
                    text: `Role: ${agent.agentType}`,
                    callback_data: 'toggle_role'
                },
                {
                    text: `Tier${agent.tier}`,
                    callback_data: `update_tier`
                },
                {
                    text: `${banned === true ? 'Inactive 🔴' : '🟢 Active'}`,
                    callback_data: `pause_agent`
                }

            ],
            [
                {
                    text: '✖ Close',
                    callback_data: 'close_agent_window'
                },
                {
                    text: '🗑 Remove Agent',
                    callback_data: 'remove_agent'
                }
            ]
        ]
    }

    return kb

}

const confirm_remove_agent = {

    inline_keyboard: [
        [
            {
                text: 'Yes, sure!',
                callback_data: 'yes_remove_agent'
            },
            {
                text: 'Not Really!',
                callback_data: 'cancel_remove'
            }
        ]
    ]
}

const confirm_remove_vendor = {

    inline_keyboard: [
        [
            {
                text: 'Yes, sure!',
                callback_data: 'yes_remove_vendor'
            },
            {
                text: 'Not Really!',
                callback_data: 'cancel_remove'
            }
        ]
    ]
}

async function add_agent_kb(chatId){

    let agentType = set_agent_info.agentType;
    let tier = set_agent_info.tier;
    let userName = set_agent_info.userName.toLowerCase();

    const admin = admins.find(admin => admin.chatId === chatId);

    const add_agent = {

        inline_keyboard: [
            [
                {
                    text: `@${userName}`,
                    callback_data: 'user_name'
                },
                {
                    text: `Tier ${tier}`,
                    callback_data: 'set_tier'
                }
            ],
            [
                {
                    text: `${agentType === 'support' ? ' ✅' : ''} Support Agent`,
                    callback_data: 'support_agent'
                }, {
                    text: `${agentType === 'qa' ? ' ✅' : ''} QA Agent`,
                    callback_data: 'qa_agent'
                }
            ],
            [
                {
                    text: `⬅ Back`,
                    callback_data: `${admin.lastVisited}`
                },
                {
                    text: `➕ Confirm`,
                    callback_data: 'confirm_agent'
                }
            ]
        
        ]
    }

    return add_agent
}

async function get_expand_kb(sessionId){

    const unread_msg_count = chatLogs[sessionId].length - 4;

        const expand_kb = {
            inline_keyboard: [

            [
                {
                    text: `📋 View Full (${unread_msg_count})`,
                    callback_data: `expand_${sessionId}`
                }
            ]

         ]
    }
    
    return expand_kb
}

async function get_shrink_kb(sessionId){

        const shrink_kb = {
            inline_keyboard: [

            [
                {
                    text: `▲ Close`,
                    callback_data: `shrink_${sessionId}`
                }
            ]

         ]
    
    }

    return shrink_kb
}



module.exports = {cust_q1, cust_q2, vendor_q2, inviteKeyboard, resolve_keyboard, get_expand_kb, get_shrink_kb, admin_keyboard, confirm_remove_agent, confirm_remove_vendor, add_agent_kb, agent_kb, manage_agents_kb}