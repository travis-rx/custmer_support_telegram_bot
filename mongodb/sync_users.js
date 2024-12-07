const { User, Agent, Vendor, ChatLog } = require('./db_connect');

const userState = {};
const timeouts = {};
const chatLogs = {};

let agents = [];
let vendors = [];
let auto_sessions = [];
let manual_sessions = [];

const set_agent_info = {

    userName: 'username',
    chatId: 0,
    tier: 2,
    agentType: 'support',
    banned: false

}

const set_vendor_info = {

    userName: 'username',
    chatId: 0,
    banned: false,
    businessName: 'Seller Name'

}

const set_session_info = {

    custType: 'regCust',
    cust: 'customer',
    custId: 0,
    vendorUn: 'vendor',
    vendorId: 0
}

const admins = [
{
    
    chatId: 123456,
    userName: 'ADMIN USERNAME HERE',
    tier: 0,
    lastVisited: '',
    lastBotMessageId: 0,
    pinnedMsgId: 0,
    buttonClicked: '',
    custId: 0,
    vendorId: 0,
    a_id: 0,
    v_id: 0,
    temp: ''

}, {
    
    chatId: 123456,
    userName: 'ADMIN2 USERNAME HERE',
    tier: 0,
    lastVisited: '',
    lastBotMessageId: 0,
    pinnedMsgId: 0,
    buttonClicked: '',
    custId: 0,
    vendorId: 0,
    a_id: 0,
    v_id: 0,
    temp: ''
}
]

// Test

// const admins = [{
    
//     chatId: 123456,
//     userName: 'Travis_BZ',
//     tier: 0,
//     lastVisited: '',
//     lastBotMessageId: 0,
//     pinnedMsgId: 0,
//     buttonClicked: '',
//     custId: 0,
//     vendorId: 0,
//     a_id: 0,
//     v_id: 0,
//     temp: ''
// },
// {
    
//     chatId: 123456,
//     userName: 'Sean_bz',
//     tier: 0,
//     lastVisited: '',
//     lastBotMessageId: 0,
//     pinnedMsgId: 0,
//     buttonClicked: '',
//     custId: 0,
//     vendorId: 0,
//     a_id: 0,
//     v_id: 0,
//     temp: ''
// }
// ]


const qa_agents = [

    {   
        chatId: '123456',
        userName: 'Travis_BZ',
        rated: 0
    },
    {
        chatId: '123456',
        userName: 'Sean_bz',
        rated: 0
    }

]


async function syncAgents() {
    try {
        const agentsFromDb = await Agent.find({}, 'agents');
        if(agentsFromDb.length === 0){ return null}

        agentsFromDb[0]?.agents.forEach(agentFromDb => {
            let agent = agents.find(agent => agent.userName.toLowerCase() === agentFromDb.userName.toLowerCase());

            if(agent) {

                agent.chatId = agentFromDb.chatId;
                agent.tier = agentFromDb.tier;
                agent.agentType = agentFromDb.agentType;
            } 
            
            if(!agent) {

                agents.push({
                    chatId: agentFromDb.chatId,
                    userName: agentFromDb.userName,
                    tier: agentFromDb.tier,
                    agentType: agentFromDb.agentType,
                    available: true,
                    banned: agentFromDb.banned,
                    vendorId: 0,
                    agentMsgId: 0,
                    pseudonym: '',
                    sessions: [],
                    sessionId: '',
                    buttonClicked: '',

                });
            }
        });

    } catch (err) {
        console.error('Error syncing agents:', err);
    }
}

syncAgents();

async function syncVendors() {
    try {
        const vendorsFromDb = await Vendor.find({}, 'vendors');

        if(vendorsFromDb.length === 0){ return null}

        vendorsFromDb[0]?.vendors.forEach(vendorFromDb => {
            let vendor = vendors.find(vendor => vendor.userName.toLowerCase() === vendorFromDb.userName.toLowerCase());
            
            if(vendor) {

                vendor.chatId = vendorFromDb.chatId;
                vendor.userName = vendorFromDb.userName;
                vendor.businessName = vendorFromDb.businessName;
                vendor.banned = vendorFromDb.banned;
                
            } 
            
            if(!vendor) {

                vendors.push({
                    chatId: vendorFromDb.chatId,
                    userName: vendorFromDb.userName,
                    businessName: vendorFromDb.businessName,
                    available: true,
                    banned: vendorFromDb.banned,
                    custId: 0,
                    agentId: 0,
                    pseudonym: '',
                    sessionId: '',
                    nextSession: '',
                    buttonClicked: '' 
                });
            }
        });

    } catch (err) {
        console.error('Error syncing agents:', err);
    }
}

