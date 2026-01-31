const User = require('../../models/User');

const initUserAdmin = () => {
    const user = User.findOne({ role: 'admin' });
    if (!user) {
        User.create({
            firstname: 'admin',
            lastname: 'admin',
            email: 'admin@admin.com',
            password: 'admin',
            role: 'admin'
        });
        console.log('User admin created');
    }
    console.log('User admin already exists');
}

module.exports = initUserAdmin;