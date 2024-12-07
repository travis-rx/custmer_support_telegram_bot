const { vendors, admins, set_vendor_info } = require('../../mongodb/sync_users');

const manage_vendors_kb = {

    inline_keyboard: [
        [
            {
                text: 'Add Vendor',
                callback_data: 'add_vendor'
            },
            {
                text: 'Manage Vendors',
                callback_data: 'manage_vendors'
            }
        ]
    ]
}

async function add_vendor_kb(chatId){

    const { userName, banned, businessName } = set_vendor_info;

    const admin = admins.find(admin => admin.chatId === chatId);

    const add_vendor = {

        inline_keyboard: [
            [
                {
                    text: `@${userName}`,
                    callback_data: 'user_name'
                },
                {
                    text: `${businessName}`,
                    callback_data: `set_business_name`
                }
            ],
            [
                {
                    text: `${banned === true ? 'Inactive 🔴' : '🟢 Active'}`,
                    callback_data: `toggle_active`
                },
                {
                    text: `➕ Confirm`,
                    callback_data: 'confirm_vendor'
                }
            ],
            [
                {
                    text: `⬅ Back`,
                    callback_data: `${admin.lastVisited}`
                }
            ]
        
        ]
    }

    return add_vendor
}

async function vendor_kb(chatId, vendorId){

    const vendor = vendors.find(vendor => vendor.chatId === vendorId);
    const admin = admins.find(admin => admin.chatId === chatId);

    const { banned, businessName } = vendor;

    admin.lastVisited = 'view_vendor'

    const kb = {
    
        inline_keyboard: [
            [
                {
                    text: `${banned === true ? '☑️' : '✅'} Active`,
                    callback_data: `pause_vendor`
                },
                {
                    text: `${businessName}`,
                    callback_data: `set_business_name`
                }
            ],
            [
                {
                    text: '🗑 Remove Vendor',
                    callback_data: 'remove_vendor'
                },
                {
                    text: '✖ Close',
                    callback_data: 'close_window'
                }
            ]
        ]
    }

    return kb

}

module.exports = { manage_vendors_kb, add_vendor_kb, vendor_kb}