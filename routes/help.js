// routes/help.js

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    // we can pass user if we want conditional text in navbar
    const user = req.session?.user || null;

    return res.render('help', {
        title: 'Help & FAQ',
        user
    });
});

export default router;