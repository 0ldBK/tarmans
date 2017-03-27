module.exports = {
    auth: [
        require('./login')
    ],
    other: [
        require('./ping'),
        require('./users'),
        require('./clans'),
        require('./statistics'),
        require('./currency'),
        require('./resources'),
        require('./anticaptcha'),
        require('./opponents'),
        require('./settings')
    ]
};
