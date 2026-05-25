// routes/index.js
// Central route configuration using constructor pattern
// All route modules are mounted here for centralized management

import arrestsRoutes from './arrests.js';
import usersRoutes from './users.js';
import commentsRoutes from './comments.js';
import trendsRoutes from './trends.js';

import helpRoutes from './help.js';
import statsRoutes from './stats.js';
import * as arrestsData from '../data/arrests.js';

const constructorMethod = (app) => {
  // Home route
  app.get('/', (req, res) => {
    res.render('home', {
      title: 'NYC Arrest Data Visualization'
    });
  });

  // Demographic Insights route

  app.get('/demographics', async (req, res) => {
    try {
      const demographicData = await arrestsData.getDemographicData();
      res.render('demographicInsights', {
        title: 'Demographic Insights',
        user: req.session.user || null,
        demographicData
      });
    } catch (e) {
      res.status(500).render('error', { 
        statusCode: '500',
        title: 'Server Error',
        message: 'Failed to load demographic data',
        user: req.session.user || null
      });
    }
  });

  // Mount feature routes
  app.use('/arrests', arrestsRoutes);
  app.use('/users', usersRoutes);
  app.use('/comments', commentsRoutes);
  app.use('/trends', trendsRoutes);

  app.use('/help', helpRoutes);
  app.use('/stats', statsRoutes);

  // 404 handler - must be last
  app.use('*', (req, res) => {
    res.status(404).render('error', {
      statusCode: '404',
      title: '404 Not Found',
      message: 'The page you are looking for does not exist.',
      user: req.session.user || null
    });
  });
};

export default constructorMethod;