syncVendors();


async function ensureUserExists(chatId) {
    await syncAgents();
    await syncVendors();

    let agent = agents.find(agent => agent.chatId === chatId);

    if (agent) {
        if (!userState[chatId]) {
            userState[chatId] = {
                lastBotMessageId: 0,
                buttonClicked: '',
                set_agent_type: 'support',
                recentRequestTime: 0
            };
        }
        return;
    }

    if (!userState[chatId]) {
        userState[chatId] = {
            userName: '',
            lastBotMessageId: 0,
            tempMsgId: 0,
            buttonClicked: '',
            lastVisited: '',
            userType: '',
            enquiry: '',
            agentId: 0,
            pseudonym: '',
            sessionId: '',
            recentRequestTime: 0
        };
    }

    let user = await User.findOne({ chatId: chatId });

    if (!user) {
        let newSupChat = new User({
            chatId: chatId,
            userName: '',
        });

        await newSupChat.save();
        user = newSupChat;
    }

    return user
}

async function get_users() {
    try {
        const u = await User.find({});
        return u;
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

get_users();

const pseudonym = [
    "Noah", "Theo", "Oliver", "George", "Leo", "Freddie", "Arthur", "Archie", "Alfie", "Charlie", "Oscar", 
    "Henry", "Harry", "Jack", "Teddy", "Finley", "Arlo", "Luca", "Jacob", "Tommy", "Lucas", "Theodore", 
    "Max", "Isaac", "Albie", "James", "Mason", "Rory", "Thomas", "Rueben", "Roman", "Logan", "Harrison", 
    "William", "Elijah", "Ethan", "Joshua", "Hudson", "Jude", "Louie", "Jaxon", "Reggie", "Oakley", 
    "Hunter", "Alexander", "Toby", "Adam", "Sebastian", "Daniel", "Ezra", "Rowan", "Alex", "Dylan", 
    "Ronnie", "Kai", "Hugo", "Louis", "Riley", "Edward", "Finn", "Grayson", "Elliot", "Caleb", 
    "Benjamin", "Bobby", "Frankie", "Zachary", "Brody", "Jackson", "Ollie", "Jasper", "Liam", "Stanley", 
    "Sonny", "Blake", "Albert", "Joseph", "Chester", "Carter", "David", "Milo", "Ellis", "Jenson", 
    "Samuel", "Gabriel", "Eddie", "Rupert", "Eli", "Myles", "Brodie", "Parker", "Ralph", "Miles", 
    "Jayden", "Billy", "Elliott", "Jax", "Ryan", "Joey"
];

const backupChatLogsToDB = async (chatLogs) => {
    const backupPromises = Object.keys(chatLogs).map(sessionId => {
        const logs = chatLogs[sessionId];
        return ChatLog.findOneAndUpdate(
            { sessionId: sessionId },
            { sessionId: sessionId, logs: logs },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    });

    try {
        await Promise.all(backupPromises);
        console.log('All chat logs have been backed up successfully.');
    } catch (error) {
        console.error('Error backing up chat logs:', error);
    }
};

const restoreChatLogsFromDB = async () => {
    try {
        const chatLogsFromDB = await ChatLog.find({});

        chatLogsFromDB.forEach(chatLog => {
            restoredChatLogs[chatLog.sessionId] = chatLog.logs;
        });

        console.log('Chat logs have been restored from the database.');
        return restoredChatLogs;
    } catch (error) {
        console.error('Error restoring chat logs from the database:', error);
        return {};
    }
};


// const initializeServer = async () => {

//     let restoredChatLogs = await restoreChatLogsFromDB();
//     Object.assign(chatLogs, restoredChatLogs); 

//     console.log("Restoerd Data", restoredChatLogs);



//     console.log('Server initialization complete.');
// };

// initializeServer();

setInterval(() => {
    backupChatLogsToDB(chatLogs);
}, 300 * 1000); 


module.exports = { ensureUserExists, syncAgents, syncVendors, pseudonym, get_users, agents, userState, auto_sessions, manual_sessions, admins, set_agent_info, set_vendor_info, set_session_info, vendors, qa_agents, timeouts, chatLogs };
