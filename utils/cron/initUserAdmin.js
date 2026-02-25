const User = require('../../models/User');

const initUserAdmin = async () => {
    try {
        const user = await User.findOne({ role: 'Admin' });

        if (!user) {
            await User.create({
                firstname: 'admin',
                lastname: 'admin',
                email: 'admin@admin.com',
                password: 'admin123',
                role: 'Admin'
            });
            console.log(' User admin created');
        } else {
            console.log('User admin already exists');
        }
    } catch (error) {
        console.error('Error in initUserAdmin:', error.message);
    }
};

module.exports = initUserAdmin;