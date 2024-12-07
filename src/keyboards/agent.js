const { agents, chatLogs } = require('../../mongodb/sync_users')

    const agent_keyboard = {

        keyboard: [
            [{
                text: '📣 Add Vendor',
                callback_data: 'invite_panel'
            },{
                text: '⏏ Remove Vendor',
                callback_data: 'remove_panel'
            }],
    
            [{
                text: '🔄 Transfer Ticket',
                callback_data: 'customers_panel'
            },{
                text: '👍 Resolve Ticket',
                callback_data: 'customers_panel'
            }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    }


function create_session_nav(agentSessions, currentIndex) {

    const inline_keyboard = [];

    if (agentSessions.length > 1) {

        const row = [];

        if (currentIndex > 0) {
            row.push({ text: `◀ Session ${currentIndex}`, callback_data: 'prev_session' });
        }

        if (currentIndex < agentSessions.length - 1) {
            row.push({ text: `Session ${currentIndex + 2} ▶`, callback_data: 'next_session' });
        }
        inline_keyboard.push(row);
    }
    return { inline_keyboard };
}

module.exports = { agent_keyboard, create_session_nav }