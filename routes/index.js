function setupRoutes(app) {
    app.use("/api/auth", authRoutes);
    app.use("/api", produitRoutes);

    // Users
    app.use('/users', require('./userRoutes'));

    // Categories
    app.use('/categories', require('./categorieRoute'));

    // PROMOTIONS - AVEC LE BON PRÉFIXE
    app.use('/promotions', require('./promotionRoutes'));

    // Boutiques
    app.use('/boutiques', require('./boutiqueRoutes'));

    // Achats
    app.use('/achats', require('./achatRoutes'));

    // Panier
    app.use('/api/panier', require('./panierRoutes'));

    // Admin Dashboard
    app.use('/admin-dashboard', require('./adminDashboardRoutes'));

    // Suivi (Follow)
    app.use('/api/suivis', require('./suiviRoutes'));

    // Avis (Reviews)
    app.use('/api/avis', require('./avisRoutes'));

    // Signalements (Reports)
    app.use('/api/signalements', require('./signalementRoutes'));

    // Messagerie (Messages)
    app.use('/api/messages', require('./messageRoutes'));

    // Route Boutique Dashboard
    app.use('/boutique-dashboard', require('./boutiqueDashboardRoutes'));

    // Route racine (health check)
    app.get('/', (req, res) => {
        res.json({
            success: true,
            message: 'Supermarché Simulation',
            version: '1.0.0',
            endpoints: {
                auth: '/api/auth',
                produits: '/api',
                users: '/users',
                categories: '/categories',
                promotions: '/promotions',
                boutiques: '/boutiques',
                achats: '/achats',
                panier: '/api/panier',
                adminDashboard: '/admin-dashboard',
                suivis: '/api/suivis',
                avis: '/api/avis',
                signalements: '/api/signalements',
                messages: '/api/messages',
                boutiqueDashboard: '/boutique-dashboard',
            }
        });
    });
}