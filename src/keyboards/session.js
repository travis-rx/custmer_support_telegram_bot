const { set_session_info } = require('../../mongodb/sync_users');
const bot = require('../../main/bot');


async function create_session_kb(chatId){

    const { custType, cust, custId, vendorUn, vendorId } = set_session_info;

    const create_session = {

        inline_keyboard: [
            [
                {
                    text: `Cust: @${cust}`,
                    callback_data: 'session_cust'
                },
                {
                    text: `Vendor: @${vendorUn}`,
                    callback_data: `session_vendor`
                }
            ],
            [
                {
                    text: `Cust Type: ${custType}`,
                    callback_data: `session_userType`
                },
                {
                    text: `Create 🤝`,
                    callback_data: `confirm_create_session`
                }
            ],
            [
                {
                    text: `⬅ Back`,
                    callback_data: `cancel_session_creation`
                }
            ]
        
        ]
    }

    return create_session
}




module.exports = { create_session_kb }