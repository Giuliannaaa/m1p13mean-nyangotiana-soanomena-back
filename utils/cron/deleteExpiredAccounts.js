const cron = require('node-cron');
const User = require('../../models/User');

const deleteExpiredAccounts = () => {
  // Exécuter tous les jours à minuit
  cron.schedule('0 0 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await User.deleteMany({
        deleteRequestedAt: { $ne: null, $lte: thirtyDaysAgo }
      });

      if (result.deletedCount > 0) {
        console.log(`${result.deletedCount} compte(s) supprimé(s) définitivement.`);
      }
    } catch (error) {
      console.error('Erreur suppression comptes expirés:', error);
    }
  });
};

module.exports = deleteExpiredAccounts;